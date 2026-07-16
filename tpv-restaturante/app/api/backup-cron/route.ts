import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { backupAll } from '../../../lib/backup';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const expected = process.env.CRON_SECRET;
    if (expected && auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(req);
    const db = getDb();
    const backup = await backupAll();
    const backupId = `backup_${Date.now()}`;

    await db.execute(sql`
      INSERT INTO backups (tenant_id, id, data, created_at)
      VALUES (${tenantId}, ${backupId}, ${JSON.stringify(backup)}, ${Date.now()})
      ON CONFLICT (tenant_id, id) DO NOTHING
    `);

    await db.execute(sql`
      DELETE FROM backups WHERE tenant_id = ${tenantId} AND id NOT IN (
        SELECT id FROM backups WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 30
      )
    `);

    return NextResponse.json({ ok: true, backupId, exportedAt: backup.exportedAt });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
