import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const groups = await sql`
      SELECT id, name, type, required FROM modifier_groups WHERE tenant_id = ${tenantId} ORDER BY name
    `;
    const options = await sql`
      SELECT id, group_id, name, price_delta::float, is_default, sort_order,
        stock_deduct, stock_article_id, stock_quantity::float
      FROM modifier_options WHERE tenant_id = ${tenantId} ORDER BY sort_order, name
    `;
    const associations = await sql`
      SELECT product_id, group_id FROM product_modifiers WHERE tenant_id = ${tenantId}
    `;
    const data = groups.map(g => ({
      ...g,
      options: options.filter(o => o.group_id === g.id).map(o => ({
        ...o,
        is_default: !!o.is_default,
        stock_deduct: !!o.stock_deduct,
      })),
    }));
    const byProduct: Record<string, any> = {};
    for (const a of associations) {
      if (!byProduct[a.product_id]) byProduct[a.product_id] = [];
      byProduct[a.product_id].push(a.group_id);
    }
    return NextResponse.json({ groups: data, productModifiers: byProduct });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { groups, productModifiers } = await req.json() as any;

    // Validate: check incomplete stock_deduct configs
    const warnings = [];
    for (const g of groups) {
      if (g.options) {
        for (const o of g.options) {
          if (o.stockDeduct && (!o.stockArticleId || !o.stockQuantity)) {
            warnings.push(`"${g.name} → ${o.name}": activaste "Descuenta inventario" pero falta el artículo o la cantidad`);
          }
        }
      }
    }
    if (warnings.length > 0) {
      return NextResponse.json({ ok: false, warnings }, { status: 400 });
    }

    await sql`DELETE FROM modifier_options WHERE tenant_id = ${tenantId}`;
    await sql`DELETE FROM product_modifiers WHERE tenant_id = ${tenantId}`;
    await sql`DELETE FROM modifier_groups WHERE tenant_id = ${tenantId}`;

    for (const g of groups) {
      await sql`
        INSERT INTO modifier_groups (id, name, type, required, tenant_id)
        VALUES (${g.id}, ${g.name}, ${g.type || 'single'}, ${g.required || false}, ${tenantId})
      `;
      if (g.options) {
        for (let i = 0; i < g.options.length; i++) {
          const o = g.options[i];
          await sql`
            INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order, stock_deduct, stock_article_id, stock_quantity, tenant_id)
            VALUES (${o.id}, ${g.id}, ${o.name}, ${o.priceDelta || 0}, ${o.isDefault || false}, ${i},
              ${!!o.stockDeduct}, ${o.stockArticleId || ''}, ${o.stockQuantity || 0}, ${tenantId})
          `;
        }
      }
    }

    for (const [productId, groupIds] of Object.entries(productModifiers || {})) {
      for (const groupId of (groupIds as string[])) {
        await sql`
          INSERT INTO product_modifiers (product_id, group_id, tenant_id)
          VALUES (${productId}, ${groupId}, ${tenantId})
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
