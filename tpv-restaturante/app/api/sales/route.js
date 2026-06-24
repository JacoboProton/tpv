import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// GET /api/sales → Sale[]
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        id, table_id AS "tableId", table_name AS "tableName",
        items, subtotal::float, discount::float, discount_amount::float AS "discountAmount",
        total::float, tip::float, total_with_tip::float AS "totalWithTip",
        payments, payment_method AS "paymentMethod",
        is_fiado AS "isFiado", is_debt_payment AS "isDebtPayment",
        employee_id AS "employeeId", employee_name AS "employeeName",
        closed_at AS "closedAt"
      FROM sales
      ORDER BY closed_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/sales → body: Sale  (añade una venta)
export async function POST(req) {
  try {
    const s = await req.json();
    await sql`
      INSERT INTO sales (
        id, table_id, table_name, items, subtotal, discount, discount_amount,
        total, tip, total_with_tip, payments, payment_method,
        is_fiado, is_debt_payment, employee_id, employee_name, closed_at
      ) VALUES (
        ${s.id}, ${s.tableId}, ${s.tableName}, ${JSON.stringify(s.items)},
        ${s.subtotal}, ${s.discount ?? 0}, ${s.discountAmount ?? 0},
        ${s.total}, ${s.tip ?? 0}, ${s.totalWithTip},
        ${JSON.stringify(s.payments)}, ${s.paymentMethod},
        ${s.isFiado ?? false}, ${s.isDebtPayment ?? false},
        ${s.employeeId ?? null}, ${s.employeeName ?? null}, ${s.closedAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
