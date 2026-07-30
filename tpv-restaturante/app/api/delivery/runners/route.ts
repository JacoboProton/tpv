import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { deliveryRunners } from '../../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized } from '../../../../lib/infrastructure/response';
import { requireRole } from '../../../../lib/rbac';
import { DeliveryRunnerBody, IdBody } from '@/lib/schemas/api-schemas';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const rows = await db.select().from(deliveryRunners)
      .where(eq(deliveryRunners.tenantId, tenantId))
      .orderBy(deliveryRunners.name);
    return apiOk(rows);
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const parsed = z.array(DeliveryRunnerBody).safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const runners = parsed.data;
    const db = getDb();
    for (const r of runners) {
      if (r.id) {
        await db.insert(deliveryRunners).values({
          id: r.id, name: r.name, phone: r.phone || '',
          active: r.active, createdAt: Date.now(), tenantId,
        }).onConflictDoUpdate({
          target: deliveryRunners.id,
          set: { name: sql`EXCLUDED.name`, phone: sql`EXCLUDED.phone`, active: sql`EXCLUDED.active` },
        });
      }
    }
    return apiOk();
  } catch (err) { return apiError(err); }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const parsed = IdBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const { id } = parsed.data;
    const db = getDb();
    await db.delete(deliveryRunners)
      .where(eq(deliveryRunners.id, id));
    return apiOk();
  } catch (err) { return apiError(err); }
}
