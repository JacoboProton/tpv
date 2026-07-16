import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { rateLimit } from '../../../../lib/rate-limit';
import { settings } from '../../../../db/schema';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function env(key: string, fallback: string) {
  return process.env[key] || fallback;
}

async function getOrCreateLocation(stripe: Stripe, tenantId: string) {
  const db = getDb();
  try {
    const rows = await db.select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.key, 'stripe_terminal_location_id'), eq(settings.tenantId, tenantId)))
      .limit(1);
    if (rows.length > 0 && rows[0].value) {
      return rows[0].value;
    }
  } catch {}
  const g = globalThis as Record<string, unknown>;
  if (typeof globalThis !== 'undefined' && g.__stripeLocationId) {
    return g.__stripeLocationId as string;
  }
  const existing = await stripe.terminal.locations.list({ limit: 1 });
  if (existing.data.length > 0) {
    const id = existing.data[0].id;
    try { await db.insert(settings).values({ key: 'stripe_terminal_location_id', value: id, tenantId }).onConflictDoUpdate({ target: [settings.key, settings.tenantId], set: { value: id } }); } catch {}
    if (typeof globalThis !== 'undefined') (globalThis as Record<string, unknown>).__stripeLocationId = id;
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
  try { await db.insert(settings).values({ key: 'stripe_terminal_location_id', value: loc.id, tenantId }).onConflictDoUpdate({ target: [settings.key, settings.tenantId], set: { value: loc.id } }); } catch {}
  if (typeof globalThis !== 'undefined') (globalThis as Record<string, unknown>).__stripeLocationId = loc.id;
  return loc.id;
}

export async function POST(req: NextRequest) {
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
    const tenantId = getTenantId(req);
    const locationId = await getOrCreateLocation(stripe, tenantId);
    const ct = await stripe.terminal.connectionTokens.create({});
    return NextResponse.json({ connectionToken: ct.secret, locationId });
  } catch (err: any) {
    console.error('Terminal error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
