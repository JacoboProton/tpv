import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { productStock } from '../../../db/schema';

export async function POST(req: NextRequest) {
  const tenantId = getTenantId(req);
  try {
    const db = getDb();
    const rows = await db.selectDistinct({ productId: productStock.productId })
      .from(productStock)
      .where(eq(productStock.tenantId, tenantId));
    for (const r of rows) {
      const existing = await db.select({ stock: productStock.stock })
        .from(productStock)
        .where(and(
          eq(productStock.productId, r.productId),
          eq(productStock.location, 'Almacén'),
          eq(productStock.tenantId, tenantId),
        ));
      if (existing.length > 0) {
        await db.update(productStock).set({ stock: sql`stock + 100` })
          .where(and(
            eq(productStock.productId, r.productId),
            eq(productStock.location, 'Almacén'),
            eq(productStock.tenantId, tenantId),
          ));
      } else {
        await db.insert(productStock).values({
          productId: r.productId, tenantId, location: 'Almacén', stock: 100, lowStock: 20,
        });
      }
    }
    return NextResponse.json({ ok: true, actualizados: rows.length });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
