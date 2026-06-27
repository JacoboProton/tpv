import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// GET /api/floor → { tables, orders, zones, background }
export async function GET() {
  try {
    const [tableRows, orderRows, floorPlanRows] = await Promise.all([
      sql`SELECT id, name, status, order_id AS "orderId", order_ids AS "orderIds", reserved, reserved_for, is_fiado AS "isFiado", type,
                 pos_x AS "x", pos_y AS "y", table_width AS "width", table_height AS "height",
                 table_radius AS "radius", table_shape AS "shape", rotation,
                 seats, zone, layer, table_color AS "color"
          FROM tables ORDER BY id`,
      sql`SELECT id, table_id AS "tableId", items, created_at AS "createdAt", employee_name AS "employeeName" FROM orders`,
      sql`SELECT zones, background FROM floor_plan WHERE id = 1`,
    ]);

    const orders = {};
    for (const o of orderRows) {
      orders[o.id] = o;
    }

    const fp = floorPlanRows[0] || { zones: '[]', background: null };

    return NextResponse.json({
      tables: tableRows,
      orders,
      zones: JSON.parse(fp.zones || '[]'),
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

    const queries = [];

    for (const t of tables) {
      queries.push(sql`
        INSERT INTO tables (id, name, status, order_id, order_ids, reserved, reserved_for, is_fiado, type,
                            pos_x, pos_y, table_width, table_height, table_radius,
                            table_shape, rotation, seats, zone, layer, table_color)
        VALUES (${t.id}, ${t.name}, ${t.status}, ${t.orderId ?? null},
                ${JSON.stringify(t.orderIds || (t.orderId ? [t.orderId] : []))},
                ${JSON.stringify(t.reserved ?? null)}, ${t.reserved_for ?? ''}, ${t.isFiado ?? false}, ${t.type ?? 'mesa'},
                ${t.x ?? 100}, ${t.y ?? 100}, ${t.width ?? 80}, ${t.height ?? 80}, ${t.radius ?? 40},
                ${t.shape ?? 'rect'}, ${t.rotation ?? 0}, ${t.seats ?? 4},
                ${t.zone ?? ''}, ${t.layer ?? 0}, ${t.color ?? ''})
        ON CONFLICT (id) DO UPDATE SET
          status       = EXCLUDED.status,
          order_id     = EXCLUDED.order_id,
          order_ids    = EXCLUDED.order_ids,
          reserved     = EXCLUDED.reserved,
          reserved_for = EXCLUDED.reserved_for,
          is_fiado     = EXCLUDED.is_fiado,
          type         = EXCLUDED.type,
          pos_x        = EXCLUDED.pos_x,
          pos_y        = EXCLUDED.pos_y,
          table_width  = EXCLUDED.table_width,
          table_height = EXCLUDED.table_height,
          table_radius = EXCLUDED.table_radius,
          table_shape  = EXCLUDED.table_shape,
          rotation     = EXCLUDED.rotation,
          seats        = EXCLUDED.seats,
          zone         = EXCLUDED.zone,
          layer        = EXCLUDED.layer,
          table_color  = EXCLUDED.table_color
      `);
    }

    const orderIds = Object.keys(orders);
    if (orderIds.length > 0) {
      for (const [oid, o] of Object.entries(orders)) {
        queries.push(sql`
          INSERT INTO orders (id, table_id, items, created_at, employee_name)
          VALUES (${oid}, ${o.tableId}, ${JSON.stringify(o.items)}, ${o.createdAt}, ${o.employeeName ?? null})
          ON CONFLICT (id) DO UPDATE SET
            table_id      = EXCLUDED.table_id,
            items         = EXCLUDED.items,
            employee_name = EXCLUDED.employee_name
        `);
      }
      queries.push(sql`DELETE FROM orders WHERE id != ALL(${orderIds})`);
    } else {
      queries.push(sql`DELETE FROM orders`);
    }

    if (zones || background) {
      queries.push(sql`
        INSERT INTO floor_plan (id, zones, background)
        VALUES (1, ${JSON.stringify(zones || [])}, ${JSON.stringify(background || null)})
        ON CONFLICT (id) DO UPDATE SET
          zones      = EXCLUDED.zones,
          background = EXCLUDED.background
      `);
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
