import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const rules = await sql`
      SELECT id, product_id, name, active, days, start_time, end_time, type, value::float AS value, created_at
      FROM product_price_rules ORDER BY product_id, name
    `;
    return NextResponse.json(rules.map(r => ({ ...r, active: !!r.active })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const rules = await req.json();
    await sql`DELETE FROM product_price_rules`;
    for (const r of rules) {
      await sql`
        INSERT INTO product_price_rules (id, product_id, name, active, days, start_time, end_time, type, value, created_at)
        VALUES (${r.id}, ${r.product_id}, ${r.name}, ${r.active ?? true},
          ${r.days}, ${r.start_time}, ${r.end_time}, ${r.type}, ${r.value}, ${Date.now()})
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
