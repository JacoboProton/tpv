import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/drizzle';
import { verifyWebhookSignature } from '../../../../lib/verify-webhook';
import { getTenantId } from '../../../../lib/tenant';
import { deliveryOrders } from '../../../../db/schema';

function normalizeUberProducts(items: any) {
  if (!items || !Array.isArray(items)) return [];
  return items.map((p: any, i: any) => ({
    id: 'ue_' + Date.now() + '_' + i + Math.random().toString(36).slice(2, 6),
    productId: p.id || p.product_id || '',
    name: p.title || p.name || 'Producto',
    price: parseFloat(p.price_value || p.price || 0),
    qty: p.quantity || 1,
    notes: p.special_instructions || p.notes || '',
    modifiers: p.modifiers || [],
    sent: false, sentAt: 0, ready: false, served: false,
    source: 'ubereats',
  }));
}

export async function GET(req: NextRequest) {
  console.log('[UberEats webhook] Verification from', req.headers.get('x-forwarded-for'));
  const challenge = new URL(req.url).searchParams.get('challenge');
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ status: 'ok' });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rawBody = await req.text();
    const signature = req.headers.get('x-uber-signature') || req.headers.get('x-postmates-signature') || '';
    const valid = verifyWebhookSignature(rawBody, signature, 'UBER_WEBHOOK_SECRET');
    if (!valid) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log('[UberEats webhook] Event:', body.event);

    const event = body.event || '';
    const data = body.data || body;

    if (event !== 'orders.create' && event !== 'orders.upsert' && !data.items && !data.products) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const orderId = data.order_id || data.id || 'ue_' + Date.now();
    const customer = data.customer || data.diner || {};
    const delivery = data.delivery || data.delivery_address || {};
    const items = normalizeUberProducts(data.items || data.products || []);
    const total = parseFloat(data.total?.value || data.total || 0);
    const deliveryFee = parseFloat(data.delivery_fee?.value || data.delivery_fee || 0);
    const address = delivery.address?.address_line || delivery.address_line || delivery.address || '';
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

    return NextResponse.json({ ok: true, id: delId });
  } catch (err: any) {
    console.error('[UberEats webhook] Error:', (err as Error).message);
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
