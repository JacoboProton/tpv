import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function POST(req) {
  const tenantId = getTenantId(req);
  try {
    const rows = await sql`SELECT DISTINCT product_id FROM product_stock WHERE tenant_id = ${tenantId}`;
    for (const r of rows) {
      // Sumar 100 al Almacén; si no existe, crearlo con stock=100
      const existing = await sql`SELECT stock FROM product_stock WHERE product_id = ${r.product_id} AND location = 'Almacén' AND tenant_id = ${tenantId}`;
      if (existing.length > 0) {
        await sql`UPDATE product_stock SET stock = stock + 100 WHERE product_id = ${r.product_id} AND location = 'Almacén' AND tenant_id = ${tenantId}`;
      } else {
        await sql`INSERT INTO product_stock (product_id, tenant_id, location, stock, low_stock) VALUES (${r.product_id}, ${tenantId}, 'Almacén', 100, 20)`;
      }
    }
    return NextResponse.json({ ok: true, actualizados: rows.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
