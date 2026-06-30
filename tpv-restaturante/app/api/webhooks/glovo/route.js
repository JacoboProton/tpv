import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

function normalizeGlovoProducts(products) {
  if (!products || !Array.isArray(products)) return [];
  return products.map((p, i) => ({
    id: 'g_' + Date.now() + '_' + i + Math.random().toString(36).slice(2, 6),
    productId: p.id || p.product_id || '',
    name: p.name || p.title || 'Producto',
    price: parseFloat(p.price || p.price_value || 0),
    qty: p.quantity || 1,
    notes: p.notes || p.modifications || '',
    modifiers: p.modifiers || [],
    sent: false, sentAt: 0, ready: false, served: false,
    source: 'glovo',
  }));
}

// Glovo sends a verification ping on setup
export async function GET(req) {
  console.log('[Glovo webhook] Verification GET from', req.headers.get('x-forwarded-for'));
  return NextResponse.json({ status: 'ok', webhook: 'active' });
}

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('[Glovo webhook] Order received:', body.order_id || body.id);

    const orderId = body.order_id || body.id || 'g_' + Date.now();
    const customer = body.customer || body.client || {};
    const products = normalizeGlovoProducts(body.products || body.items || []);
    const total = parseFloat(body.total || body.total_price || 0);
    const deliveryFee = parseFloat(body.delivery_fee || body.shipping_cost || 0);
    const address = customer.address || body.address || body.delivery_address || '';
    const lat = customer.latitude || body.latitude || null;
    const lng = customer.longitude || body.longitude || null;

    const delId = 'del_' + Date.now();
    const now = Date.now();

    await sql`
      INSERT INTO delivery_orders (id, customer_name, customer_phone, address, address_lat, address_lng,
        notes, items, status, source, platform_order_id, created_at)
      VALUES (${delId}, ${customer.name || ''}, ${customer.phone || customer.phone_number || ''},
        ${address}, ${lat}, ${lng},
        ${body.notes || body.comment || ''}, ${JSON.stringify(products)},
        'pending', 'glovo', ${String(orderId)}, ${now})
    `;

    return NextResponse.json({ ok: true, id: delId });
  } catch (err) {
    console.error('[Glovo webhook] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
