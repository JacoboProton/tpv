import { NextRequest, NextResponse } from 'next/server';
import { apiOk, apiError } from '../../../../lib/infrastructure/response';
import Stripe from 'stripe';
import { and, eq, ne, isNotNull } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { sales } from '../../../../db/schema';
import { requireRole } from '../../../../lib/rbac';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
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

    const allPIs: Stripe.PaymentIntent[] = [];
    let lastId: string | null = null;
    for (let i = 0; i < 5; i++) {
      const params: Stripe.PaymentIntentListParams = { limit: 100, created: { gte: since } };
      if (lastId) params.starting_after = lastId;
      const batch = await stripe.paymentIntents.list(params);
      allPIs.push(...batch.data);
      if (!batch.has_more) break;
      lastId = batch.data[batch.data.length - 1].id;
    }

    const filteredPIs = source
      ? allPIs.filter((pi) => pi.metadata?.source === source)
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

    const saleMap = new Map<string, typeof saleRows[number]>();
    for (const s of saleRows) {
      saleMap.set(s.paymentIntentId ?? '', s);
    }

    const orphans: Array<{
      paymentIntentId: string;
      amount: string;
      currency: string;
      status: Stripe.PaymentIntent.Status;
      created: string;
      metadata: Stripe.Metadata;
    }> = [];
    const mismatches: Array<{
      paymentIntentId: string;
      saleId: string;
      stripeAmount: string;
      saleTotal: string;
      difference: string;
    }> = [];
    const refundMismatches: Array<{
      paymentIntentId: string;
      saleId: string;
      unrecordedRefunds: Array<{ id: string; amount: string; created: string }>;
    }> = [];
    const disputed: Array<{
      paymentIntentId: string;
      saleId: string;
      status: string;
      data: unknown;
    }> = [];

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

      const stripeRefunds = ((pi as unknown as { refunds?: { data: Stripe.Refund[] } }).refunds?.data) ?? [];
      const saleRec = sale as unknown as { refunds?: { stripeRefundId: string }[] };
      const saleRefunds = saleRec.refunds || [];
      const saleStripeRefundIds = new Set(
        saleRefunds.map((r) => r.stripeRefundId).filter(Boolean)
      );
      const unrecordedRefunds = stripeRefunds.filter(
        (r) => r.status === 'succeeded' && !saleStripeRefundIds.has(r.id)
      );
      if (unrecordedRefunds.length > 0) {
        refundMismatches.push({
          paymentIntentId: pi.id,
          saleId: sale.id,
          unrecordedRefunds: unrecordedRefunds.map((r) => ({
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

    const piIdsInStripe = new Set(filteredPIs.map((pi) => pi.id));
    type SaleRow = typeof saleRows[number];
    const salesNotInStripe = saleRows
      .filter((s: SaleRow) => !piIdsInStripe.has(s.paymentIntentId ?? ''))
      .map((s: SaleRow) => ({
        saleId: s.id,
        paymentIntentId: s.paymentIntentId,
        total: Number(s.totalWithTip || s.total || 0),
      }));

    return apiOk({
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
  } catch (err) {
    console.error('[Reconciliation] Error:', err instanceof Error ? err.message : String(err));
    return apiError(err);
  }
}
