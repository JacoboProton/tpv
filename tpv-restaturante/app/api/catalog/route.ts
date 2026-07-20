import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, and } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { products, categories, productStock, combos, comboSlots, comboSlotItems, productPriceRules, mealMenus, mealMenuCourses, mealMenuCourseItems, mealMenuSchedules } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);

    const [rows, catRows, stockRows, comboRows, slotRows, slotItemRows, priceRuleRows] = await Promise.all([
      db.select({
        id: products.id, name: products.name, category: products.category,
        price: sql<number>`${products.price}::float`,
        ubicacion: products.ubicacion, course: products.course,
        image: products.image, allergens: products.allergens,
        description: products.description, featured: products.featured,
        active: products.active, showTpv: products.showTpv,
        showQr: products.showQr, agotado: products.agotado,
        carouselSort: products.carouselSort, type: products.type,
        inventariable: products.inventariable,
      }).from(products).where(eq(products.tenantId, tenantId)),
      db.select().from(categories).where(eq(categories.tenantId, tenantId)),
      db.select().from(productStock).where(eq(productStock.tenantId, tenantId)),
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
      db.select({
        id: productPriceRules.id, productId: productPriceRules.productId,
        name: productPriceRules.name, active: productPriceRules.active,
        days: productPriceRules.days, startTime: productPriceRules.startTime,
        endTime: productPriceRules.endTime, type: productPriceRules.type,
        value: sql<number>`${productPriceRules.value}::float`,
        createdAt: productPriceRules.createdAt,
      }).from(productPriceRules).where(eq(productPriceRules.tenantId, tenantId)),
    ]);

    const [mmRows, mmCourseRows, mmItemRows, mmSchedRows] = await Promise.all([
      db.select().from(mealMenus).where(eq(mealMenus.tenantId, tenantId)),
      db.select().from(mealMenuCourses).where(eq(mealMenuCourses.tenantId, tenantId)),
      db.select({
        id: mealMenuCourseItems.id, courseId: mealMenuCourseItems.courseId,
        productId: mealMenuCourseItems.productId,
        surcharge: sql<number>`${mealMenuCourseItems.surcharge}::float`,
        sortOrder: mealMenuCourseItems.sortOrder,
        productName: sql<string>`p.name`,
        productPrice: sql<number>`p.price::float`,
      }).from(mealMenuCourseItems)
        .leftJoin(sql`products p`, eq(mealMenuCourseItems.productId, sql`p.id`))
        .where(eq(mealMenuCourseItems.tenantId, tenantId)),
      db.select().from(mealMenuSchedules).where(eq(mealMenuSchedules.tenantId, tenantId)),
    ]);

    const stockByProduct: Record<string, Record<string, { stock: number; lowStock: number }>> = {};
    for (const s of stockRows) {
      if (!stockByProduct[s.productId]) stockByProduct[s.productId] = {};
      stockByProduct[s.productId][s.location] = { stock: s.stock, lowStock: s.lowStock };
    }
    const productsMapped = rows.map(p => ({
      ...p, stockByLocation: stockByProduct[p.id] || {},
    }));

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
    const combosMapped = comboRows.map(c => ({
      ...c, active: !!c.active, slots: slotsByCombo[c.id] || [],
    }));

    const mmItemsByCourse: Record<string, any[]> = {};
    for (const item of mmItemRows) {
      if (!mmItemsByCourse[item.courseId]) mmItemsByCourse[item.courseId] = [];
      mmItemsByCourse[item.courseId].push(item);
    }
    const mmCoursesByMenu: Record<string, any[]> = {};
    for (const c of mmCourseRows) {
      if (!mmCoursesByMenu[c.menuId]) mmCoursesByMenu[c.menuId] = [];
      mmCoursesByMenu[c.menuId].push({ ...c, items: mmItemsByCourse[c.id] || [] });
    }
    const mmSchedByMenu: Record<string, any[]> = {};
    for (const s of mmSchedRows) {
      if (!mmSchedByMenu[s.menuId]) mmSchedByMenu[s.menuId] = [];
      mmSchedByMenu[s.menuId].push(s);
    }
    const mealMenusMapped = mmRows.map(m => ({
      ...m, active: !!m.active, includesPan: !!m.includesPan,
      includesBebida: !!m.includesBebida, includesCafe: !!m.includesCafe,
      extras: typeof m.extras === 'string' ? JSON.parse(m.extras) : (m.extras || []),
      courses: mmCoursesByMenu[m.id] || [], schedules: mmSchedByMenu[m.id] || [],
    }));

    const priceRulesNormalized = priceRuleRows.map(r => ({ ...r, active: !!r.active }));
    return NextResponse.json({
      categories: catRows, products: productsMapped,
      combos: combosMapped, mealMenus: mealMenusMapped,
      priceRules: priceRulesNormalized,
    });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const { categories: catData, products: prodData, combos: comboData } = await req.json() as { categories: any[]; products: any[]; combos: any[] };
    const tenantId = getTenantId(req);

    await db.transaction(async (tx) => {
      await tx.delete(comboSlotItems).where(eq(comboSlotItems.tenantId, tenantId));
      await tx.delete(comboSlots).where(eq(comboSlots.tenantId, tenantId));
      await tx.delete(combos).where(eq(combos.tenantId, tenantId));
      await tx.delete(productStock).where(eq(productStock.tenantId, tenantId));
      await tx.delete(categories).where(eq(categories.tenantId, tenantId));

      if (catData) {
        for (let i = 0; i < catData.length; i++) {
          const cat = catData[i];
          const name = typeof cat === 'string' ? cat : cat.name;
          const sortOrder = cat.sort_order ?? i;
          const active = cat.active ?? true;
          const printerZone = cat.printer_zone ?? '';
          const showQr = cat.show_qr ?? true;
          const catId = cat.id || 'cat_' + Date.now() + '_' + i;
          await tx.insert(categories).values({
            tenantId, id: catId, name, sortOrder,
            active, printerZone, showQr,
          });
        }
      }

      if (prodData) {
        for (const p of prodData) {
          await tx.insert(products).values({
            tenantId, id: p.id, name: p.name, category: p.category,
            price: p.price, ubicacion: p.ubicacion ?? 'Bar',
            course: p.course ?? '', image: p.image ?? null,
            allergens: p.allergens ?? [], description: p.description ?? null,
            featured: p.featured ?? false, active: p.active ?? true,
            showTpv: p.show_tpv ?? true, showQr: p.show_qr ?? true,
            agotado: p.agotado ?? false, carouselSort: p.carousel_sort ?? null,
            type: p.type ?? '', inventariable: p.inventariable ?? false,
          }).onConflictDoUpdate({
            target: [products.id, products.tenantId],
            set: {
              name: sql`EXCLUDED.name`, category: sql`EXCLUDED.category`,
              price: sql`EXCLUDED.price`, ubicacion: sql`EXCLUDED.ubicacion`,
              course: sql`EXCLUDED.course`, image: sql`EXCLUDED.image`,
              allergens: sql`EXCLUDED.allergens`, description: sql`EXCLUDED.description`,
              featured: sql`EXCLUDED.featured`, active: sql`EXCLUDED.active`,
              showTpv: sql`EXCLUDED.show_tpv`, showQr: sql`EXCLUDED.show_qr`,
              agotado: sql`EXCLUDED.agotado`, carouselSort: sql`EXCLUDED.carousel_sort`,
              type: sql`EXCLUDED.type`, inventariable: sql`EXCLUDED.inventariable`,
            },
          });

          const sbl = p.stockByLocation || {};
          for (const [loc, entry] of Object.entries(sbl)) {
            const e = entry as any;
            await tx.insert(productStock).values({
              tenantId, productId: p.id, location: loc,
              stock: e.stock ?? 0, lowStock: e.lowStock ?? 5,
            }).onConflictDoUpdate({
              target: [productStock.productId, productStock.location],
              set: {
                tenantId: sql`EXCLUDED.tenant_id`,
                stock: sql`EXCLUDED.stock`, lowStock: sql`EXCLUDED.low_stock`,
              },
            });
          }
        }
      }

      if (comboData) {
        for (const c of comboData) {
          await tx.insert(combos).values({
            tenantId, id: c.id, name: c.name, description: c.description || '',
            price: c.price, image: c.image || null, active: c.active ?? true,
            createdAt: Date.now(), discountPct: c.discountPct ?? 0,
          });
          if (c.slots) {
            for (let si = 0; si < c.slots.length; si++) {
              const slot = c.slots[si];
              await tx.insert(comboSlots).values({
                tenantId, id: slot.id, comboId: c.id, name: slot.name,
                minChoices: slot.minChoices ?? 1, maxChoices: slot.maxChoices ?? 1,
                sortOrder: si,
              });
              if (slot.items) {
                for (let ii = 0; ii < slot.items.length; ii++) {
                  const item = slot.items[ii];
                  await tx.insert(comboSlotItems).values({
                    tenantId, id: item.id, slotId: slot.id, productId: item.product_id,
                    surcharge: item.surcharge ?? 0, sortOrder: ii,
                  });
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const { action, data } = await req.json() as { action: string; data: any };
    const tenantId = getTenantId(req);

    if (action === 'reorder-categories') {
      for (const cat of data) {
        await db.update(categories)
          .set({ sortOrder: cat.sort_order })
          .where(and(eq(categories.id, cat.id), eq(categories.tenantId, tenantId)));
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle-product' || action === 'update-product') {
      const { id, field, value } = data;
      const fieldMap: Record<string, any> = {
        name: { name: value },
        price: { price: value },
        description: { description: value },
        show_tpv: { showTpv: value },
        show_qr: { showQr: value },
        agotado: { agotado: value },
        course: { course: value },
        ubicacion: { ubicacion: value },
        carousel_sort: { carouselSort: value },
        sort_order: { carouselSort: value },
      };
      const setValues = fieldMap[field];
      if (!setValues) return NextResponse.json({ error: 'Campo no permitido' }, { status: 400 });
      await db.update(products)
        .set(setValues)
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle-category') {
      const { id, field, value } = data;
      const fieldMap: Record<string, any> = {
        name: { name: value },
        show_qr: { showQr: value },
        sort_order: { sortOrder: value },
      };
      const setValues = fieldMap[field];
      if (!setValues) return NextResponse.json({ error: 'Campo no permitido' }, { status: 400 });
      await db.update(categories)
        .set(setValues)
        .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)));
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete-product') {
      await db.delete(products)
        .where(and(eq(products.id, data.id), eq(products.tenantId, tenantId)));
      return NextResponse.json({ ok: true });
    }

    if (action === 'reorder-carousel') {
      for (const item of data) {
        await db.update(products)
          .set({ carouselSort: item.carousel_sort ?? null })
          .where(and(eq(products.id, item.id), eq(products.tenantId, tenantId)));
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}