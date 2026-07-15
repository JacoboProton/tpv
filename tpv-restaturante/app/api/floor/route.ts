import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';
import { broadcastFloorUpdateServer } from '../../../lib/realtime';
import { FloorPutBodySchema } from '../../../lib/schemas/floorSchema';
import { upsertTableQueries, upsertOrderQueries, upsertFloorPlanQuery, fetchFullFloor } from '../../../lib/floor';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const fullFloor = await fetchFullFloor(tenantId);
    return NextResponse.json(fullFloor);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { tables: unknown; orders: unknown; zones: unknown; background: unknown };
    const { tables, orders, zones, background } = body;
    await FloorPutBodySchema.parseAsync({ tables, orders, zones, background });
    const tenantId = getTenantId(req);

    const queries = [
      ...upsertTableQueries(tables as any[], tenantId),
      ...upsertOrderQueries(orders as any, tenantId),
    ];

    if (zones || background) {
      queries.push(upsertFloorPlanQuery(zones, background));
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor, tenantId).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      updatedTables: unknown[]; deletedTableIds: string[]; updatedOrders: Record<string, unknown>; deletedOrderIds: string[];
    };
    const { updatedTables, deletedTableIds, updatedOrders, deletedOrderIds } = body;
    const tenantId = getTenantId(req);
    const queries: any[] = [];

    if (deletedTableIds && deletedTableIds.length > 0) {
      queries.push(sql`
        DELETE FROM tables 
        WHERE tenant_id = ${tenantId} 
          AND id = ANY(${deletedTableIds})
      `);
    }

    if (deletedOrderIds && deletedOrderIds.length > 0) {
      queries.push(sql`
        DELETE FROM orders 
        WHERE tenant_id = ${tenantId} 
          AND id = ANY(${deletedOrderIds})
      `);
    }

    if (updatedTables && updatedTables.length > 0) {
      queries.push(...upsertTableQueries(updatedTables as any[], tenantId));
    }
    if (updatedOrders && Object.keys(updatedOrders).length > 0) {
      queries.push(...upsertOrderQueries(updatedOrders as any, tenantId));
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor, tenantId).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
