import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`SELECT id, name, type, days, start_hour, end_hour, discount_pct::float AS discountPct, fixed_price::float AS fixedPrice, product_ids AS "productIds", active FROM offers WHERE tenant_id = ${tenantId} ORDER BY name`;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const offers = await req.json();
    await sql`DELETE FROM offers WHERE tenant_id = ${tenantId}`;
    for (const o of offers) {
      await sql`
        INSERT INTO offers (id, name, type, days, start_hour, end_hour, discount_pct, fixed_price, product_ids, active, tenant_id)
        VALUES (${o.id}, ${o.name}, ${o.type}, ${o.days}, ${o.startHour}, ${o.endHour}, ${o.discountPct ?? null}, ${o.fixedPrice ?? null}, ${o.productIds}, ${o.active}, ${tenantId})
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
