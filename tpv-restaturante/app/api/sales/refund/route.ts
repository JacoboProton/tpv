import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { getDb } from '../../../../lib/drizzle';
import { logPayment } from '../../../../lib/payment-logger';
import { getTenantId } from '../../../../lib/tenant';
import { sales } from '../../../../db/schema';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { saleId, refund } = await req.json();
    if (!saleId || !refund) {
      return Response.json({ error: 'saleId and refund required' }, { status: 400 });
    }

    const [sale] = await db.select({
      paymentIntentId: sales.paymentIntentId,
      refunds: sales.refunds,
    }).from(sales).where(eq(sales.id, saleId)).limit(1);
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    const piId = sale.paymentIntentId;
    const currentRefunds = sale.refunds || [];
    let stripeRefundId = null;

    if (piId && piId.startsWith('pi_')) {
      const stripe = getStripe();
      if (stripe) {
        const amountCents = Math.round(refund.amount * 100);
        const sr = await stripe.refunds.create({
          payment_intent: piId,
          amount: amountCents,
          reason: refund.reason?.includes('duplicado') ? 'duplicate' : 'requested_by_customer',
        });
        stripeRefundId = sr.id;
        logPayment({
          paymentIntentId: piId,
          operation: 'refund.create',
          amountCents,
          tableId: refund.tableId,
          employeeName: refund.employeeName,
          source: 'refund',
          stripeResponse: { id: sr.id, status: sr.status },
        });
      }
    }

    const updated = [...(currentRefunds as any[]), { ...refund, stripeRefundId }];
    await db.update(sales).set({ refunds: updated }).where(eq(sales.id, saleId));

    return Response.json({ ok: true, refunds: updated, stripeRefundId });
  } catch (e) {
    console.error('[Refund] Error:', (e as Error).message);
    logPayment({
      paymentIntentId: null,
      operation: 'refund.create',
      amountCents: 0,
      status: 'error',
      error: (e as Error).message,
      source: 'refund',
    });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
