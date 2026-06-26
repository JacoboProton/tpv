import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const combos = await sql`
      SELECT id, name, description, price::float AS price, image, active, created_at, discount_pct::float AS discountPct
      FROM combos ORDER BY name
    `;
    const slots = await sql`
      SELECT id, combo_id, name, min_choices, max_choices, sort_order
      FROM combo_slots ORDER BY sort_order
    `;
    const slotItems = await sql`
      SELECT csi.id, csi.slot_id, csi.product_id, csi.surcharge::float AS surcharge, csi.sort_order,
             p.name AS product_name, p.price::float AS product_price
      FROM combo_slot_items csi
      JOIN products p ON p.id = csi.product_id
      ORDER BY csi.sort_order
    `;
    const itemsBySlot = {};
    for (const item of slotItems) {
      if (!itemsBySlot[item.slot_id]) itemsBySlot[item.slot_id] = [];
      itemsBySlot[item.slot_id].push(item);
    }
    const slotsByCombo = {};
    for (const s of slots) {
      if (!slotsByCombo[s.combo_id]) slotsByCombo[s.combo_id] = [];
      slotsByCombo[s.combo_id].push({ ...s, items: itemsBySlot[s.id] || [] });
    }
    const data = combos.map(c => ({
      ...c,
      active: !!c.active,
      slots: slotsByCombo[c.id] || [],
    }));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const combos = await req.json();
    await sql`DELETE FROM combo_slot_items`;
    await sql`DELETE FROM combo_slots`;
    await sql`DELETE FROM combo_items`;
    await sql`DELETE FROM combos`;

    for (const c of combos) {
      await sql`
        INSERT INTO combos (id, name, description, price, image, active, created_at, discount_pct)
        VALUES (${c.id}, ${c.name}, ${c.description || ''}, ${c.price}, ${c.image || null}, ${c.active ?? true}, ${Date.now()}, ${c.discountPct ?? 0})
      `;
      if (c.slots) {
        for (let si = 0; si < c.slots.length; si++) {
          const slot = c.slots[si];
          await sql`
            INSERT INTO combo_slots (id, combo_id, name, min_choices, max_choices, sort_order)
            VALUES (${slot.id}, ${c.id}, ${slot.name}, ${slot.minChoices ?? 1}, ${slot.maxChoices ?? 1}, ${si})
          `;
          if (slot.items) {
            for (let ii = 0; ii < slot.items.length; ii++) {
              const item = slot.items[ii];
              await sql`
                INSERT INTO combo_slot_items (id, slot_id, product_id, surcharge, sort_order)
                VALUES (${item.id}, ${slot.id}, ${item.product_id}, ${item.surcharge ?? 0}, ${ii})
              `;
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
