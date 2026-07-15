import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { combos, comboSlots, comboSlotItems, comboItems } from '../../../db/schema';

export async function GET(req: NextRequest) {
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

    const itemsBySlot: Record<string, any[]> = {};
    for (const item of slotItemRows) {
      if (!itemsBySlot[item.slotId]) itemsBySlot[item.slotId] = [];
      itemsBySlot[item.slotId].push(item);
    }
    const slotsByCombo: Record<string, any[]> = {};
    for (const s of slotRows) {
      if (!slotsByCombo[s.comboId]) slotsByCombo[s.comboId] = [];
      slotsByCombo[s.comboId].push({ ...s, items: itemsBySlot[s.id] || [] });
    }
    const data = comboRows.map(c => ({
      ...c, active: !!c.active, slots: slotsByCombo[c.id] || [],
    }));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const data = await req.json() as any[];

    await db.transaction(async (tx) => {
      await tx.delete(comboSlotItems).where(eq(comboSlotItems.tenantId, tenantId));
      await tx.delete(comboSlots).where(eq(comboSlots.tenantId, tenantId));
      await tx.delete(comboItems).where(eq(comboItems.tenantId, tenantId));
      await tx.delete(combos).where(eq(combos.tenantId, tenantId));

      for (const c of data) {
        await tx.insert(combos).values({
          id: c.id, name: c.name, description: c.description || '',
          price: c.price, image: c.image || null, active: c.active ?? true,
          createdAt: Date.now(), discountPct: c.discountPct ?? 0, tenantId,
        });
        if (c.slots) {
          for (let si = 0; si < c.slots.length; si++) {
            const slot = c.slots[si];
            await tx.insert(comboSlots).values({
              id: slot.id, comboId: c.id, name: slot.name,
              minChoices: slot.minChoices ?? 1, maxChoices: slot.maxChoices ?? 1,
              sortOrder: si, tenantId,
            });
            if (slot.items) {
              for (let ii = 0; ii < slot.items.length; ii++) {
                const item = slot.items[ii];
                await tx.insert(comboSlotItems).values({
                  id: item.id, slotId: slot.id, productId: item.product_id,
                  surcharge: item.surcharge ?? 0, sortOrder: ii, tenantId,
                });
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
