import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';
import { requireAdminPin } from '../../../lib/rbac';

// POST /api/reset-orders → elimina y recrea la tabla orders con el esquema correcto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const adminCheck = await requireAdminPin(req, body.adminPin);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    // Backup orders before dropping
    const backup = await sql`SELECT * FROM orders`;
    const backupId = 'backup_orders_' + Date.now();
    await sql`
      INSERT INTO backups (id, data, created_at)
      VALUES (${backupId}, ${JSON.stringify(backup)}, ${Date.now()})
      ON CONFLICT (id) DO NOTHING
    `;

    await sql`DROP TABLE IF EXISTS orders CASCADE`;
    await sql`
      CREATE TABLE orders (
        id            TEXT   PRIMARY KEY,
        table_id      TEXT   NOT NULL,
        items         JSONB  NOT NULL DEFAULT '[]',
        created_at    BIGINT NOT NULL,
        employee_name TEXT
      )
    `;
    return NextResponse.json({ ok: true, message: 'Tabla orders recreada correctamente', backedUp: backup.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
