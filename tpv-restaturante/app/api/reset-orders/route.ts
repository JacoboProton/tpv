import { NextRequest } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { requireAdminPin } from '../../../lib/rbac';
import { orders } from '../../../db/schema';
import { apiOk, apiError } from '../../../lib/infrastructure/response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const adminCheck = await requireAdminPin(req, body.adminPin);
    if (!adminCheck.authorized) {
      return apiError(new Error(adminCheck.error), adminCheck.status);
    }

    const db = getDb();
    const tenantId = getTenantId(req);

    const backup = await db.select().from(orders).where(eq(orders.tenantId, tenantId));
    const backupId = 'backup_orders_' + Date.now();
    await db.execute(sql`
      INSERT INTO backups (id, data, created_at)
      VALUES (${backupId}, ${JSON.stringify(backup)}, ${Date.now()})
      ON CONFLICT (id) DO NOTHING
    `);

    await db.delete(orders).where(eq(orders.tenantId, tenantId));
    return apiOk({ message: `Órdenes del tenant ${tenantId} eliminadas`, backedUp: backup.length });
  } catch (err) { return apiError(err); }
}
