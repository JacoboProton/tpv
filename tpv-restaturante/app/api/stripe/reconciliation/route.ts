import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { and, eq, ne, isNotNull } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { sales } from '../../../../db/schema';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get('days') || '90', 10), 365);
    const since = Math.floor((Date.now() - days * 86400000) / 1000);
    const source = searchParams.get('source') || '';

    const allPIs = [];
    let lastId = null;
    for (let i = 0; i < 5; i++) {
      const params = { limit: 100, created: { gte: since } };
      if (lastId) (params as any).starting_after = lastId;
      const batch = await stripe.paymentIntents.list(params);
      allPIs.push(...batch.data);
      if (!batch.has_more) break;
      lastId = batch.data[batch.data.length - 1].id;
    }

    const filteredPIs = source
      ? allPIs.filter((pi: any) => pi.metadata?.source === source)
      : allPIs;

    const saleRows = await db.select({
      id: sales.id,
      paymentIntentId: sales.paymentIntentId,
      total: sales.total,
      totalWithTip: sales.totalWithTip,
      tip: sales.tip,
      refunds: sales.refunds,
      disputeStatus: sales.disputeStatus,
      disputeData: sales.disputeData,
    }).from(sales)
      .where(and(
        ne(sales.paymentIntentId, ''),
        isNotNull(sales.paymentIntentId),
        eq(sales.tenantId, tenantId)
      ));

    const saleMap = new Map();
    for (const s of saleRows) {
      saleMap.set(s.paymentIntentId, s);
    }

    const orphans = [];
    const mismatches = [];
    const refundMismatches = [];
    const disputed = [];

    for (const pi of filteredPIs) {
      const sale = saleMap.get(pi.id);

      if (!sale) {
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

      const saleTotalCents = Math.round((Number(sale.totalWithTip || sale.total || 0)) * 100);
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

      const piAny = pi as any;
      const saleAny = sale as any;
      const stripeRefunds = piAny.refunds?.data || piAny.refunds || [];
      const saleRefunds = saleAny.refunds || [];
      const saleStripeRefundIds = new Set(
        saleRefunds.map((r: any) => r.stripeRefundId).filter(Boolean)
      );
      const unrecordedRefunds = stripeRefunds.filter(
        (r: any) => r.status === 'succeeded' && !saleStripeRefundIds.has(r.id)
      );
      if (unrecordedRefunds.length > 0) {
        refundMismatches.push({
          paymentIntentId: pi.id,
          saleId: sale.id,
          unrecordedRefunds: unrecordedRefunds.map((r: any) => ({
            id: r.id,
            amount: (r.amount / 100).toFixed(2),
            created: new Date(r.created * 1000).toISOString(),
          })),
        });
      }

      if (sale.disputeStatus && sale.disputeStatus !== '' && sale.disputeStatus !== 'dispute_won') {
        disputed.push({
          paymentIntentId: pi.id,
          saleId: sale.id,
          status: sale.disputeStatus,
          data: sale.disputeData,
        });
      }
    }

    const piIdsInStripe = new Set(filteredPIs.map((pi: any) => pi.id));
    const salesNotInStripe = saleRows
      .filter((s: any) => !piIdsInStripe.has(s.paymentIntentId))
      .map((s: any) => ({
        saleId: s.id,
        paymentIntentId: s.paymentIntentId,
        total: Number(s.totalWithTip || s.total || 0),
      }));

    return NextResponse.json({
      summary: {
        totalPIsInStripe: filteredPIs.length,
        totalSalesWithPI: saleRows.length,
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
  } catch (err: any) {
    console.error('[Reconciliation] Error:', (err as Error).message);
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
