import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';
import { broadcastFloorUpdateServer } from '../../../lib/realtime';

// GET /api/floor → { tables, orders, zones, background }
export async function GET(req) {
  try {
    const tenantId = getTenantId(req);

    const [tableRows, orderRows, floorPlanRows] = await Promise.all([
      sql`SELECT id, name, status, order_id AS "orderId", order_ids AS "orderIds", reserved, reserved_for, is_fiado AS "isFiado", type,
                 pos_x AS "x", pos_y AS "y", table_width AS "width", table_height AS "height",
                 table_radius AS "radius", table_shape AS "shape", rotation,
                 seats, zone, layer, table_color AS "color"
          FROM tables WHERE tenant_id = ${tenantId} ORDER BY id`,
      sql`SELECT o.id, o.table_id AS "tableId", o.items, o.created_at AS "createdAt", o.employee_name AS "employeeName"
          FROM orders o WHERE o.tenant_id = ${tenantId}`,
      sql`SELECT zones, background FROM floor_plan WHERE id = 1`,
    ]);

    const orders = {};
    for (const o of orderRows) {
      orders[o.id] = o;
    }

    const fp = floorPlanRows[0] || { zones: [], background: null };
    const rawZones = fp.zones;
    const zones = typeof rawZones === 'string' ? JSON.parse(rawZones || '[]') : (rawZones || []);

    return NextResponse.json({
      tables: tableRows,
      orders,
      zones,
      background: fp.background,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/floor → body: { tables, orders, zones, background }
export async function PUT(req) {
  try {
    const { tables, orders, zones, background } = await req.json();
    const tenantId = getTenantId(req);
    const queries = [];
    queries.push(sql`DELETE FROM tables WHERE tenant_id = ${tenantId}`);
    for (const t of tables) {
      queries.push(sql`
        INSERT INTO tables (tenant_id, id, name, status, order_id, order_ids, reserved, reserved_for, is_fiado, type,
                            pos_x, pos_y, table_width, table_height, table_radius,
                            table_shape, rotation, seats, zone, layer, table_color)
        VALUES (${tenantId}, ${t.id}, ${t.name}, ${t.status}, ${t.orderId ?? null},
                ${JSON.stringify(t.orderIds || (t.orderId ? [t.orderId] : []))},
                ${JSON.stringify(t.reserved ?? null)}, ${t.reserved_for ?? ''}, ${t.isFiado ?? false}, ${t.type ?? 'mesa'},
                ${t.x ?? 100}, ${t.y ?? 100}, ${t.width ?? 80}, ${t.height ?? 80}, ${t.radius ?? 40},
                ${t.shape ?? 'rect'}, ${t.rotation ?? 0}, ${t.seats ?? 4},
                ${t.zone ?? ''}, ${t.layer ?? 0}, ${t.color ?? ''})
      `);
    }

    queries.push(sql`DELETE FROM orders WHERE tenant_id = ${tenantId}`);
    for (const [oid, o] of Object.entries(orders)) {
      queries.push(sql`
        INSERT INTO orders (tenant_id, id, table_id, items, created_at, employee_name)
        VALUES (${tenantId}, ${oid}, ${o.tableId}, ${JSON.stringify(o.items)}, ${o.createdAt}, ${o.employeeName ?? null})
      `);
    }

    if (zones || background) {
      const zonesVal = typeof zones === 'string' ? zones : JSON.stringify(zones || []);
      const bgVal = typeof background === 'string' ? background : JSON.stringify(background ?? null);
      queries.push(sql`
        INSERT INTO floor_plan (id, zones, background)
        VALUES (1, ${zonesVal}::jsonb, ${bgVal}::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          zones      = EXCLUDED.zones,
          background = EXCLUDED.background
      `);
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    await broadcastFloorUpdateServer({ tables, orders, zones, background }).catch(() => {});

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

    if (deletedTableIds && deletedTableIds.length > 0) {
      queries.push(sql`
        DELETE FROM tables 
        WHERE tenant_id = ${tenantId} 
          AND id = ANY(${deletedTableIds})
      `);
    }

    if (updatedTables && updatedTables.length > 0) {
      for (const t of updatedTables) {
        queries.push(sql`
          INSERT INTO tables (tenant_id, id, name, status, order_id, order_ids, reserved, reserved_for, is_fiado, type,
                              pos_x, pos_y, table_width, table_height, table_radius,
                              table_shape, rotation, seats, zone, layer, table_color)
          VALUES (${tenantId}, ${t.id}, ${t.name}, ${t.status}, ${t.orderId ?? null},
                  ${JSON.stringify(t.orderIds || (t.orderId ? [t.orderId] : []))},
                  ${JSON.stringify(t.reserved ?? null)}, ${t.reserved_for ?? ''}, ${t.isFiado ?? false}, ${t.type ?? 'mesa'},
                  ${t.x ?? 100}, ${t.y ?? 100}, ${t.width ?? 80}, ${t.height ?? 80}, ${t.radius ?? 40},
                  ${t.shape ?? 'rect'}, ${t.rotation ?? 0}, ${t.seats ?? 4},
                  ${t.zone ?? ''}, ${t.layer ?? 0}, ${t.color ?? ''})
          ON CONFLICT (tenant_id, id) DO UPDATE SET
            name = EXCLUDED.name,
            status = EXCLUDED.status,
            order_id = EXCLUDED.order_id,
            order_ids = EXCLUDED.order_ids,
            reserved = EXCLUDED.reserved,
            reserved_for = EXCLUDED.reserved_for,
            is_fiado = EXCLUDED.is_fiado,
            type = EXCLUDED.type,
            pos_x = EXCLUDED.pos_x,
            pos_y = EXCLUDED.pos_y,
            table_width = EXCLUDED.table_width,
            table_height = EXCLUDED.table_height,
            table_radius = EXCLUDED.table_radius,
            table_shape = EXCLUDED.table_shape,
            rotation = EXCLUDED.rotation,
            seats = EXCLUDED.seats,
            zone = EXCLUDED.zone,
            layer = EXCLUDED.layer,
            table_color = EXCLUDED.table_color
        `);
      }
    }

    if (deletedOrderIds && deletedOrderIds.length > 0) {
      queries.push(sql`
        DELETE FROM orders 
        WHERE tenant_id = ${tenantId} 
          AND id = ANY(${deletedOrderIds})
      `);
    }

    if (updatedOrders && Object.keys(updatedOrders).length > 0) {
      for (const [oid, o] of Object.entries(updatedOrders)) {
        queries.push(sql`
          INSERT INTO orders (tenant_id, id, table_id, items, created_at, employee_name)
          VALUES (${tenantId}, ${oid}, ${o.tableId}, ${JSON.stringify(o.items)}, ${o.createdAt}, ${o.employeeName ?? null})
          ON CONFLICT (tenant_id, id) DO UPDATE SET
            table_id = EXCLUDED.table_id,
            items = EXCLUDED.items,
            created_at = EXCLUDED.created_at,
            employee_name = EXCLUDED.employee_name
        `);
      }
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    // Volvemos a leer todo el salón para difundirlo por Realtime y asegurar sincronización total
    const [tableRows, orderRows, floorPlanRows] = await Promise.all([
      sql`SELECT id, name, status, order_id AS "orderId", order_ids AS "orderIds", reserved, reserved_for, is_fiado AS "isFiado", type,
                 pos_x AS "x", pos_y AS "y", table_width AS "width", table_height AS "height",
                 table_radius AS "radius", table_shape AS "shape", rotation,
                 seats, zone, layer, table_color AS "color"
          FROM tables WHERE tenant_id = ${tenantId} ORDER BY id`,
      sql`SELECT o.id, o.table_id AS "tableId", o.items, o.created_at AS "createdAt", o.employee_name AS "employeeName"
          FROM orders o WHERE o.tenant_id = ${tenantId}`,
      sql`SELECT zones, background FROM floor_plan WHERE id = 1`,
    ]);

    const orders = {};
    for (const o of orderRows) {
      orders[o.id] = o;
    }

    const fp = floorPlanRows[0] || { zones: [], background: null };
    const rawZones = fp.zones;
    const zones = typeof rawZones === 'string' ? JSON.parse(rawZones || '[]') : (rawZones || []);

    const fullFloor = {
      tables: tableRows,
      orders,
      zones,
      background: fp.background,
    };

    await broadcastFloorUpdateServer(fullFloor).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
