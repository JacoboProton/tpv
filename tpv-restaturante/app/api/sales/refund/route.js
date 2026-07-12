import Stripe from 'stripe';
import { sql } from '../../../../lib/db';
import { logPayment } from '../../../../lib/payment-logger';
import { getTenantId } from '../../../../lib/tenant';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function PUT(req) {
  try {
    const tenantId = getTenantId(req);
    const { saleId, refund } = await req.json();
    if (!saleId || !refund) {
      return Response.json({ error: 'saleId and refund required' }, { status: 400 });
    }

    const sale = await sql`
      SELECT payment_intent_id, refunds FROM sales WHERE id = ${saleId} AND tenant_id = ${tenantId} LIMIT 1
    `;
    if (sale.length === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    const piId = sale[0]?.payment_intent_id;
    const currentRefunds = sale[0]?.refunds || [];
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

    const updated = [...currentRefunds, { ...refund, stripeRefundId }];
    await sql`UPDATE sales SET refunds = ${JSON.stringify(updated)} WHERE id = ${saleId} AND tenant_id = ${tenantId}`;

    return Response.json({ ok: true, refunds: updated, stripeRefundId });
  } catch (e) {
    console.error('[Refund] Error:', e.message);
    logPayment({
      paymentIntentId: null,
      operation: 'refund.create',
      amountCents: 0,
      status: 'error',
      error: e.message,
      source: 'refund',
    });
    return Response.json({ error: e.message }, { status: 500 });
  }
}
