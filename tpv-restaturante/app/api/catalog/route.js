import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);

    const [rows, categories, stockRows, comboRows, slotRows, slotItemRows, priceRules] = await Promise.all([
      sql`SELECT id, name, category, price::float AS price, ubicacion, course, image, allergens, description, featured, active, show_tpv, show_qr, agotado, carousel_sort, type, inventariable FROM products WHERE tenant_id = ${tenantId} ORDER BY category, name`,
      sql`SELECT id, name, sort_order, active, printer_zone, show_qr FROM categories WHERE tenant_id = ${tenantId} ORDER BY sort_order, name`,
      sql`SELECT * FROM product_stock WHERE tenant_id = ${tenantId} ORDER BY product_id, location`,
      sql`SELECT id, name, description, price::float AS price, image, active, created_at, discount_pct::float AS "discountPct" FROM combos WHERE tenant_id = ${tenantId} ORDER BY name`,
      sql`SELECT id, combo_id, name, min_choices, max_choices, sort_order FROM combo_slots WHERE tenant_id = ${tenantId} ORDER BY sort_order`,
      sql`SELECT csi.id, csi.slot_id, csi.product_id, csi.surcharge::float AS surcharge, csi.sort_order, p.name AS product_name, p.price::float AS product_price FROM combo_slot_items csi JOIN products p ON p.id = csi.product_id WHERE csi.tenant_id = ${tenantId} ORDER BY csi.sort_order`,
      sql`SELECT id, product_id, name, active, days, start_time, end_time, type, value::float AS value, created_at FROM product_price_rules WHERE tenant_id = ${tenantId} ORDER BY product_id, name`,
    ]);

    const [mealMenuRows, mmCourseRows, mmItemRows, mmSchedRows] = await Promise.all([
      sql`SELECT * FROM meal_menus WHERE tenant_id = ${tenantId} ORDER BY name`,
      sql`SELECT * FROM meal_menu_courses WHERE tenant_id = ${tenantId} ORDER BY sort_order`,
      sql`SELECT mmci.id, mmci.course_id, mmci.product_id, mmci.surcharge::float AS surcharge, mmci.sort_order, p.name AS product_name, p.price::float AS product_price FROM meal_menu_course_items mmci JOIN products p ON p.id = mmci.product_id WHERE mmci.tenant_id = ${tenantId} ORDER BY mmci.sort_order`,
      sql`SELECT * FROM meal_menu_schedules WHERE tenant_id = ${tenantId} ORDER BY day_of_week, start_time`,
    ]);

    const stockByProduct = {};
    for (const s of stockRows) {
      if (!stockByProduct[s.product_id]) stockByProduct[s.product_id] = {};
      stockByProduct[s.product_id][s.location] = { stock: s.stock, lowStock: s.low_stock };
    }
    const products = rows.map(p => ({
      ...p,
      stockByLocation: stockByProduct[p.id] || {},
    }));

    const itemsBySlot = {};
    for (const item of slotItemRows) {
      if (!itemsBySlot[item.slot_id]) itemsBySlot[item.slot_id] = [];
      itemsBySlot[item.slot_id].push(item);
    }
    const slotsByCombo = {};
    for (const s of slotRows) {
      if (!slotsByCombo[s.combo_id]) slotsByCombo[s.combo_id] = [];
      slotsByCombo[s.combo_id].push({ ...s, items: itemsBySlot[s.id] || [] });
    }
    const combos = comboRows.map(c => ({
      ...c, active: !!c.active, slots: slotsByCombo[c.id] || [],
    }));

    const mmItemsByCourse = {};
    for (const item of mmItemRows) {
      if (!mmItemsByCourse[item.course_id]) mmItemsByCourse[item.course_id] = [];
      mmItemsByCourse[item.course_id].push(item);
    }
    const mmCoursesByMenu = {};
    for (const c of mmCourseRows) {
      if (!mmCoursesByMenu[c.menu_id]) mmCoursesByMenu[c.menu_id] = [];
      mmCoursesByMenu[c.menu_id].push({ ...c, items: mmItemsByCourse[c.id] || [] });
    }
    const mmSchedByMenu = {};
    for (const s of mmSchedRows) {
      if (!mmSchedByMenu[s.menu_id]) mmSchedByMenu[s.menu_id] = [];
      mmSchedByMenu[s.menu_id].push(s);
    }
    const mealMenus = mealMenuRows.map(m => ({
      ...m, active: !!m.active, includes_pan: !!m.includes_pan,
      includes_bebida: !!m.includes_bebida, includes_cafe: !!m.includes_cafe,
      extras: typeof m.extras === 'string' ? JSON.parse(m.extras) : (m.extras || []),
      courses: mmCoursesByMenu[m.id] || [], schedules: mmSchedByMenu[m.id] || [],
    }));

    const priceRulesNormalized = priceRules.map(r => ({ ...r, active: !!r.active }));
    return NextResponse.json({ categories, products, combos, mealMenus, priceRules: priceRulesNormalized });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { categories, products, combos } = await req.json();
    const tenantId = getTenantId(req);

    await sql`DELETE FROM combo_items WHERE tenant_id = ${tenantId}`;
    await sql`DELETE FROM combos WHERE tenant_id = ${tenantId}`;

    if (categories) {
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const name = typeof cat === 'string' ? cat : cat.name;
        const sortOrder = cat.sort_order ?? i;
        const active = cat.active ?? true;
        const printerZone = cat.printer_zone ?? '';
        const showQr = cat.show_qr ?? true;
        const catId = cat.id || 'cat_' + Date.now() + '_' + i;
        await sql`
          INSERT INTO categories (tenant_id, id, name, sort_order, active, printer_zone, show_qr)
          VALUES (${tenantId}, ${catId}, ${name}, ${sortOrder}, ${active}, ${printerZone}, ${showQr})
          ON CONFLICT (tenant_id, id) DO UPDATE SET
            name = EXCLUDED.name,
            sort_order = EXCLUDED.sort_order,
            active = EXCLUDED.active,
            printer_zone = EXCLUDED.printer_zone,
            show_qr = EXCLUDED.show_qr
        `;
      }
    }

    const queries = [];
    if (products) {
      for (const p of products) {
        queries.push(sql`
          INSERT INTO products (tenant_id, id, name, category, price, ubicacion, course, image, allergens, description, featured, active, show_tpv, show_qr, agotado, carousel_sort, type, inventariable)
          VALUES (${tenantId}, ${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.ubicacion ?? 'Bar'}, ${p.course ?? ''}, ${p.image ?? null}, ${p.allergens ?? []}, ${p.description ?? null}, ${p.featured ?? false}, ${p.active ?? true}, ${p.show_tpv ?? true}, ${p.show_qr ?? true}, ${p.agotado ?? false}, ${p.carousel_sort ?? null}, ${p.type ?? ''}, ${p.inventariable ?? false})
          ON CONFLICT (tenant_id, id) DO UPDATE SET
            name = EXCLUDED.name, category = EXCLUDED.category, price = EXCLUDED.price,
            ubicacion = EXCLUDED.ubicacion, course = EXCLUDED.course, image = EXCLUDED.image,
            allergens = EXCLUDED.allergens, description = EXCLUDED.description,
            featured = EXCLUDED.featured, active = EXCLUDED.active,
            show_tpv = EXCLUDED.show_tpv, show_qr = EXCLUDED.show_qr,
            agotado = EXCLUDED.agotado, carousel_sort = EXCLUDED.carousel_sort,
            type = EXCLUDED.type, inventariable = EXCLUDED.inventariable
        `);
        const sbl = p.stockByLocation || {};
        const locs = Object.keys(sbl);
        if (locs.length > 0) {
          for (const loc of locs) {
            const entry = sbl[loc] || { stock: 0, lowStock: 5 };
            queries.push(sql`
              INSERT INTO product_stock (tenant_id, product_id, location, stock, low_stock)
              VALUES (${tenantId}, ${p.id}, ${loc}, ${entry.stock ?? 0}, ${entry.lowStock ?? 5})
              ON CONFLICT (tenant_id, product_id, location) DO UPDATE SET
                stock = EXCLUDED.stock, low_stock = EXCLUDED.low_stock
            `);
          }
        }
      }
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    if (combos) {
      await sql`DELETE FROM combo_slot_items WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM combo_slots WHERE tenant_id = ${tenantId}`;
      for (const c of combos) {
        await sql`
          INSERT INTO combos (tenant_id, id, name, description, price, image, active, created_at, discount_pct)
          VALUES (${tenantId}, ${c.id}, ${c.name}, ${c.description || ''}, ${c.price}, ${c.image || null}, ${c.active ?? true}, ${Date.now()}, ${c.discountPct ?? 0})
        `;
        if (c.slots) {
          for (let si = 0; si < c.slots.length; si++) {
            const slot = c.slots[si];
            await sql`
              INSERT INTO combo_slots (tenant_id, id, combo_id, name, min_choices, max_choices, sort_order)
              VALUES (${tenantId}, ${slot.id}, ${c.id}, ${slot.name}, ${slot.minChoices ?? 1}, ${slot.maxChoices ?? 1}, ${si})
            `;
            if (slot.items) {
              for (let ii = 0; ii < slot.items.length; ii++) {
                const item = slot.items[ii];
                await sql`
                  INSERT INTO combo_slot_items (tenant_id, id, slot_id, product_id, surcharge, sort_order)
                  VALUES (${tenantId}, ${item.id}, ${slot.id}, ${item.product_id}, ${item.surcharge ?? 0}, ${ii})
                `;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { action, data } = await req.json();
    const tenantId = getTenantId(req);

    if (action === 'reorder-categories') {
      for (const cat of data) {
        await sql`UPDATE categories SET sort_order = ${cat.sort_order} WHERE id = ${cat.id} AND tenant_id = ${tenantId}`;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle-product') {
      const { id, field, value } = data;
      await sql`UPDATE products SET ${sql(field)} = ${value} WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle-category') {
      const { id, field, value } = data;
      await sql`UPDATE categories SET ${sql(field)} = ${value} WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update-product') {
      const { id, field, value } = data;
      await sql`UPDATE products SET ${sql(field)} = ${value} WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete-product') {
      await sql`DELETE FROM products WHERE id = ${data.id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'reorder-carousel') {
      for (const item of data) {
        if (item.carousel_sort === null || item.carousel_sort === undefined) {
          await sql`UPDATE products SET carousel_sort = NULL WHERE id = ${item.id} AND tenant_id = ${tenantId}`;
        } else {
          await sql`UPDATE products SET carousel_sort = ${item.carousel_sort} WHERE id = ${item.id} AND tenant_id = ${tenantId}`;
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
