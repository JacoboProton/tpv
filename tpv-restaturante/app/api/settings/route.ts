import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { invalidateSettingsCache } from '../../../lib/settings-cache';
import { settings } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiTooManyRequests } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { rateLimit, getClientIp } from '../../../lib/rate-limit';
import { SettingsBody } from '@/lib/schemas/api-schemas';

const SECRET_KEY_RE = /(sid|token|secret|password|credential|api[-_]?key|auth)/i;

export async function GET(req: NextRequest) {
  const rl = await rateLimit(`settings:${getClientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return apiTooManyRequests();
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const auth = await requireRole(['admin'])(req);
    const isAdmin = auth.authorized;
    const rows = await db.select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(eq(settings.tenantId, tenantId));
    const result: Record<string, unknown> = {};
    for (const r of rows) {
      if (!isAdmin && SECRET_KEY_RE.test(r.key)) continue;
      result[r.key] = r.value;
    }
    return apiOk(result);
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const db = getDb();
    const parsed = SettingsBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
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
