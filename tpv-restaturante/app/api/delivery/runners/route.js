import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`SELECT * FROM delivery_runners WHERE tenant_id = ${tenantId} ORDER BY name`;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const tenantId = getTenantId(req);
    const runners = await req.json();
    for (const r of runners) {
      if (r.id) {
        await sql`
          INSERT INTO delivery_runners (id, name, phone, active, created_at, tenant_id)
          VALUES (${r.id}, ${r.name}, ${r.phone || ''}, ${r.active}, ${Date.now()}, ${tenantId})
          ON CONFLICT (id) DO UPDATE SET name = ${r.name}, phone = ${r.phone || ''}, active = ${r.active}
        `;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const tenantId = getTenantId(req);
    const { id } = await req.json();
    await sql`DELETE FROM delivery_runners WHERE id = ${id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
