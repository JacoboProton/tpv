import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function POST(req) {
  const tenantId = getTenantId(req);
  try {
    const rows = await sql`SELECT id, name, ubicacion FROM products WHERE tenant_id = ${tenantId} AND ubicacion = 'Almacén'`;
    for (const p of rows) {
      // Actualizar ubicacion en products
      await sql`UPDATE products SET ubicacion = 'Cocina' WHERE id = ${p.id} AND tenant_id = ${tenantId}`;
      // Mover stock de Almacén a Cocina en product_stock
      const stockRow = await sql`SELECT stock, low_stock FROM product_stock WHERE product_id = ${p.id} AND location = 'Almacén' AND tenant_id = ${tenantId}`;
      if (stockRow.length > 0) {
        const { stock, low_stock } = stockRow[0];
        await sql`
          INSERT INTO product_stock (product_id, tenant_id, location, stock, low_stock)
          VALUES (${p.id}, ${tenantId}, 'Cocina', ${stock}, ${low_stock})
          ON CONFLICT (product_id, location) DO UPDATE SET stock = EXCLUDED.stock, low_stock = EXCLUDED.low_stock
        `;
        await sql`DELETE FROM product_stock WHERE product_id = ${p.id} AND location = 'Almacén' AND tenant_id = ${tenantId}`;
      }
    }
    return NextResponse.json({ ok: true, movidos: rows.map(r => r.name) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
