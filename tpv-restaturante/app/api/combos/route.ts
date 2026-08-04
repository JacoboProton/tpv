import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { combos, comboSlots, comboSlotItems, comboItems } from '../../../db/schema';
import { requireRole } from '../../../lib/rbac';
import { withIdempotency } from '../../../lib/idempotency';
import { CombosBody } from '@/lib/schemas/api-schemas';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const [comboRows, slotRows, slotItemRows] = await Promise.all([
      db.select({
        id: combos.id, name: combos.name, description: combos.description,
        price: sql<number>`${combos.price}::float`, image: combos.image,
        active: combos.active, createdAt: combos.createdAt,
        discountPct: sql<number>`${combos.discountPct}::float`,
      }).from(combos).where(eq(combos.tenantId, tenantId)),
      db.select().from(comboSlots).where(eq(comboSlots.tenantId, tenantId)),
      db.select({
        id: comboSlotItems.id, slotId: comboSlotItems.slotId,
        productId: comboSlotItems.productId,
        surcharge: sql<number>`${comboSlotItems.surcharge}::float`,
        sortOrder: comboSlotItems.sortOrder,
        productName: sql<string>`p.name`,
        productPrice: sql<number>`p.price::float`,
      }).from(comboSlotItems)
        .leftJoin(sql`products p`, eq(comboSlotItems.productId, sql`p.id`))
        .where(eq(comboSlotItems.tenantId, tenantId)),
    ]);

    const itemsBySlot: Record<string, typeof slotItemRows[number][]> = {};
    for (const item of slotItemRows) {
      if (!itemsBySlot[item.slotId]) itemsBySlot[item.slotId] = [];
      itemsBySlot[item.slotId].push(item);
    }
    const slotsByCombo: Record<string, (typeof slotRows[number] & { items: typeof slotItemRows[number][] })[]> = {};
    for (const s of slotRows) {
      if (!slotsByCombo[s.comboId]) slotsByCombo[s.comboId] = [];
      slotsByCombo[s.comboId].push({ ...s, items: itemsBySlot[s.id] || [] });
    }
    const data = comboRows.map((c) => ({
      ...c, active: !!c.active, slots: slotsByCombo[c.id] || [],
    }));
    return apiOk(data);
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  return withIdempotency(req, '/api/combos', async () => {
    try {
      const db = getDb();
      const tenantId = getTenantId(req);
      const parsed = CombosBody.safeParse(await req.json());
      if (!parsed.success) return apiBadRequest(parsed.error.message);
      const data = parsed.data as Array<{
        id: string; name: string; description?: string; price: number; image?: string | null;
        active?: boolean; discountPct?: number;
        slots?: Array<{
          id: string; name: string; minChoices?: number; maxChoices?: number;
          items?: Array<{ id: string; product_id?: string; surcharge?: number }>;
        }>;
      }>;

      await db.transaction(async (tx) => {
        await tx.delete(comboSlotItems).where(eq(comboSlotItems.tenantId, tenantId));
        await tx.delete(comboSlots).where(eq(comboSlots.tenantId, tenantId));
        await tx.delete(comboItems).where(eq(comboItems.tenantId, tenantId));
        await tx.delete(combos).where(eq(combos.tenantId, tenantId));

        for (const c of data) {
          await tx.insert(combos).values({
            id: c.id, name: c.name, description: c.description || '',
            price: String(c.price), image: c.image || null, active: c.active ?? true,
            createdAt: Date.now(), discountPct: String(c.discountPct ?? 0), tenantId,
          });
          const slots = c.slots;
          if (slots) {
            for (let si = 0; si < slots.length; si++) {
              const slot = slots[si];
              await tx.insert(comboSlots).values({
                id: slot.id, comboId: c.id, name: slot.name,
                minChoices: slot.minChoices ?? 1, maxChoices: slot.maxChoices ?? 1,
                sortOrder: si, tenantId,
              });
              const slotItems = slot.items;
              if (slotItems) {
                for (let ii = 0; ii < slotItems.length; ii++) {
                  const item = slotItems[ii];
                  await tx.insert(comboSlotItems).values({
                    id: item.id, slotId: slot.id, productId: item.product_id ?? '',
                    surcharge: String(item.surcharge ?? 0), sortOrder: ii, tenantId,
                  });
                }
              }
            }
          }
        }
      });

      return apiOk();
    } catch (err) { return apiError(err); }
  });
}
