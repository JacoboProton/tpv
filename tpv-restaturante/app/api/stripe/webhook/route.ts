import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '../../../../lib/db';
import { logPayment } from '../../../../lib/payment-logger';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function ensureEventTracked(eventId: string, eventType: string) {
  const result = await sql`
    INSERT INTO webhook_events (event_id, type, status, created_at)
    VALUES (${eventId}, ${eventType}, 'processing', ${Date.now()})
    ON CONFLICT (event_id) DO UPDATE
    SET status = CASE
      WHEN webhook_events.status = 'failed' THEN 'processing'
      ELSE webhook_events.status
    END
    RETURNING status
  `;
  return result[0]?.status;
}

async function markProcessed(eventId: string) {
  await sql`
    UPDATE webhook_events SET status = 'processed', processed_at = ${Date.now()}, error = NULL
    WHERE event_id = ${eventId}
  `;
}

async function markFailed(eventId: string, eventData: any, errorMessage: string) {
  await sql`
    UPDATE webhook_events SET status = 'failed', body = ${JSON.stringify(eventData)}, error = ${errorMessage}
    WHERE event_id = ${eventId}
  `;
}

async function handlePaymentIntentSucceeded(pi: any) {
  const { tableId, qrOrderId, source, tenantId } = pi.metadata || {};
  const tid = tenantId || 'default';

  console.log(`[Stripe Webhook] payment_intent.succeeded: ${pi.id} (${(pi.amount / 100).toFixed(2)}€) mesa=${tableId} source=${source}`);

  if (qrOrderId) {
    await sql`
      UPDATE qr_orders
      SET order_status = 'paid', payment_intent_id = ${pi.id}, updated_at = ${Date.now()}
      WHERE id = ${qrOrderId} AND order_status = 'pending' AND tenant_id = ${tid}
    `;
  } else if (tableId) {
    const existing = await sql`
      SELECT id FROM sales WHERE payment_intent_id = ${pi.id} AND tenant_id = ${tid} LIMIT 1
    `;
    if (existing.length === 0) {
      await sql`
        INSERT INTO sales (id, table_id, table_name, items, subtotal, discount, discount_amount, total, tip, tip_method, total_with_tip, payment_intent_id, employee_name, closed_at, payment_method, invoice_nif, invoice_name, invoice_address, invoice_number, tenant_id)
        VALUES (
          'stub_' || ${pi.id},
          ${tableId},
          ${pi.metadata?.tableName || ''},
          '[]'::jsonb,
          ${(pi.amount / 100).toFixed(2)},
          0, 0, ${(pi.amount / 100).toFixed(2)},
          0, '', ${(pi.amount / 100).toFixed(2)},
          ${pi.id},
          ${pi.metadata?.employeeName || ''},
          ${Date.now()},
          'tarjeta',
          '', '', '', '', ${tid}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    } else {
      await sql`
        UPDATE sales SET stripe_confirmed = true WHERE payment_intent_id = ${pi.id} AND tenant_id = ${tid}
      `;
    }
  }
}

async function handlePaymentIntentFailed(failed: any) {
  console.error(`[Stripe Webhook] payment_intent.payment_failed: ${failed.id} — ${failed.last_payment_error?.message}`);
}

async function handleChargeDisputeCreated(dispute: any) {
  const piId = dispute.payment_intent?.id || dispute.charge?.payment_intent;
  const amount = dispute.amount;
  const metadata = dispute.metadata || {};
  const tid = metadata.tenantId || 'default';
  console.error(`[Stripe Webhook] ⚠️ CHARGEBACK CREADO: dispute=${dispute.id} pi=${piId} amount=${(amount / 100).toFixed(2)}€ reason=${dispute.reason}`);

  if (piId) {
    await sql`
      UPDATE sales SET
        dispute_status = 'disputed',
        dispute_data = ${JSON.stringify({
          id: dispute.id,
          reason: dispute.reason,
          status: dispute.status,
          amount,
          currency: dispute.currency,
          evidence_due_by: dispute.evidence_details?.due_by,
          created: Date.now(),
        })}
      WHERE payment_intent_id = ${piId} AND tenant_id = ${tid}
    `;
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
  const piId = dispute.payment_intent?.id || dispute.charge?.payment_intent;
  const closedStatus = dispute.status;
  const metadata = dispute.metadata || {};
  const tid = metadata.tenantId || 'default';
  console.error(`[Stripe Webhook] ⚠️ CHARGEBACK ${closedStatus === 'won' ? 'GANADO' : 'PERDIDO'}: dispute=${dispute.id} pi=${piId} status=${closedStatus}`);

  if (piId) {
    await sql`
      UPDATE sales SET
        dispute_status = CASE WHEN ${closedStatus} = 'won' THEN 'dispute_won' ELSE 'dispute_lost' END,
        dispute_data = ${JSON.stringify({
          id: dispute.id,
          reason: dispute.reason,
          status: closedStatus,
          amount: dispute.amount,
          currency: dispute.currency,
          closed: Date.now(),
        })}
      WHERE payment_intent_id = ${piId} AND tenant_id = ${tid}
    `;
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

    // Idempotency: track event in DB; skip if already processed
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
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
