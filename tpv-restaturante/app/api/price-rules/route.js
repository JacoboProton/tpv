import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const rules = await sql`
      SELECT id, product_id, name, active, days, start_time, end_time, type, value::float AS value, created_at
      FROM product_price_rules WHERE tenant_id = ${tenantId} ORDER BY product_id, name
    `;
    return NextResponse.json(rules.map(r => ({ ...r, active: !!r.active })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const tenantId = getTenantId(req);
    const rules = await req.json();
    await sql`DELETE FROM product_price_rules WHERE tenant_id = ${tenantId}`;
    for (const r of rules) {
      await sql`
        INSERT INTO product_price_rules (id, product_id, name, active, days, start_time, end_time, type, value, created_at, tenant_id)
        VALUES (${r.id}, ${r.product_id}, ${r.name}, ${r.active ?? true},
          ${r.days}, ${r.start_time}, ${r.end_time}, ${r.type}, ${r.value}, ${Date.now()}, ${tenantId})
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
