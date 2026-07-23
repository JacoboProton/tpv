import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { productPriceRules } from '../../../db/schema';
import { requireRole } from '../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const rules = await db.select({
      id: productPriceRules.id, productId: productPriceRules.productId,
      name: productPriceRules.name, active: productPriceRules.active,
      days: productPriceRules.days, startTime: productPriceRules.startTime,
      endTime: productPriceRules.endTime, type: productPriceRules.type,
      value: productPriceRules.value, createdAt: productPriceRules.createdAt,
    }).from(productPriceRules)
      .where(eq(productPriceRules.tenantId, tenantId))
      .orderBy(productPriceRules.productId, productPriceRules.name);
    return apiOk(rules.map(r => ({ ...r, active: !!r.active })));
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const tenantId = getTenantId(req);
    const rules = await req.json();
    const db = getDb();
    await db.delete(productPriceRules).where(eq(productPriceRules.tenantId, tenantId));
    for (const r of rules) {
      await db.insert(productPriceRules).values({
        id: r.id, productId: r.product_id, name: r.name,
        active: r.active ?? true, days: r.days,
        startTime: r.start_time, endTime: r.end_time,
        type: r.type, value: r.value, createdAt: Date.now(), tenantId,
      });
    }
    return apiOk();
  } catch (err) { return apiError(err); }
}
