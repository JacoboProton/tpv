import { NextRequest } from 'next/server';
import { sql, SQL } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { TimeOffBody } from '@/lib/schemas/api-schemas';

type Row = Record<string, unknown>;

async function qr(query: SQL): Promise<Row[]> {
  const db = getDb();
  return db.execute(query).then((r: { rows: Row[] }) => r.rows);
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const db = getDb();

    let query = sql`SELECT * FROM time_off_requests WHERE tenant_id = ${tenantId}`;
    const conds: ReturnType<typeof sql>[] = [];
    if (employeeId) conds.push(sql`employee_id = ${employeeId}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY created_at DESC LIMIT 500`;

    const rows = await qr(query);
    return apiOk(rows.map((r) => ({
      id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
      reason: r.reason, fromDate: r.from_date, toDate: r.to_date,
      notes: r.notes, status: r.status,
      resolvedBy: r.resolved_by, resolvedNote: r.resolved_note,
      createdAt: Number(r.created_at), resolvedAt: r.resolved_at ? Number(r.resolved_at) : null,
    })));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const parsed = TimeOffBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action } = body;
    const db = getDb();

    if (action === 'create') {
      const { employeeId, employeeName, reason, fromDate, toDate, notes } = body;
      const id = 'off_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await db.execute(sql`
        INSERT INTO time_off_requests (tenant_id, id, employee_id, employee_name, reason, from_date, to_date, notes, status, created_at)
        VALUES (${tenantId}, ${id}, ${employeeId}, ${employeeName}, ${reason}, ${fromDate}, ${toDate}, ${notes || ''}, 'pending', ${Date.now()})
      `);
      return apiOk({ ok: true, id });
    }

    if (action === 'resolve') {
      const { id, status, resolvedBy, resolvedNote } = body;
      await db.execute(sql`
        UPDATE time_off_requests SET status=${status}, resolved_by=${resolvedBy || ''},
          resolved_note=${resolvedNote || ''}, resolved_at=${Date.now()}
        WHERE id=${id} AND tenant_id = ${tenantId}
      `);
      return apiOk();
    }

    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}
