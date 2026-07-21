import { NextRequest } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { products, productStock } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';

const SPLIT: Record<string, { loc: string; keep: number }> = {
  Bebidas:    { loc: 'Bar',    keep: 25 },
  Tapas:      { loc: 'Cocina', keep: 12 },
  Principales: { loc: 'Cocina', keep: 8 },
  Postres:     { loc: 'Cocina', keep: 6 },
};

export async function POST(req: NextRequest) {
  const tenantId = getTenantId(req);
  try {
    const db = getDb();
    const productList = await db.select({
      id: products.id, name: products.name, category: products.category, ubicacion: products.ubicacion,
    }).from(products).where(eq(products.tenantId, tenantId));

    let moved: string[] = [];
    for (const p of productList) {
      const s = SPLIT[p.category];
      if (!s) continue;
      const servingLoc = s.loc;
      const keep = s.keep;

      const stockRows = await db.select({
        location: productStock.location, stock: productStock.stock,
        lowStock: productStock.lowStock,
      }).from(productStock)
        .where(and(eq(productStock.productId, p.id), eq(productStock.tenantId, tenantId)));

      const totalStock = stockRows.reduce((sum: any, r: any) => sum + r.stock, 0);
      if (totalStock === 0) continue;

      const servingRow = stockRows.find(r => r.location === servingLoc);
      const almacenRow = stockRows.find(r => r.location === 'Almacén');

      const servingStock = Math.min(keep, totalStock);
      const almacenStock = totalStock - servingStock;

      if (servingRow) {
        await db.update(productStock).set({ stock: servingStock })
          .where(and(
            eq(productStock.productId, p.id),
            eq(productStock.location, servingLoc),
            eq(productStock.tenantId, tenantId),
          ));
      } else if (servingStock > 0) {
        await db.insert(productStock).values({
          productId: p.id, tenantId, location: servingLoc, stock: servingStock, lowStock: 5,
        });
      }

      if (almacenStock > 0) {
        const lowStock = almacenRow ? almacenRow.lowStock : 20;
        if (almacenRow) {
          await db.update(productStock).set({ stock: almacenStock, lowStock })
            .where(and(
              eq(productStock.productId, p.id),
              eq(productStock.location, 'Almacén'),
              eq(productStock.tenantId, tenantId),
            ));
        } else {
          await db.insert(productStock).values({
            productId: p.id, tenantId, location: 'Almacén', stock: almacenStock, lowStock: 20,
          });
        }
      }

      for (const r of stockRows) {
        if (r.location !== servingLoc && r.location !== 'Almacén') {
          await db.delete(productStock)
            .where(and(
              eq(productStock.productId, p.id),
              eq(productStock.location, r.location),
              eq(productStock.tenantId, tenantId),
            ));
        }
      }

      moved.push(`${p.name}: ${servingStock} en ${servingLoc}, ${almacenStock} en Almacén`);
    }
    return apiOk({ ok: true, movidos: moved });
  } catch (err) { return apiError(err); }
}
