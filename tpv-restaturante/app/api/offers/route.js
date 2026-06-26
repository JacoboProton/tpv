import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const rows = await sql`SELECT id, name, type, days, start_hour, end_hour, discount_pct::float AS discountPct, fixed_price::float AS fixedPrice, product_ids AS "productIds", active FROM offers ORDER BY name`;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const offers = await req.json();
    await sql`DELETE FROM offers`;
    for (const o of offers) {
      await sql`
        INSERT INTO offers (id, name, type, days, start_hour, end_hour, discount_pct, fixed_price, product_ids, active)
        VALUES (${o.id}, ${o.name}, ${o.type}, ${o.days}, ${o.startHour}, ${o.endHour}, ${o.discountPct ?? null}, ${o.fixedPrice ?? null}, ${o.productIds}, ${o.active})
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
