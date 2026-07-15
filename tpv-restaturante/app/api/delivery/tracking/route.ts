import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { deliveryTracking, deliveryOrders } from '../../../../db/schema';

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
      return NextResponse.json(rows);
    }
    return NextResponse.json([]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { deliveryId, status, locationLat, locationLng, note } = body;
    const [delivery] = await db.select({ id: deliveryOrders.id })
      .from(deliveryOrders)
      .where(sql`${eq(deliveryOrders.id, deliveryId)} AND ${eq(deliveryOrders.tenantId, tenantId)}`)
      .limit(1);
    if (!delivery) {
      return NextResponse.json({ error: 'Delivery no encontrado' }, { status: 404 });
    }
    await db.insert(deliveryTracking).values({
      deliveryId, status,
      locationLat: locationLat ?? null,
      locationLng: locationLng ?? null,
      note: note || '',
      createdAt: Date.now(),
      tenantId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
