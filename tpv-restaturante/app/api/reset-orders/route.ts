import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
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

    const backup = await db.select().from(orders);
    const backupId = 'backup_orders_' + Date.now();
    await db.execute(sql`
      INSERT INTO backups (id, data, created_at)
      VALUES (${backupId}, ${JSON.stringify(backup)}, ${Date.now()})
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`DROP TABLE IF EXISTS orders CASCADE`);
    await db.execute(sql`
      CREATE TABLE orders (
        id            TEXT   PRIMARY KEY,
        table_id      TEXT   NOT NULL,
        items         JSONB  NOT NULL DEFAULT '[]',
        created_at    BIGINT NOT NULL,
        employee_name TEXT
      )
    `);
    return apiOk({ message: 'Tabla orders recreada correctamente', backedUp: backup.length });
  } catch (err) { return apiError(err); }
}
