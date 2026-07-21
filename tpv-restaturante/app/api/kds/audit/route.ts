import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest } from '../../../../lib/infrastructure/response';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { kdsAuditLog } from '../../../../db/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { action, details } = body;
    if (!action) return apiBadRequest('action required');
    const db = getDb();
    const tenantId = getTenantId(req);
    await db.insert(kdsAuditLog).values({
      tenantId, action, details: details || {}, createdAt: Date.now(),
    });
    return apiOk();
  } catch (err) { return apiError(err); }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '200');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const db = getDb();
    const tenantId = getTenantId(req);

    let filters = eq(kdsAuditLog.tenantId, tenantId);
    if (action) filters = and(filters, eq(kdsAuditLog.action, action));

    const rows = await db.select({
      id: kdsAuditLog.id, action: kdsAuditLog.action,
      details: kdsAuditLog.details, createdAt: kdsAuditLog.createdAt,
    }).from(kdsAuditLog)
      .where(filters)
      .orderBy(desc(kdsAuditLog.createdAt))
      .limit(limit).offset(offset);

    return apiOk(rows.map(r => ({
      id: r.id, action: r.action,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
      createdAt: r.createdAt,
    })));
  } catch (err) { return apiError(err); }
}
