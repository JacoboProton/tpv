import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiForbidden } from '../../../../lib/infrastructure/response';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getPublicTenantId } from '../../../../lib/tenant';
import { kdsAuditLog } from '../../../../db/schema';
import { requireRole } from '../../../../lib/rbac';
import { KdsAuditBody } from '@/lib/schemas/api-schemas';

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const parsed = KdsAuditBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action, details } = body;
    if (!action) return apiBadRequest('action required');
    const db = getDb();
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiForbidden('Tenant no autorizado');
    await db.insert(kdsAuditLog).values({
      tenantId, action, details: details || {}, createdAt: Date.now(),
    });
    return apiOk();
  } catch (err) { return apiError(err); }
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '200');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const db = getDb();
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiForbidden('Tenant no autorizado');

    const filters = action
      ? and(eq(kdsAuditLog.tenantId, tenantId), eq(kdsAuditLog.action, action))
      : eq(kdsAuditLog.tenantId, tenantId);

    const rows = await db.select({
      id: kdsAuditLog.id, action: kdsAuditLog.action,
      details: kdsAuditLog.details, createdAt: kdsAuditLog.createdAt,
    }).from(kdsAuditLog)
      .where(filters)
      .orderBy(desc(kdsAuditLog.createdAt))
      .limit(limit).offset(offset);

    return apiOk(rows.map((r) => ({
      id: r.id, action: r.action,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
      createdAt: r.createdAt,
    })));
  } catch (err) { return apiError(err); }
}
