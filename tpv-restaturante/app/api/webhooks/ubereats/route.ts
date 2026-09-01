import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/drizzle';
import { verifyWebhookSignature } from '../../../../lib/verify-webhook';
import { getPublicTenantId } from '../../../../lib/tenant';
import { deliveryOrders } from '../../../../db/schema';
import { apiOk, apiError, apiUnauthorized } from '../../../../lib/infrastructure/response';

// SIN requireRole — webhook de Uber Eats invocado por Uber directamente.
// GET: verificación del webhook (devuelve challenge). POST: se autentica
// vía firma HMAC (x-uber-signature) contra UBER_WEBHOOK_SECRET.

interface UberItemPayload {
  id?: string;
  product_id?: string;
  title?: string;
  name?: string;
  price_value?: string | number;
  price?: string | number;
  quantity?: number;
  special_instructions?: string;
  notes?: string;
  modifiers?: unknown[];
}

interface UberPayload {
  event?: string;
  order_id?: string;
  id?: string;
  data?: UberData;
  items?: unknown;
  products?: unknown;
  customer?: UberCustomer;
  diner?: UberCustomer;
  delivery?: UberDelivery;
  delivery_address?: UberDelivery;
  total?: { value?: string | number } | string | number;
  delivery_fee?: { value?: string | number } | string | number;
  notes?: string;
  special_instructions?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface UberData extends UberPayload {
  items?: unknown;
  products?: unknown;
}

interface UberCustomer {
  name?: string;
  diner_name?: string;
  phone?: string;
  phone_number?: string;
}

interface UberDelivery {
  address_line?: string;
  address?: string | { address_line?: string; line1?: string };
  location?: { latitude?: string | number; longitude?: string | number };
}

function money(value: { value?: string | number } | string | number | undefined): string | number {
  if (value && typeof value === 'object') return value.value ?? 0;
  return value ?? 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeUberProducts(items: unknown) {
  const list: unknown[] = Array.isArray(items) ? items : [];
  return list.flatMap((p, i) => {
    if (!isRecord(p)) return [];
    const id = typeof p.id === 'string' ? p.id : (typeof p.product_id === 'string' ? p.product_id : '');
    const name = typeof p.title === 'string' ? p.title : (typeof p.name === 'string' ? p.name : 'Producto');
    const priceRaw = p.price_value ?? p.price ?? 0;
    const price = parseFloat(typeof priceRaw === 'string' || typeof priceRaw === 'number' ? String(priceRaw) : '0');
    const qty = typeof p.quantity === 'number' ? p.quantity : 1;
    const notesRaw = p.special_instructions ?? p.notes ?? '';
    const notes = typeof notesRaw === 'string' ? notesRaw : '';
    const modifiers: unknown = p.modifiers ?? [];
    return [{
      id: 'ue_' + Date.now() + '_' + i + Math.random().toString(36).slice(2, 6),
      productId: id, name, price, qty, notes, modifiers,
      sent: false, sentAt: 0, ready: false, served: false,
      source: 'ubereats',
    }];
  });
}

export async function GET(req: NextRequest) {
  console.log('[UberEats webhook] Verification from', req.headers.get('x-forwarded-for'));
  const challenge = new URL(req.url).searchParams.get('challenge');
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return apiOk({ status: 'ok' });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiUnauthorized('tenant_no_autorizado');
    const rawBody = await req.text();
    const signature = req.headers.get('x-uber-signature') || req.headers.get('x-postmates-signature') || '';
    const valid = verifyWebhookSignature(rawBody, signature, 'UBER_WEBHOOK_SECRET');
    if (!valid) {
      return apiUnauthorized('Firma inválida');
    }

    const body = JSON.parse(rawBody) as UberPayload;
    console.log('[UberEats webhook] Event:', body.event);

    const event = body.event || '';
    const data = body.data || body;

    if (event !== 'orders.create' && event !== 'orders.upsert' && !data.items && !data.products) {
      return apiOk({ ignored: true });
    }

    const orderId = data.order_id || data.id || 'ue_' + Date.now();
    const customer = data.customer || data.diner || {};
    const delivery = data.delivery || data.delivery_address || {};
    const items = normalizeUberProducts(data.items || data.products || []);
    const total = parseFloat(String(money(data.total)));
    const deliveryFee = parseFloat(String(money(data.delivery_fee)));
    const address = (typeof delivery.address === 'string' ? delivery.address : delivery.address?.address_line) || delivery.address_line || '';
    const lat = delivery.location?.latitude || data.latitude || null;
    const lng = delivery.location?.longitude || data.longitude || null;

    const delId = 'del_' + Date.now();
    const now = Date.now();

    await db.insert(deliveryOrders).values({
      tenantId,
      id: delId,
      customerName: customer.name || customer.diner_name || '',
      customerPhone: customer.phone || customer.phone_number || '',
      address,
      addressLat: lat != null ? String(lat) : null,
      addressLng: lng != null ? String(lng) : null,
      notes: data.notes || data.special_instructions || '',
      items,
      status: 'pending',
      source: 'ubereats',
      platformOrderId: String(orderId),
      createdAt: now,
    });

    return apiOk({ id: delId });
  } catch (err) {
    console.error('[UberEats webhook] Error:', err instanceof Error ? err.message : String(err));
    return apiError(err);
  }
}
