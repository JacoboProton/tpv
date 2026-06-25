import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const groups = await sql`
      SELECT id, name, type, required FROM modifier_groups ORDER BY name
    `;
    const options = await sql`
      SELECT id, group_id, name, price_delta::float, is_default, sort_order
      FROM modifier_options ORDER BY sort_order, name
    `;
    const associations = await sql`
      SELECT product_id, group_id FROM product_modifiers
    `;
    const data = groups.map(g => ({
      ...g,
      options: options.filter(o => o.group_id === g.id).map(o => ({ ...o, is_default: !!o.is_default })),
    }));
    const byProduct = {};
    for (const a of associations) {
      if (!byProduct[a.product_id]) byProduct[a.product_id] = [];
      byProduct[a.product_id].push(a.group_id);
    }
    return NextResponse.json({ groups: data, productModifiers: byProduct });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { groups, productModifiers } = await req.json();

    await sql`DELETE FROM modifier_options`;
    await sql`DELETE FROM product_modifiers`;
    await sql`DELETE FROM modifier_groups`;

    for (const g of groups) {
      await sql`
        INSERT INTO modifier_groups (id, name, type, required)
        VALUES (${g.id}, ${g.name}, ${g.type || 'single'}, ${g.required || false})
      `;
      if (g.options) {
        for (let i = 0; i < g.options.length; i++) {
          const o = g.options[i];
          await sql`
            INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order)
            VALUES (${o.id}, ${g.id}, ${o.name}, ${o.priceDelta || 0}, ${o.isDefault || false}, ${i})
          `;
        }
      }
    }

    for (const [productId, groupIds] of Object.entries(productModifiers || {})) {
      for (const groupId of groupIds) {
        await sql`
          INSERT INTO product_modifiers (product_id, group_id)
          VALUES (${productId}, ${groupId})
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
