import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

const SPLIT: Record<string, { loc: string; keep: number }> = {
  Bebidas:    { loc: 'Bar',    keep: 25 },
  Tapas:      { loc: 'Cocina', keep: 12 },
  Principales: { loc: 'Cocina', keep: 8 },
  Postres:     { loc: 'Cocina', keep: 6 },
};

export async function POST(req: NextRequest) {
  const tenantId = getTenantId(req);
  try {
    const products = await sql`SELECT id, name, category, ubicacion FROM products WHERE tenant_id = ${tenantId}`;
    let moved = [];
    for (const p of products) {
      const s = SPLIT[p.category];
      if (!s) continue;
      const servingLoc = s.loc;
      const keep = s.keep;

      // Stock actual del producto (de todas las ubicaciones)
      const stockRows = await sql`SELECT location, stock, low_stock FROM product_stock WHERE product_id = ${p.id} AND tenant_id = ${tenantId}`;
      const totalStock = stockRows.reduce((sum: any, r: any) => sum + r.stock, 0);
      if (totalStock === 0) continue;

      const servingRow = stockRows.find(r => r.location === servingLoc);
      const almacenRow = stockRows.find(r => r.location === 'Almacén');

      // Stock a mantener en la ubicación de servicio
      const servingStock = Math.min(keep, totalStock);
      const almacenStock = totalStock - servingStock;

      // Actualizar o insertar serving location
      if (servingRow) {
        await sql`UPDATE product_stock SET stock = ${servingStock}, low_stock = ${servingRow.low_stock} WHERE product_id = ${p.id} AND location = ${servingLoc} AND tenant_id = ${tenantId}`;
      } else if (servingStock > 0) {
        await sql`INSERT INTO product_stock (product_id, tenant_id, location, stock, low_stock) VALUES (${p.id}, ${tenantId}, ${servingLoc}, ${servingStock}, 5)`;
      }

      // Actualizar o insertar Almacén
      if (almacenStock > 0) {
        const lowStock = almacenRow ? almacenRow.low_stock : 20;
        if (almacenRow) {
          await sql`UPDATE product_stock SET stock = ${almacenStock}, low_stock = ${lowStock} WHERE product_id = ${p.id} AND location = 'Almacén' AND tenant_id = ${tenantId}`;
        } else {
          await sql`INSERT INTO product_stock (product_id, tenant_id, location, stock, low_stock) VALUES (${p.id}, ${tenantId}, 'Almacén', ${almacenStock}, 20)`;
        }
      }

      // Limpiar otras ubicaciones que no sean servingLoc ni Almacén
      for (const r of stockRows) {
        if (r.location !== servingLoc && r.location !== 'Almacén') {
          await sql`DELETE FROM product_stock WHERE product_id = ${p.id} AND location = ${r.location} AND tenant_id = ${tenantId}`;
        }
      }

      moved.push(`${p.name}: ${servingStock} en ${servingLoc}, ${almacenStock} en Almacén`);
    }
    return NextResponse.json({ ok: true, movidos: moved });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
