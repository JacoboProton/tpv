import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { getDb } from '../../../../lib/drizzle';
import { logPayment } from '../../../../lib/payment-logger';
import { getTenantId } from '../../../../lib/tenant';
import { sales } from '../../../../db/schema';
import { requireRole } from '../../../../lib/rbac';
import { RefundBody } from '../../../../lib/schemas/api-schemas';
import { rateLimit } from '../../../../lib/rate-limit';
import { withIdempotency } from '../../../../lib/idempotency';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toRecords(v: unknown): Array<Record<string, unknown>> {
  const list: unknown[] = Array.isArray(v) ? v : [];
  return list.flatMap((i) => isRecord(i) ? [i] : []);
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return Response.json({ error: auth.error }, { status: auth.status });
  const tenantId = getTenantId(req);
  const employeeId = auth.employee?.id || 'unknown';

  const rl = await rateLimit(`refund:${tenantId}:${employeeId}`, 15, 60_000);
  if (!rl.allowed) return Response.json({ error: 'Demasiadas devoluciones, intenta de nuevo en unos segundos' }, { status: 429 });

  return withIdempotency(req, '/api/sales/refund', async () => {
    try {
      const db = getDb();
      const parsed = RefundBody.safeParse(await req.json());
      if (!parsed.success) {
        return Response.json({ error: parsed.error.message }, { status: 400 });
      }
      const { saleId, refund } = parsed.data;
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
      const currentRefunds = toRecords(sale.refunds);
      let stripeRefundId: string | null = null;

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
            tenantId,
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
      await db.update(sales).set({ refunds: updated }).where(eq(sales.id, saleId));

      return Response.json({ ok: true, refunds: updated, stripeRefundId });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[Refund] Error:', errMsg);
      logPayment({
        tenantId,
        paymentIntentId: null,
        operation: 'refund.create',
        amountCents: 0,
        status: 'error',
        error: errMsg,
        source: 'refund',
      });
      return Response.json({ error: errMsg }, { status: 500 });
    }
  });
}
