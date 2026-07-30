import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { backupAll } from '../../../lib/backup';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError, apiUnauthorized } from '../../../lib/infrastructure/response';

// SIN requireRole — endpoint invocado por cron externo (Render Cron Jobs)
// sin sesión de usuario. Se autentica con CRON_SECRET vía header
// Authorization: Bearer.
function requireCronSecret(): string {
  const val = process.env.CRON_SECRET;
  if (!val) throw new Error('Falta variable de entorno: CRON_SECRET');
  return val;
}

export async function GET(_req: NextRequest) {
  try {
    const expected = requireCronSecret();
    const auth = _req.headers.get('authorization');
    if (auth !== `Bearer ${expected}`) {
      return apiUnauthorized('Unauthorized');
    }

    const tenantId = getTenantId(_req);
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

    return apiOk({ ok: true, backupId, exportedAt: backup.exportedAt });
  } catch (err) { return apiError(err); }
}
