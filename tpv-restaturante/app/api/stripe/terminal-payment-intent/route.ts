import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { rateLimit } from '../../../../lib/rate-limit';
import { logPayment } from '../../../../lib/payment-logger';
import { getTenantId } from '../../../../lib/tenant';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;
const MAX_PAYMENT_AMOUNT = 9999.99;

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`tpi:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Inténtalo de nuevo en ${Math.ceil((rl.reset - Date.now()) / 1000)}s.` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
    }

    const tenantId = getTenantId(req);
    const { amount, tableId, tableName, employeeName, idempotencyKey } = await req.json() as any;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Importe inválido' }, { status: 400 });
    }

    if (amount > MAX_PAYMENT_AMOUNT * 100) {
      return NextResponse.json({ error: `El importe máximo permitido es ${MAX_PAYMENT_AMOUNT}€` }, { status: 400 });
    }

    const key = idempotencyKey || `tpi_${tableId}_${amount}_${Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS)}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      payment_method_types: ['card_present'],
      metadata: {
        tableId:      tableId      ?? '',
        tableName:    tableName    ?? '',
        employeeName: employeeName ?? '',
        tenantId,
        source:       'la-comanda-tpv-nfc',
        env:          process.env.VERCEL_ENV || 'development',
        max_amount:   String(MAX_PAYMENT_AMOUNT),
      },
      description: `${tableName ?? 'Mesa'} — La Comanda (NFC)`,
    }, { idempotencyKey: key });

    logPayment({
      paymentIntentId: paymentIntent.id,
      operation: 'terminal_payment_intent.create',
      amountCents: amount,
      tableId, tableName, employeeName,
      source: 'la-comanda-tpv-nfc',
      stripeResponse: { id: paymentIntent.id, status: paymentIntent.status },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Terminal PaymentIntent error:', err);
    logPayment({
      paymentIntentId: null,
      operation: 'terminal_payment_intent.create',
      amountCents: 0,
      status: 'error',
      error: (err as Error).message,
      source: 'la-comanda-tpv-nfc',
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
