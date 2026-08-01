import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { offers } from '../../../db/schema';
import { requireRole } from '../../../lib/rbac';
import { OffersBody } from '@/lib/schemas/api-schemas';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select({
      id: offers.id, name: offers.name, type: offers.type,
      days: offers.days,
      startHour: offers.startHour, endHour: offers.endHour,
      discountPct: sql<number>`${offers.discountPct}::float`,
      fixedPrice: sql<number>`${offers.fixedPrice}::float`,
      productIds: offers.productIds,
      active: offers.active,
    }).from(offers)
      .where(eq(offers.tenantId, tenantId));
    return apiOk(rows);
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = OffersBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const data = parsed.data;
    await db.delete(offers).where(eq(offers.tenantId, tenantId));
    for (const o of data) {
      await db.insert(offers).values({
        id: o.id, name: o.name, type: o.type, days: o.days ?? [1, 2, 3, 4, 5],
        startHour: Number(o.startHour ?? 13), endHour: Number(o.endHour ?? 16),
        discountPct: o.discountPct != null ? String(o.discountPct) : '15',
        fixedPrice: o.fixedPrice != null ? String(o.fixedPrice) : null,
        productIds: o.productIds ?? [''], active: o.active ?? true, tenantId,
      });
    }
    return apiOk();
  } catch (err) { return apiError(err); }
}
