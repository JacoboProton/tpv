import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { modifierGroups, modifierOptions, productModifiers } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const [groups, options, associations] = await Promise.all([
      db.select().from(modifierGroups).where(eq(modifierGroups.tenantId, tenantId)),
      db.select({
        id: modifierOptions.id, groupId: modifierOptions.groupId,
        name: modifierOptions.name,
        priceDelta: sql<number>`${modifierOptions.priceDelta}::float`,
        isDefault: modifierOptions.isDefault, sortOrder: modifierOptions.sortOrder,
        stockDeduct: modifierOptions.stockDeduct,
        stockArticleId: modifierOptions.stockArticleId,
        stockQuantity: sql<number>`${modifierOptions.stockQuantity}::float`,
      }).from(modifierOptions).where(eq(modifierOptions.tenantId, tenantId)),
      db.select({
        productId: productModifiers.productId, groupId: productModifiers.groupId,
      }).from(productModifiers).where(eq(productModifiers.tenantId, tenantId)),
    ]);

    const data = groups.map(g => ({
      ...g,
      options: options.filter(o => o.groupId === g.id).map(o => ({
        ...o, isDefault: !!o.isDefault, stockDeduct: !!o.stockDeduct,
      })),
    }));
    const byProduct: Record<string, string[]> = {};
    for (const a of associations) {
      if (!byProduct[a.productId]) byProduct[a.productId] = [];
      byProduct[a.productId].push(a.groupId);
    }
    return NextResponse.json({ groups: data, productModifiers: byProduct });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { groups, productModifiers: pmData } = await req.json() as any;

    const warnings: string[] = [];
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

    await db.transaction(async (tx) => {
      await tx.delete(modifierOptions).where(eq(modifierOptions.tenantId, tenantId));
      await tx.delete(productModifiers).where(eq(productModifiers.tenantId, tenantId));
      await tx.delete(modifierGroups).where(eq(modifierGroups.tenantId, tenantId));

      for (const g of groups) {
        await tx.insert(modifierGroups).values({
          id: g.id, name: g.name, type: g.type || 'single',
          required: g.required || false, tenantId,
        });
        if (g.options) {
          for (let i = 0; i < g.options.length; i++) {
            const o = g.options[i];
            await tx.insert(modifierOptions).values({
              id: o.id, groupId: g.id, name: o.name,
              priceDelta: o.priceDelta || 0, isDefault: o.isDefault || false,
              sortOrder: i, stockDeduct: !!o.stockDeduct,
              stockArticleId: o.stockArticleId || '',
              stockQuantity: o.stockQuantity || 0, tenantId,
            });
          }
        }
      }

      for (const [productId, groupIds] of Object.entries(pmData || {})) {
        for (const groupId of (groupIds as string[])) {
          await tx.insert(productModifiers).values({
            productId, groupId, tenantId,
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
