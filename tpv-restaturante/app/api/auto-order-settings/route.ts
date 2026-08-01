import { NextRequest } from 'next/server';
import { sql, SQL } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { AutoOrderSettingsBody } from '@/lib/schemas/api-schemas';
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
    const rows = await qr(sql`SELECT * FROM auto_order_settings WHERE tenant_id = ${tenantId}`);
    const obj = Object.fromEntries(rows.map((r: Row) => [String(r.key), r.value]));
    return apiOk(obj);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const parsed = AutoOrderSettingsBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const tenantId = getTenantId(req);
    const db = getDb();
    for (const [key, value] of Object.entries(body)) {
      await db.execute(sql`
        INSERT INTO auto_order_settings (tenant_id, key, value) VALUES (${tenantId}, ${key}, ${String(value)})
        ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value
      `);
    }
    return apiOk();
  } catch (err) { return apiError(err); }
}
