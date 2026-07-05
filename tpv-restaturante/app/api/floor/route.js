import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';
import { broadcastFloorUpdateServer } from '../../../lib/realtime';
import { FloorPutBodySchema } from '../../../lib/schemas/floorSchema';
import { upsertTableQueries, upsertOrderQueries, upsertFloorPlanQuery, fetchFullFloor } from '../../../lib/floor';

// GET /api/floor → { tables, orders, zones, background }
export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const fullFloor = await fetchFullFloor(tenantId);
    return NextResponse.json(fullFloor);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/floor → body: { tables, orders, zones, background }
// This implementation now performs upserts instead of deleting all rows, improving concurrency and performance.
export async function PUT(req) {
  try {
    const { tables, orders, zones, background } = await req.json();
    await FloorPutBodySchema.parseAsync({ tables, orders, zones, background });
    const tenantId = getTenantId(req);

    // Build upsert queries using helper library
    const queries = [
      ...upsertTableQueries(tables, tenantId),
      ...upsertOrderQueries(orders, tenantId),
    ];

    if (zones || background) {
      queries.push(upsertFloorPlanQuery(zones, background));
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    // Fetch full floor state via helper and broadcast
    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/floor → body: { updatedTables, deletedTableIds, updatedOrders, deletedOrderIds }
export async function PATCH(req) {
  try {
    const { updatedTables, deletedTableIds, updatedOrders, deletedOrderIds } = await req.json();
    const tenantId = getTenantId(req);
    const queries = [];

    // Deletions remain unchanged
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

    // Upserts via helpers
    if (updatedTables && updatedTables.length > 0) {
      queries.push(...upsertTableQueries(updatedTables, tenantId));
    }
    if (updatedOrders && Object.keys(updatedOrders).length > 0) {
      queries.push(...upsertOrderQueries(updatedOrders, tenantId));
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    // Re-fetch full floor state and broadcast
    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
