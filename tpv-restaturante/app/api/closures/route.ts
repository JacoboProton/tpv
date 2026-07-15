import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`
      SELECT * FROM closures
      WHERE tenant_id = ${tenantId}
      ORDER BY closed_at DESC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    
    const body = await req.json() as any;
    if (body.action === 'delete') {
      await sql`DELETE FROM closures WHERE id = ${body.id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }
    const { id, date, total, ticket_count, avg_ticket, methods, employees, sales_ids, closed_at, employee_name, cuadratura, cuadratura_expected, cuadratura_counted, cuadratura_diff } = body;
    await sql`
      INSERT INTO closures (id, tenant_id, date, total, ticket_count, avg_ticket, methods, employees, sales_ids, closed_at, employee_name, cuadratura)
      VALUES (${id}, ${tenantId}, ${date}, ${total}, ${ticket_count}, ${avg_ticket}, ${JSON.stringify(methods)}, ${JSON.stringify(employees)}, ${sales_ids}, ${closed_at}, ${employee_name}, ${cuadratura ? JSON.stringify({ denoms: cuadratura, expected: cuadratura_expected, counted: cuadratura_counted, diff: cuadratura_diff }) : '[]'})
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        total = EXCLUDED.total,
        ticket_count = EXCLUDED.ticket_count,
        avg_ticket = EXCLUDED.avg_ticket,
        methods = EXCLUDED.methods,
        employees = EXCLUDED.employees,
        sales_ids = EXCLUDED.sales_ids,
        closed_at = EXCLUDED.closed_at,
        employee_name = EXCLUDED.employee_name,
        cuadratura = EXCLUDED.cuadratura
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
