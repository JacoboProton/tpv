import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { requireAdminPin } from '../../../lib/rbac';
import { orders } from '../../../db/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const adminCheck = await requireAdminPin(req, body.adminPin);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
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
    return NextResponse.json({ ok: true, message: 'Tabla orders recreada correctamente', backedUp: backup.length });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
