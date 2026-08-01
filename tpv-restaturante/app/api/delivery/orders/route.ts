import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { deliveryOrders } from '../../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized } from '../../../../lib/infrastructure/response';
import { requireRole } from '../../../../lib/rbac';
import { DeliveryOrderBody } from '@/lib/schemas/api-schemas';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const orders = await db.select().from(deliveryOrders)
      .where(eq(deliveryOrders.tenantId, tenantId))
      .orderBy(desc(deliveryOrders.createdAt))
      .limit(100);
    return apiOk(orders);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = DeliveryOrderBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const b = parsed.data as {
      id?: string; orderId?: string; tableId?: string; customerName: string;
      customerPhone?: string; address: string; addressLat?: string | number;
      addressLng?: string | number; notes?: string; runnerId?: string;
      items?: unknown; status?: string; estimatedAt?: number; deliveredAt?: number;
    };
    const id = 'del_' + Date.now();
    await db.insert(deliveryOrders).values({
      id, tenantId,
      orderId: b.orderId ?? null,
      tableId: b.tableId ?? null,
      customerName: b.customerName,
      customerPhone: b.customerPhone ?? '',
      address: b.address,
      addressLat: b.addressLat != null ? String(b.addressLat) : null,
      addressLng: b.addressLng != null ? String(b.addressLng) : null,
      notes: b.notes ?? '',
      runnerId: b.runnerId ?? null,
      items: b.items ?? [],
      status: 'pending',
      createdAt: Date.now(),
    });
    return apiOk({ id, ok: true });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = DeliveryOrderBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const b = parsed.data as {
      id?: string; runnerId?: string; status?: string; estimatedAt?: number;
      deliveredAt?: number; items?: unknown;
    };
    if (!b.id) return apiBadRequest('id required for update');
    await db.update(deliveryOrders)
      .set({
        status: b.status,
        ...(b.runnerId !== undefined ? { runnerId: b.runnerId } : {}),
        ...(b.estimatedAt !== undefined ? { estimatedAt: b.estimatedAt } : {}),
        ...(b.deliveredAt !== undefined ? { deliveredAt: b.deliveredAt } : {}),
        ...(b.items !== undefined ? { items: b.items } : {}),
      })
      .where(eq(deliveryOrders.id, b.id));
    return apiOk();
  } catch (err) { return apiError(err); }
}
