import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { logPayment } from '../../../../lib/payment-logger';
import { sales, webhookEvents, qrOrders } from '../../../../db/schema';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function ensureEventTracked(eventId: string, eventType: string) {
  const db = getDb();
  const result = await db.insert(webhookEvents).values({
    eventId,
    type: eventType,
    status: 'processing',
    createdAt: Date.now(),
  }).onConflictDoUpdate({
    target: webhookEvents.eventId,
    set: {
      status: sql`CASE WHEN ${webhookEvents.status} = 'failed' THEN 'processing' ELSE ${webhookEvents.status} END`,
    },
  }).returning({ status: webhookEvents.status });
  return result[0]?.status;
}

async function markProcessed(eventId: string) {
  const db = getDb();
  await db.update(webhookEvents)
    .set({ status: 'processed', processedAt: Date.now(), error: null })
    .where(eq(webhookEvents.eventId, eventId));
}

async function markFailed(eventId: string, eventData: any, errorMessage: string) {
  const db = getDb();
  await db.update(webhookEvents)
    .set({ status: 'failed', body: eventData, error: errorMessage })
    .where(eq(webhookEvents.eventId, eventId));
}

async function handlePaymentIntentSucceeded(pi: any) {
  const db = getDb();
  const { tableId, qrOrderId, source, tenantId } = pi.metadata || {};
  const tid = tenantId || 'default';

  console.log(`[Stripe Webhook] payment_intent.succeeded: ${pi.id} (${(pi.amount / 100).toFixed(2)}€) mesa=${tableId} source=${source}`);

  if (qrOrderId) {
    await db.update(qrOrders)
      .set({ orderStatus: 'paid', paymentIntentId: pi.id, updatedAt: Date.now() })
      .where(and(eq(qrOrders.id, qrOrderId), eq(qrOrders.orderStatus, 'pending'), eq(qrOrders.tenantId, tid)));
  } else if (tableId) {
    const existing = await db.select({ id: sales.id }).from(sales)
      .where(and(eq(sales.paymentIntentId, pi.id), eq(sales.tenantId, tid)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(sales).values({
        id: 'stub_' + pi.id,
        tableId,
        tableName: pi.metadata?.tableName || '',
        items: [],
        subtotal: (pi.amount / 100).toFixed(2),
        discount: '0',
        discountAmount: '0',
        total: (pi.amount / 100).toFixed(2),
        tip: '0',
        tipMethod: '',
        totalWithTip: (pi.amount / 100).toFixed(2),
        paymentIntentId: pi.id,
        employeeName: pi.metadata?.employeeName || '',
        closedAt: Date.now(),
        paymentMethod: 'tarjeta',
        invoiceNif: '',
        invoiceName: '',
        invoiceAddress: '',
        invoiceNumber: '',
        tenantId: tid,
      }).onConflictDoNothing();
    } else {
      await db.update(sales)
        .set({ stripeConfirmed: true })
        .where(and(eq(sales.paymentIntentId, pi.id), eq(sales.tenantId, tid)));
    }
  }
}

async function handlePaymentIntentFailed(failed: any) {
  console.error(`[Stripe Webhook] payment_intent.payment_failed: ${failed.id} — ${failed.last_payment_error?.message}`);
}

async function handleChargeDisputeCreated(dispute: any) {
  const db = getDb();
  const piId = dispute.payment_intent?.id || dispute.charge?.payment_intent;
  const amount = dispute.amount;
  const metadata = dispute.metadata || {};
  const tid = metadata.tenantId || 'default';
  console.error(`[Stripe Webhook] ⚠️ CHARGEBACK CREADO: dispute=${dispute.id} pi=${piId} amount=${(amount / 100).toFixed(2)}€ reason=${dispute.reason}`);

  if (piId) {
    await db.update(sales)
      .set({
        disputeStatus: 'disputed',
        disputeData: {
          id: dispute.id,
          reason: dispute.reason,
          status: dispute.status,
          amount,
          currency: dispute.currency,
          evidence_due_by: dispute.evidence_details?.due_by,
          created: Date.now(),
        },
      })
      .where(and(eq(sales.paymentIntentId, piId), eq(sales.tenantId, tid)));
  }

  logPayment({
    eventId: dispute.id,
    paymentIntentId: piId,
    operation: 'chargeback.dispute_created',
    amountCents: amount,
    status: 'warning',
    error: `Chargeback: ${dispute.reason}`,
    source: 'webhook',
    stripeResponse: { id: dispute.id, reason: dispute.reason, status: dispute.status },
  });
}

async function handleChargeDisputeClosed(dispute: any) {
  const db = getDb();
  const piId = dispute.payment_intent?.id || dispute.charge?.payment_intent;
  const closedStatus = dispute.status;
  const metadata = dispute.metadata || {};
  const tid = metadata.tenantId || 'default';
  console.error(`[Stripe Webhook] ⚠️ CHARGEBACK ${closedStatus === 'won' ? 'GANADO' : 'PERDIDO'}: dispute=${dispute.id} pi=${piId} status=${closedStatus}`);

  if (piId) {
    await db.update(sales)
      .set({
        disputeStatus: closedStatus === 'won' ? 'dispute_won' : 'dispute_lost',
        disputeData: {
          id: dispute.id,
          reason: dispute.reason,
          status: closedStatus,
          amount: dispute.amount,
          currency: dispute.currency,
          closed: Date.now(),
        },
      })
      .where(and(eq(sales.paymentIntentId, piId), eq(sales.tenantId, tid)));
  }

  logPayment({
    eventId: dispute.id,
    paymentIntentId: piId,
    operation: `chargeback.dispute_${closedStatus}`,
    amountCents: dispute.amount,
    status: closedStatus === 'won' ? 'ok' : 'error',
    error: closedStatus !== 'won' ? `Chargeback perdido: ${dispute.reason}` : undefined,
    source: 'webhook',
    stripeResponse: { id: dispute.id, reason: dispute.reason, status: closedStatus },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET no configurado');
      return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 });
    }

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'Firma Stripe ausente' }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Firma Stripe inválida:', (err as Error).message);
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
    }

    const status = await ensureEventTracked(event.id, event.type);
    if (status === 'processed' || status === 'processing') {
      return NextResponse.json({ received: true, skipped: true });
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object);
          break;
        case 'charge.dispute.created':
          await handleChargeDisputeCreated(event.data.object);
          break;
        case 'charge.dispute.updated':
          await handleChargeDisputeCreated(event.data.object);
          break;
        case 'charge.dispute.closed':
          await handleChargeDisputeClosed(event.data.object);
          break;
        default:
          console.log(`[Stripe Webhook] Evento ignorado: ${event.type}`);
      }

      await markProcessed(event.id);

      const pi = event.data.object as Stripe.PaymentIntent;
      logPayment({
        eventId: event.id,
        paymentIntentId: pi?.id,
        operation: `webhook.${event.type}`,
        amountCents: pi?.amount ?? 0,
        tableId: pi?.metadata?.tableId,
        tableName: pi?.metadata?.tableName,
        source: pi?.metadata?.source || 'webhook',
        status: 'ok',
      });

      return NextResponse.json({ received: true });
    } catch (err: any) {
      const piErr = event.data.object as Stripe.PaymentIntent;
      await markFailed(event.id, piErr, (err as Error).message);
      logPayment({
        eventId: event.id,
        paymentIntentId: piErr?.id,
        operation: `webhook.${event.type}`,
        amountCents: piErr?.amount ?? 0,
        status: 'error',
        error: (err as Error).message,
        source: 'webhook',
      });
      throw err;
    }
  } catch (err: any) {
    console.error('[Stripe Webhook] Error:', (err as Error).message);
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
