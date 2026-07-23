import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { requireRole } from '../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('categories','products','tables','orders','sales','employees','access_logs')
      ORDER BY table_name, ordinal_position
    `);
    const rows = (result as any).rows;
    const byTable: Record<string, any> = {};
    for (const r of rows) {
      if (!byTable[r.table_name]) byTable[r.table_name] = [];
      byTable[r.table_name].push(`${r.column_name} (${r.data_type})`);
    }
    return apiOk(byTable);
  } catch (err) { return apiError(err); }
}
