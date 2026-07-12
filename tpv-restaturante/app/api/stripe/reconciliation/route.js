import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// GET /api/stripe/reconciliation?days=90
export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get('days') || '90', 10), 365);
    const since = Math.floor((Date.now() - days * 86400000) / 1000);
    const source = searchParams.get('source') || ''; // optional filter: la-comanda-tpv, la-comanda-tpv-nfc

    // 1. Fetch PaymentIntents from Stripe
    const allPIs = [];
    let lastId = null;
    for (let i = 0; i < 5; i++) {
      const params = { limit: 100, created: { gte: since } };
      if (lastId) params.starting_after = lastId;
      const batch = await stripe.paymentIntents.list(params);
      allPIs.push(...batch.data);
      if (!batch.has_more) break;
      lastId = batch.data[batch.data.length - 1].id;
    }

    // Filter by source metadata if specified
    const filteredPIs = source
      ? allPIs.filter(pi => pi.metadata?.source === source)
      : allPIs;

    // 2. Fetch sales with payment_intent_id from DB
    const sales = await sql`
      SELECT id, payment_intent_id, total, total_with_tip, tip, refunds,
             dispute_status, dispute_data
      FROM sales
      WHERE payment_intent_id != '' AND payment_intent_id IS NOT NULL
        AND tenant_id = ${tenantId}
    `;

    const saleMap = new Map();
    for (const s of sales) {
      saleMap.set(s.payment_intent_id, s);
    }

    // 3. Compare
    const orphans = [];
    const mismatches = [];
    const refundMismatches = [];
    const disputed = [];

    for (const pi of filteredPIs) {
      const sale = saleMap.get(pi.id);

      if (!sale) {
        // Stripe has this PI but no sale in DB
        if (pi.metadata?.source) {
          orphans.push({
            paymentIntentId: pi.id,
            amount: (pi.amount / 100).toFixed(2),
            currency: pi.currency,
            status: pi.status,
            created: new Date(pi.created * 1000).toISOString(),
            metadata: pi.metadata,
          });
        }
        continue;
      }

      // Amount comparison (stripe amount is in cents, sale total is in euros)
      const saleTotalCents = Math.round((Number(sale.total_with_tip || sale.total || 0)) * 100);
      const piAmountCents = pi.amount;

      if (Math.abs(saleTotalCents - piAmountCents) > 1) {
        mismatches.push({
          paymentIntentId: pi.id,
          saleId: sale.id,
          stripeAmount: (piAmountCents / 100).toFixed(2),
          saleTotal: (saleTotalCents / 100).toFixed(2),
          difference: ((piAmountCents - saleTotalCents) / 100).toFixed(2),
        });
      }

      // Refund comparison
      const stripeRefunds = pi.refunds?.data || pi.refunds || [];
      const saleRefunds = sale.refunds || [];
      const saleStripeRefundIds = new Set(
        saleRefunds.map(r => r.stripeRefundId).filter(Boolean)
      );
      const unrecordedRefunds = stripeRefunds.filter(
        r => r.status === 'succeeded' && !saleStripeRefundIds.has(r.id)
      );
      if (unrecordedRefunds.length > 0) {
        refundMismatches.push({
          paymentIntentId: pi.id,
          saleId: sale.id,
          unrecordedRefunds: unrecordedRefunds.map(r => ({
            id: r.id,
            amount: (r.amount / 100).toFixed(2),
            created: new Date(r.created * 1000).toISOString(),
          })),
        });
      }

      // Dispute check
      if (sale.dispute_status && sale.dispute_status !== '' && sale.dispute_status !== 'dispute_won') {
        disputed.push({
          paymentIntentId: pi.id,
          saleId: sale.id,
          status: sale.dispute_status,
          data: sale.dispute_data,
        });
      }
    }

    // Sales with payment_intent_id not found in Stripe
    const piIdsInStripe = new Set(filteredPIs.map(pi => pi.id));
    const salesNotInStripe = sales
      .filter(s => !piIdsInStripe.has(s.payment_intent_id))
      .map(s => ({
        saleId: s.id,
        paymentIntentId: s.payment_intent_id,
        total: Number(s.total_with_tip || s.total || 0),
      }));

    return NextResponse.json({
      summary: {
        totalPIsInStripe: filteredPIs.length,
        totalSalesWithPI: sales.length,
        orphans: orphans.length,
        mismatches: mismatches.length,
        refundMismatches: refundMismatches.length,
        disputed: disputed.length,
        salesNotInStripe: salesNotInStripe.length,
        periodDays: days,
      },
      orphans,
      mismatches,
      refundMismatches,
      disputed,
      salesNotInStripe,
      generatedAt: Date.now(),
    });
  } catch (err) {
    console.error('[Reconciliation] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
