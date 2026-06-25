import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const rows = await sql`
      SELECT
        id, order_id AS "orderId", table_id AS "tableId", table_name AS "tableName",
        items, total::float, employee_name AS "employeeName",
        reason, cancelled_at AS "cancelledAt"
      FROM cancelled_orders
      ORDER BY cancelled_at DESC
      LIMIT ${limit}
    `;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    const [row] = await sql`
      INSERT INTO cancelled_orders (order_id, table_id, table_name, items, total, employee_name, reason)
      VALUES (
        ${b.orderId}, ${b.tableId}, ${b.tableName},
        ${JSON.stringify(b.items)},
        ${b.total}, ${b.employeeName}, ${b.reason}
      )
      RETURNING
        id, order_id AS "orderId", table_id AS "tableId", table_name AS "tableName",
        items, total::float, employee_name AS "employeeName",
        reason, cancelled_at AS "cancelledAt"
    `;
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
