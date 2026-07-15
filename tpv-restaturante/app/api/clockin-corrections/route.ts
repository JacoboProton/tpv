import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`SELECT * FROM clockin_corrections WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 200`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, clockinId: r.clockin_id, employeeId: r.employee_id,
      employeeName: r.employee_name, requestedAction: r.requested_action,
      reason: r.reason, status: r.status, resolvedBy: r.resolved_by,
      createdAt: Number(r.created_at),
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
