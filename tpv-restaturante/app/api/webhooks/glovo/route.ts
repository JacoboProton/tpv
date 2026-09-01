import { NextRequest } from 'next/server';
import { getDb } from '../../../../lib/drizzle';
import { verifyWebhookSignature } from '../../../../lib/verify-webhook';
import { getPublicTenantId } from '../../../../lib/tenant';
import { deliveryOrders } from '../../../../db/schema';
import { apiOk, apiError, apiUnauthorized } from '../../../../lib/infrastructure/response';

interface GlovoItemPayload {
  id?: string;
  product_id?: string;
  name?: string;
  title?: string;
  price?: string | number;
  price_value?: string | number;
  quantity?: number;
  notes?: string;
  modifications?: string;
  modifiers?: unknown[];
}

interface GlovoCustomer {
  name?: string;
  phone?: string;
  phone_number?: string;
  address?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface GlovoPayload {
  order_id?: string;
  id?: string;
  customer?: GlovoCustomer;
  client?: GlovoCustomer;
  products?: unknown;
  items?: unknown;
  total?: string | number;
  total_price?: string | number;
  delivery_fee?: string | number;
  shipping_cost?: string | number;
  address?: string;
  delivery_address?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  notes?: string;
  comment?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeGlovoProducts(products: unknown) {
  const list: unknown[] = Array.isArray(products) ? products : [];
  return list.flatMap((p, i) => {
    if (!isRecord(p)) return [];
    const id = typeof p.id === 'string' ? p.id : (typeof p.product_id === 'string' ? p.product_id : '');
    const name = typeof p.name === 'string' ? p.name : (typeof p.title === 'string' ? p.title : 'Producto');
    const priceRaw = p.price ?? p.price_value ?? 0;
    const price = parseFloat(typeof priceRaw === 'string' || typeof priceRaw === 'number' ? String(priceRaw) : '0');
    const qty = typeof p.quantity === 'number' ? p.quantity : 1;
    const notesRaw = p.notes ?? p.modifications ?? '';
    const notes = typeof notesRaw === 'string' ? notesRaw : '';
    const modifiers: unknown = p.modifiers ?? [];
    return [{
      id: 'g_' + Date.now() + '_' + i + Math.random().toString(36).slice(2, 6),
      productId: id, name, price, qty, notes, modifiers,
      sent: false, sentAt: 0, ready: false, served: false,
      source: 'glovo',
    }];
  });
}

// SIN requireRole — webhook de Glovo invocado por Glovo directamente.
// GET: verificación del webhook (Glovo espera 200). POST: se autentica
// vía firma HMAC (x-glovo-signature) contra GLOVO_WEBHOOK_SECRET.
export async function GET(req: NextRequest) {
  console.log('[Glovo webhook] Verification GET from', req.headers.get('x-forwarded-for'));
  return apiOk({ status: 'ok', webhook: 'active' });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiUnauthorized('tenant_no_autorizado');
    const rawBody = await req.text();
    const signature = req.headers.get('x-glovo-signature') || '';
    const valid = verifyWebhookSignature(rawBody, signature, 'GLOVO_WEBHOOK_SECRET', 'hex');
    if (!valid) {
      return apiUnauthorized('Firma inválida');
    }

    const body = JSON.parse(rawBody) as GlovoPayload;
    console.log('[Glovo webhook] Order received:', body.order_id || body.id);

    const orderId = body.order_id || body.id || 'g_' + Date.now();
    const customer = body.customer || body.client || {};
    const products = normalizeGlovoProducts(body.products || body.items || []);
    const total = parseFloat(String(body.total || body.total_price || 0));
    const deliveryFee = parseFloat(String(body.delivery_fee || body.shipping_cost || 0));
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

    return apiOk({ id: delId });
  } catch (err) {
    console.error('[Glovo webhook] Error:', err instanceof Error ? err.message : String(err));
    return apiError(err);
  }
}
