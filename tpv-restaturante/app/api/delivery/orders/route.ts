import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { deliveryOrders } from '../../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const orders = await db.select().from(deliveryOrders)
      .where(eq(deliveryOrders.tenantId, tenantId))
      .orderBy(desc(deliveryOrders.createdAt))
      .limit(100);
    return NextResponse.json(orders);
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
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
    return NextResponse.json({ id, ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    await db.update(deliveryOrders)
      .set({
        status: body.status,
        ...(body.runnerId !== undefined ? { runnerId: body.runnerId } : {}),
        ...(body.estimatedAt !== undefined ? { estimatedAt: body.estimatedAt } : {}),
        ...(body.deliveredAt !== undefined ? { deliveredAt: body.deliveredAt } : {}),
        ...(body.items !== undefined ? { items: body.items } : {}),
      })
      .where(eq(deliveryOrders.id, body.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
