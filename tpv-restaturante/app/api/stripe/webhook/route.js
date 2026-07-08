import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '../../../../lib/db';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function ensureEventTracked(eventId, eventType) {
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

async function markProcessed(eventId) {
  await sql`
    UPDATE webhook_events SET status = 'processed', processed_at = ${Date.now()}, error = NULL
    WHERE event_id = ${eventId}
  `;
}

async function markFailed(eventId, eventData, errorMessage) {
  await sql`
    UPDATE webhook_events SET status = 'failed', body = ${JSON.stringify(eventData)}, error = ${errorMessage}
    WHERE event_id = ${eventId}
  `;
}

async function handlePaymentIntentSucceeded(pi) {
  const { tableId, qrOrderId, source } = pi.metadata || {};

  console.log(`[Stripe Webhook] payment_intent.succeeded: ${pi.id} (${(pi.amount / 100).toFixed(2)}€) mesa=${tableId} source=${source}`);

  if (qrOrderId) {
    await sql`
      UPDATE qr_orders
      SET order_status = 'paid', payment_intent_id = ${pi.id}, updated_at = ${Date.now()}
      WHERE id = ${qrOrderId} AND order_status = 'pending'
    `;
  } else if (tableId) {
    const existing = await sql`
      SELECT id FROM sales WHERE payment_intent_id = ${pi.id} LIMIT 1
    `;
    if (existing.length === 0) {
      await sql`
        INSERT INTO sales (id, table_id, table_name, items, subtotal, discount, discount_amount, total, tip, tip_method, total_with_tip, payment_intent_id, employee_name, closed_at, payment_method, invoice_nif, invoice_name, invoice_address, invoice_number)
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
          '', '', '', ''
        )
        ON CONFLICT (id) DO NOTHING
      `;
    } else {
      await sql`
        UPDATE sales SET stripe_confirmed = true WHERE payment_intent_id = ${pi.id}
      `;
    }
  }
}

async function handlePaymentIntentFailed(failed) {
  console.error(`[Stripe Webhook] payment_intent.payment_failed: ${failed.id} — ${failed.last_payment_error?.message}`);
}

export async function POST(req) {
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
    } catch (err) {
      console.error('Firma Stripe inválida:', err.message);
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
        default:
          console.log(`[Stripe Webhook] Evento ignorado: ${event.type}`);
      }

      await markProcessed(event.id);
      return NextResponse.json({ received: true });
    } catch (err) {
      await markFailed(event.id, event.data.object, err.message);
      throw err;
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
