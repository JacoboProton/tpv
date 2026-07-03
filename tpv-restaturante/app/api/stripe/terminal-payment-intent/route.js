import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

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

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      payment_method_types: ['card_present'],
      metadata: {
        tableId:      tableId      ?? '',
        tableName:    tableName    ?? '',
        employeeName: employeeName ?? '',
        source:       'la-comanda-tpv-nfc',
      },
      description: `${tableName ?? 'Mesa'} — La Comanda (NFC)`,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Terminal PaymentIntent error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
