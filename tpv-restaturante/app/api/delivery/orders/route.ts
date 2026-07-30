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
    const body = parsed.data;
    const id = 'del_' + Date.now();
    await db.insert(deliveryOrders).values({
      id, tenantId,
      orderId: body.orderId ?? null,
      tableId: body.tableId ?? null,
      customerName: body.customerName,
      customerPhone: body.customerPhone ?? '',
      address: body.address,
      addressLat: body.addressLat ?? null,
      addressLng: body.addressLng ?? null,
      notes: body.notes ?? '',
      runnerId: body.runnerId ?? null,
      items: body.items ?? [],
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
    const body = parsed.data;
    await db.update(deliveryOrders)
      .set({
        status: body.status,
        ...(body.runnerId !== undefined ? { runnerId: body.runnerId } : {}),
        ...(body.estimatedAt !== undefined ? { estimatedAt: body.estimatedAt } : {}),
        ...(body.deliveredAt !== undefined ? { deliveredAt: body.deliveredAt } : {}),
        ...(body.items !== undefined ? { items: body.items } : {}),
      })
      .where(eq(deliveryOrders.id, body.id));
    return apiOk();
  } catch (err) { return apiError(err); }
}
