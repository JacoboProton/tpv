import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { broadcastFloorUpdateServer } from '../../../lib/realtime';
import { FloorPutBodySchema } from '../../../lib/schemas/floorSchema';
import { tables, orders } from '../../../db/schema';
import { upsertTableQueries, upsertOrderQueries, upsertFloorPlanQuery, fetchFullFloor } from '../../../lib/floor';

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

    const rawQueries = [
      ...upsertTableQueries(bodyTables as any[], tenantId),
      ...upsertOrderQueries(bodyOrders as any, tenantId),
    ];

    if (zones || background) {
      rawQueries.push(upsertFloorPlanQuery(zones, background));
    }

    if (rawQueries.length > 0) {
      await db.transaction(async (tx) => {
        for (const q of rawQueries) {
          await tx.execute(q as any);
        }
      });
    }

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
    const rawQueries: any[] = [];

    if (deletedTableIds && deletedTableIds.length > 0) {
      rawQueries.push(
        db.delete(tables)
          .where(and(eq(tables.tenantId, tenantId), inArray(tables.id, deletedTableIds)))
          .toSQL()
      );
    }

    if (deletedOrderIds && deletedOrderIds.length > 0) {
      rawQueries.push(
        db.delete(orders)
          .where(and(eq(orders.tenantId, tenantId), inArray(orders.id, deletedOrderIds)))
          .toSQL()
      );
    }

    if (updatedTables && updatedTables.length > 0) {
      rawQueries.push(...upsertTableQueries(updatedTables as any[], tenantId));
    }
    if (updatedOrders && Object.keys(updatedOrders).length > 0) {
      rawQueries.push(...upsertOrderQueries(updatedOrders as any, tenantId));
    }

    if (rawQueries.length > 0) {
      await db.transaction(async (tx) => {
        for (const q of rawQueries) {
          await tx.execute(q);
        }
      });
    }

    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor, tenantId).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
