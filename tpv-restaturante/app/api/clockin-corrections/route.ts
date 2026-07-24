import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const result = await db.execute(sql`SELECT * FROM clockin_corrections WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 200`);
    const rows = (result as any).rows;
    return apiOk(rows.map((r: any) => ({
      id: r.id, clockinId: r.clockin_id, employeeId: r.employee_id,
      employeeName: r.employee_name, requestedAction: r.requested_action,
      reason: r.reason, status: r.status, resolvedBy: r.resolved_by,
      createdAt: Number(r.created_at),
    })));
  } catch (err) { return apiError(err); }
}
