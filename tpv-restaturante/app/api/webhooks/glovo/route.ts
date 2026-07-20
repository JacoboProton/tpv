import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/drizzle';
import { verifyWebhookSignature } from '../../../../lib/verify-webhook';
import { getTenantId } from '../../../../lib/tenant';
import { deliveryOrders } from '../../../../db/schema';

function normalizeGlovoProducts(products: any) {
  if (!products || !Array.isArray(products)) return [];
  return products.map((p: any, i: any) => ({
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

export async function GET(req: NextRequest) {
  console.log('[Glovo webhook] Verification GET from', req.headers.get('x-forwarded-for'));
  return NextResponse.json({ status: 'ok', webhook: 'active' });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rawBody = await req.text();
    const signature = req.headers.get('x-glovo-signature') || '';
    const valid = verifyWebhookSignature(rawBody, signature, 'GLOVO_WEBHOOK_SECRET', 'hex');
    if (!valid) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
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

    await db.insert(deliveryOrders).values({
      tenantId,
      id: delId,
      customerName: customer.name || '',
      customerPhone: customer.phone || customer.phone_number || '',
      address,
      addressLat: lat != null ? String(lat) : null,
      addressLng: lng != null ? String(lng) : null,
      notes: body.notes || body.comment || '',
      items: products,
      status: 'pending',
      source: 'glovo',
      platformOrderId: String(orderId),
      createdAt: now,
    });

    return NextResponse.json({ ok: true, id: delId });
  } catch (err: any) {
    console.error('[Glovo webhook] Error:', (err as Error).message);
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
