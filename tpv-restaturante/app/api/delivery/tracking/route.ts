import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { deliveryTracking, deliveryOrders } from '../../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized } from '../../../../lib/infrastructure/response';
import { DeliveryTrackingBody } from '@/lib/schemas/api-schemas';

// SIN requireRole — endpoint de tracking público para que el cliente
// delivery pueda consultar el estado de su pedido sin autenticación.
// Solo expone datos de tracking (ubicación, estado), no datos sensibles
// del negocio. El tenant_id se filtra vía getTenantId() desde el header.
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const deliveryId = searchParams.get('deliveryId');
    if (deliveryId) {
      const rows = await db.select({
        id: deliveryTracking.id,
        deliveryId: deliveryTracking.deliveryId,
        status: deliveryTracking.status,
        locationLat: deliveryTracking.locationLat,
        locationLng: deliveryTracking.locationLng,
        note: deliveryTracking.note,
        createdAt: deliveryTracking.createdAt,
      }).from(deliveryTracking)
        .innerJoin(deliveryOrders, eq(deliveryOrders.id, deliveryTracking.deliveryId))
        .where(sql`${eq(deliveryTracking.deliveryId, deliveryId)} AND ${eq(deliveryOrders.tenantId, tenantId)}`)
        .orderBy(deliveryTracking.createdAt);
      return apiOk(rows);
    }
    return apiOk([]);
  } catch (err) { return apiError(err); }
}

// SIN requireRole — endpoint de tracking público para el repartidor.
// Se usa desde la app móvil del rider sin sesión TPV. Se autentica
// implícitamente por deliveryId + tenantId.
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = DeliveryTrackingBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { deliveryId, status, locationLat, locationLng, note } = body;
    const [delivery] = await db.select({ id: deliveryOrders.id })
      .from(deliveryOrders)
      .where(sql`${eq(deliveryOrders.id, deliveryId)} AND ${eq(deliveryOrders.tenantId, tenantId)}`)
      .limit(1);
    if (!delivery) {
      return apiNotFound('Delivery no encontrado');
    }
    await db.insert(deliveryTracking).values({
      deliveryId, status,
      locationLat: locationLat ?? null,
      locationLng: locationLng ?? null,
      note: note || '',
      createdAt: Date.now(),
      tenantId,
    });
    return apiOk();
  } catch (err) { return apiError(err); }
}
