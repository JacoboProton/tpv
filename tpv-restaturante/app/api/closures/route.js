import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM closures
      WHERE tenant_id = 'default'
      ORDER BY closed_at DESC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, date, total, ticket_count, avg_ticket, methods, employees, sales_ids, closed_at, employee_name } = body;
    await sql`
      INSERT INTO closures (id, tenant_id, date, total, ticket_count, avg_ticket, methods, employees, sales_ids, closed_at, employee_name)
      VALUES (${id}, 'default', ${date}, ${total}, ${ticket_count}, ${avg_ticket}, ${JSON.stringify(methods)}, ${JSON.stringify(employees)}, ${sales_ids}, ${closed_at}, ${employee_name})
      ON CONFLICT (id) DO UPDATE SET
        total = EXCLUDED.total,
        ticket_count = EXCLUDED.ticket_count,
        avg_ticket = EXCLUDED.avg_ticket,
        methods = EXCLUDED.methods,
        employees = EXCLUDED.employees,
        sales_ids = EXCLUDED.sales_ids,
        closed_at = EXCLUDED.closed_at,
        employee_name = EXCLUDED.employee_name
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
