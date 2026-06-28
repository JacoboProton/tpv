import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '../../../../lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Firma Stripe inválida:', err.message);
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
    }

    // Procesar evento
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const { tableId, qrOrderId, source } = pi.metadata || {};

        console.log(`[Stripe Webhook] payment_intent.succeeded: ${pi.id} (${(pi.amount / 100).toFixed(2)}€) mesa=${tableId} source=${source}`);

        // Si viene de un pedido QR, actualizar su estado
        if (qrOrderId) {
          await sql`
            UPDATE qr_orders
            SET order_status = 'paid', payment_intent_id = ${pi.id}, updated_at = ${Date.now()}
            WHERE id = ${qrOrderId} AND order_status = 'pending'
          `;
        } else if (tableId) {
          // Fallback: buscar qr_orders pendientes por mesa
          await sql`
            UPDATE qr_orders
            SET order_status = 'paid', payment_intent_id = ${pi.id}, updated_at = ${Date.now()}
            WHERE table_id = ${tableId} AND order_status = 'pending'
          `;
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const failed = event.data.object;
        console.error(`[Stripe Webhook] payment_intent.payment_failed: ${failed.id} — ${failed.last_payment_error?.message}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Evento ignorado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
