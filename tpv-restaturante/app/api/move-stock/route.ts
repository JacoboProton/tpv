import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { products, productStock, stockLog } from '../../../db/schema';

export async function POST(req: NextRequest) {
  const tenantId = getTenantId(req);
  try {
    const db = getDb();
    const rows = await db.select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.ubicacion, 'Almacén')));
    for (const p of rows) {
      await db.update(products).set({ ubicacion: 'Cocina' })
        .where(and(eq(products.id, p.id), eq(products.tenantId, tenantId)));

      const stockRow = await db.select({
        stock: productStock.stock, lowStock: productStock.lowStock,
      }).from(productStock)
        .where(and(
          eq(productStock.productId, p.id),
          eq(productStock.location, 'Almacén'),
          eq(productStock.tenantId, tenantId),
        ));

      if (stockRow.length > 0) {
        const { stock, lowStock } = stockRow[0];
        await db.insert(productStock).values({
          productId: p.id, tenantId, location: 'Cocina', stock, lowStock,
        }).onConflictDoUpdate({
          target: [productStock.productId, productStock.location],
          set: { stock: sql`EXCLUDED.stock`, lowStock: sql`EXCLUDED.low_stock` },
        });
        await db.delete(productStock)
          .where(and(
            eq(productStock.productId, p.id),
            eq(productStock.location, 'Almacén'),
            eq(productStock.tenantId, tenantId),
          ));
      }
    }
    return apiOk({ ok: true, movidos: rows.map((r: any) => r.name) });
  } catch (err) { return apiError(err); }
}
