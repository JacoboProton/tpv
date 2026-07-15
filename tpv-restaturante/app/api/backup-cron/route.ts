import { NextRequest, NextResponse } from 'next/server';
import { backupAll } from '../../../lib/migrate';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret so only authorized callers can trigger
    const auth = req.headers.get('authorization');
    const expected = process.env.CRON_SECRET;
    if (expected && auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(req);
    const backup = await backupAll();
    const backupId = `backup_${Date.now()}`;

    // Store in a backups table (or we can store in DB as JSON)
    await sql`
      INSERT INTO backups (tenant_id, id, data, created_at)
      VALUES (${tenantId}, ${backupId}, ${JSON.stringify(backup)}, ${Date.now()})
      ON CONFLICT (tenant_id, id) DO NOTHING
    `;

    // Clean old backups (keep last 30)
    await sql`
      DELETE FROM backups WHERE tenant_id = ${tenantId} AND id NOT IN (
        SELECT id FROM backups WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 30
      )
    `;

    return NextResponse.json({ ok: true, backupId, exportedAt: backup.exportedAt });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
