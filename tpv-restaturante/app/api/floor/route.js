import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// GET /api/floor → { tables: Table[], orders: Record<id, Order> }
export async function GET() {
  try {
    const [tableRows, orderRows] = await Promise.all([
      sql`SELECT id, name, status, order_id AS "orderId", reserved, is_fiado AS "isFiado", type FROM tables ORDER BY id`,
      sql`SELECT id, table_id AS "tableId", items, created_at AS "createdAt", employee_name AS "employeeName" FROM orders`,
    ]);

    const orders = {};
    for (const o of orderRows) {
      orders[o.id] = o;
    }

    return NextResponse.json({ tables: tableRows, orders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/floor → body: { tables, orders }  (sincroniza toda la sala)
export async function PUT(req) {
  try {
    const { tables, orders } = await req.json();

    const queries = [];

    for (const t of tables) {
      queries.push(sql`
        INSERT INTO tables (id, name, status, order_id, reserved, is_fiado, type)
        VALUES (${t.id}, ${t.name}, ${t.status}, ${t.orderId ?? null}, ${JSON.stringify(t.reserved ?? null)}, ${t.isFiado ?? false}, ${t.type ?? 'mesa'})
        ON CONFLICT (id) DO UPDATE SET
          status   = EXCLUDED.status,
          order_id = EXCLUDED.order_id,
          reserved = EXCLUDED.reserved,
          is_fiado = EXCLUDED.is_fiado,
          type     = EXCLUDED.type
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

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}