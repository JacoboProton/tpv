import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function POST() {
  try {
    const rows = await sql`SELECT DISTINCT product_id FROM product_stock`;
    for (const r of rows) {
      // Sumar 100 al Almacén; si no existe, crearlo con stock=100
      const existing = await sql`SELECT stock FROM product_stock WHERE product_id = ${r.product_id} AND location = 'Almacén'`;
      if (existing.length > 0) {
        await sql`UPDATE product_stock SET stock = stock + 100 WHERE product_id = ${r.product_id} AND location = 'Almacén'`;
      } else {
        await sql`INSERT INTO product_stock (product_id, location, stock, low_stock) VALUES (${r.product_id}, 'Almacén', 100, 20)`;
      }
    }
    return NextResponse.json({ ok: true, actualizados: rows.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
