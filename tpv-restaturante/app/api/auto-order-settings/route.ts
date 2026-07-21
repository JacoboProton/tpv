import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError } from '../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const rows = await db.execute(sql`SELECT * FROM auto_order_settings WHERE tenant_id = ${tenantId}`);
    const obj = Object.fromEntries((rows as any).rows.map((r: any) => [r.key, r.value]));
    return apiOk(obj);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
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
