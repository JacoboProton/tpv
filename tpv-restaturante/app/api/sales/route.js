import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

// GET /api/sales → Sale[]
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const year = searchParams.get('year');

    let query = sql`SELECT * FROM sales`;
    const conditions = [];

    if (year) {
      const y = parseInt(year, 10);
      const start = new Date(y, 0, 1).getTime();
      const end = new Date(y + 1, 0, 1).getTime();
      conditions.push(`closed_at >= ${start}`);
      conditions.push(`closed_at < ${end}`);
    } else {
      if (from) { conditions.push(`closed_at >= ${BigInt(from)}`); }
      if (to) { conditions.push(`closed_at <= ${BigInt(to)}`); }
    }

    if (conditions.length > 0) {
      query = sql`${query} WHERE ${sql.unsafe(conditions.join(' AND '))}`;
    }
    query = sql`${query} ORDER BY closed_at DESC`;

    const rows = await query;
    const mapped = rows.map(r => ({
      id: r.id, tableId: r.table_id, tableName: r.table_name,
      items: r.items, subtotal: Number(r.subtotal),
      discount: Number(r.discount), discountAmount: Number(r.discount_amount),
      total: Number(r.total), tip: Number(r.tip), totalWithTip: Number(r.total_with_tip),
      payments: r.payments, paymentMethod: r.payment_method,
      isFiado: r.is_fiado, isDebtPayment: r.is_debt_payment,
      employeeId: r.employee_id, employeeName: r.employee_name,
      closedAt: Number(r.closed_at),
    }));
    return NextResponse.json(mapped);
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
