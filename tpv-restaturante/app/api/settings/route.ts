import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { invalidateSettingsCache } from '../../../lib/settings-cache';
import { settings } from '../../../db/schema';
import { apiOk, apiError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(eq(settings.tenantId, tenantId));
    const result: Record<string, unknown> = {};
    for (const r of rows) result[r.key] = r.value;
    return apiOk(result);
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const db = getDb();
    const body = await req.json() as any;
    const tenantId = getTenantId(req);
    for (const [key, value] of Object.entries(body)) {
      await db.insert(settings).values({
        tenantId, key, value: String(value),
      }).onConflictDoUpdate({
        target: settings.key,
        set: { tenantId, value: String(value) },
      });
    }
    invalidateSettingsCache();
    return apiOk();
  } catch (err) { return apiError(err); }
}
