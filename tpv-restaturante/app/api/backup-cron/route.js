import { NextResponse } from 'next/server';
import { backupAll } from '../../../lib/migrate';
import { sql } from '../../../lib/db';

export async function GET(req) {
  try {
    // Verify cron secret so only authorized callers can trigger
    const auth = req.headers.get('authorization');
    const expected = process.env.CRON_SECRET;
    if (expected && auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backup = await backupAll();
    const backupId = `backup_${Date.now()}`;

    // Store in a backups table (or we can store in DB as JSON)
    await sql`
      INSERT INTO backups (id, data, created_at)
      VALUES (${backupId}, ${JSON.stringify(backup)}, ${Date.now()})
      ON CONFLICT (id) DO NOTHING
    `;

    // Clean old backups (keep last 30)
    await sql`
      DELETE FROM backups WHERE id NOT IN (
        SELECT id FROM backups ORDER BY created_at DESC LIMIT 30
      )
    `;

    return NextResponse.json({ ok: true, backupId, exportedAt: backup.exportedAt });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
