import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '../../../../lib/db';
import { rateLimit } from '../../../../lib/rate-limit';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function env(key, fallback) {
  return process.env[key] || fallback;
}

async function getOrCreateLocation(stripe) {
  // Persistir en BD en lugar de memoria volátil
  try {
    const rows = await sql`SELECT value FROM settings WHERE key = 'stripe_terminal_location_id' LIMIT 1`;
    if (rows.length > 0 && rows[0].value) {
      return rows[0].value;
    }
  } catch {}
  // L1 cache en memoria como respaldo mientras dure el proceso
  if (typeof globalThis !== 'undefined' && globalThis.__stripeLocationId) {
    return globalThis.__stripeLocationId;
  }
  const existing = await stripe.terminal.locations.list({ limit: 1 });
  if (existing.data.length > 0) {
    const id = existing.data[0].id;
    try { await sql`INSERT INTO settings (key, value) VALUES ('stripe_terminal_location_id', ${id}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`; } catch {}
    if (typeof globalThis !== 'undefined') globalThis.__stripeLocationId = id;
    return id;
  }
  const loc = await stripe.terminal.locations.create({
    display_name: env('STRIPE_LOCATION_NAME', 'La Comanda'),
    address: {
      line1: env('STRIPE_LOCATION_LINE1', 'Restaurante'),
      city: env('STRIPE_LOCATION_CITY', 'Ciudad'),
      state: env('STRIPE_LOCATION_STATE', 'Madrid'),
      country: env('STRIPE_LOCATION_COUNTRY', 'ES'),
      postal_code: env('STRIPE_LOCATION_POSTAL_CODE', '28001'),
    },
  });
  try { await sql`INSERT INTO settings (key, value) VALUES ('stripe_terminal_location_id', ${loc.id}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`; } catch {}
  if (typeof globalThis !== 'undefined') globalThis.__stripeLocationId = loc.id;
  return loc.id;
}

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`tct:${ip}`, 20, 60 * 1000);
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
    const locationId = await getOrCreateLocation(stripe);
    const ct = await stripe.terminal.connectionTokens.create({});
    return NextResponse.json({ connectionToken: ct.secret, locationId });
  } catch (err) {
    console.error('Terminal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
