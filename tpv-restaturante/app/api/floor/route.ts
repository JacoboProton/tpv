import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { broadcastFloorUpdateServer } from '../../../lib/realtime';
import { FloorPutBodySchema } from '../../../lib/schemas/floorSchema';
import { putFloorInTransaction, deleteTablesInTransaction, deleteOrdersInTransaction, fetchFullFloor } from '../../../lib/floor';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const fullFloor = await fetchFullFloor(tenantId);
    return NextResponse.json(fullFloor);
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as { tables: unknown; orders: unknown; zones: unknown; background: unknown };
    const { tables: bodyTables, orders: bodyOrders, zones, background } = body;
    await FloorPutBodySchema.parseAsync({ tables: bodyTables, orders: bodyOrders, zones, background });
    const tenantId = getTenantId(req);

    await db.transaction(async (tx) => {
      await putFloorInTransaction(tx, bodyTables as any[], bodyOrders as any, zones, background, tenantId);
    });

    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor, tenantId).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as {
      updatedTables: unknown[]; deletedTableIds: string[]; updatedOrders: Record<string, unknown>; deletedOrderIds: string[];
    };
    const { updatedTables, deletedTableIds, updatedOrders, deletedOrderIds } = body;
    const tenantId = getTenantId(req);

    await db.transaction(async (tx) => {
      await deleteTablesInTransaction(tx, deletedTableIds, tenantId);
      await deleteOrdersInTransaction(tx, deletedOrderIds, tenantId);
      await putFloorInTransaction(tx, (updatedTables || []) as any[], (updatedOrders || {}) as any, null, null, tenantId);
    });

    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor, tenantId).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
