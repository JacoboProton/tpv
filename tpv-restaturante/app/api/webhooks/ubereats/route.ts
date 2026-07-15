import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { verifyWebhookSignature } from '../../../../lib/verify-webhook';
import { getTenantId } from '../../../../lib/tenant';

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

// UberEats sends a verification challenge
export async function GET(req: NextRequest) {
  console.log('[UberEats webhook] Verification from', req.headers.get('x-forwarded-for'));
  const challenge = new URL(req.url).searchParams.get('challenge');
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ status: 'ok' });
}

export async function POST(req: NextRequest) {
  try {
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

    // Only process order creation
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

    await sql`
      INSERT INTO delivery_orders (tenant_id, id, customer_name, customer_phone, address, address_lat, address_lng,
        notes, items, status, source, platform_order_id, created_at)
      VALUES (${tenantId}, ${delId}, ${customer.name || customer.diner_name || ''},
        ${customer.phone || customer.phone_number || ''},
        ${address}, ${lat}, ${lng},
        ${data.notes || data.special_instructions || ''}, ${JSON.stringify(items)},
        'pending', 'ubereats', ${String(orderId)}, ${now})
    `;

    return NextResponse.json({ ok: true, id: delId });
  } catch (err: any) {
    console.error('[UberEats webhook] Error:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
