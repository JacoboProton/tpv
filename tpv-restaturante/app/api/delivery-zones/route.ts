import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { deliveryZones } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select().from(deliveryZones)
      .where(eq(deliveryZones.tenantId, tenantId));
    return apiOk(rows);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const id = 'dz_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await db.insert(deliveryZones).values({
      id, name: body.name,
      radiusKm: body.radiusKm || 0, cost: body.cost || 0,
      minOrder: body.minOrder || 0,
      estimatedMinutes: body.estimatedMinutes || 30,
      active: body.active !== false,
      createdAt: Date.now(), tenantId,
    });
    return apiOk({ ok: true, id });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    await db.update(deliveryZones).set({
      name: body.name, radiusKm: body.radiusKm || 0,
      cost: body.cost || 0, minOrder: body.minOrder || 0,
      estimatedMinutes: body.estimatedMinutes || 30,
      active: body.active !== false,
    }).where(eq(deliveryZones.id, body.id));
    return apiOk();
  } catch (err) { return apiError(err); }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { id } = await req.json() as any;
    await db.delete(deliveryZones).where(and(eq(deliveryZones.id, id), eq(deliveryZones.tenantId, tenantId)));
    return apiOk();
  } catch (err) { return apiError(err); }
}
