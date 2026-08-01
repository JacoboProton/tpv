import { NextRequest } from 'next/server';
import { sql, SQL } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';

type Row = Record<string, unknown>;

async function qr(query: SQL): Promise<Row[]> {
  const db = getDb();
  return db.execute(query).then((r: { rows: Row[] }) => r.rows);
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const rows = await qr(sql`SELECT * FROM clockin_corrections WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 200`);
    return apiOk(rows.map((r) => ({
      id: r.id, clockinId: r.clockin_id, employeeId: r.employee_id,
      employeeName: r.employee_name, requestedAction: r.requested_action,
      reason: r.reason, status: r.status, resolvedBy: r.resolved_by,
      createdAt: Number(r.created_at),
    })));
  } catch (err) { return apiError(err); }
}
