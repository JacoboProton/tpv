import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// POST /api/stripe/payment-intent
// body: { amount: number (euros), tableId, tableName, employeeName }
// Devuelve: { clientSecret }
export async function POST(req) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
    }

    const { amount, tableId, tableName, employeeName } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Importe inválido' }, { status: 400 });
    }

    // Stripe trabaja en céntimos (enteros)
    const amountCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        tableId:      tableId      ?? '',
        tableName:    tableName    ?? '',
        employeeName: employeeName ?? '',
        source:       'la-comanda-tpv',
      },
      description: `${tableName ?? 'Mesa'} — La Comanda`,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe PaymentIntent error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
