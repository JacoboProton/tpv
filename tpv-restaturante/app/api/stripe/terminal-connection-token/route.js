import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

let cachedLocationId = null;

function env(key, fallback) {
  return process.env[key] || fallback;
}

async function getOrCreateLocation(stripe) {
  if (cachedLocationId) return cachedLocationId;
  const existing = await stripe.terminal.locations.list({ limit: 1 });
  if (existing.data.length > 0) {
    cachedLocationId = existing.data[0].id;
  } else {
    const loc = await stripe.terminal.locations.create({
      display_name: env('STRIPE_LOCATION_NAME', 'La Comanda'),
      address: {
        line1: env('STRIPE_LOCATION_LINE1', 'Restaurante'),
        city: env('STRIPE_LOCATION_CITY', 'Ciudad'),
        country: env('STRIPE_LOCATION_COUNTRY', 'ES'),
        postal_code: env('STRIPE_LOCATION_POSTAL_CODE', '28001'),
      },
    });
    cachedLocationId = loc.id;
  }
  return cachedLocationId;
}

export async function POST() {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
    }
    const locationId = await getOrCreateLocation(stripe);
    const ct = await stripe.terminal.connectionTokens.create({});
    return NextResponse.json({ connectionToken: ct.secret, locationId });
  } catch (err) {
    console.error('Terminal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
