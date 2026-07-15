import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`SELECT * FROM delivery_zones WHERE tenant_id = ${tenantId} ORDER BY name`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, radiusKm: Number(r.radius_km),
      cost: Number(r.cost), minOrder: Number(r.min_order),
      estimatedMinutes: r.estimated_minutes, active: r.active,
      createdAt: r.created_at,
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const id = 'dz_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await sql`
      INSERT INTO delivery_zones (id, name, radius_km, cost, min_order, estimated_minutes, active, created_at, tenant_id)
      VALUES (${id}, ${body.name}, ${body.radiusKm || 0}, ${body.cost || 0}, ${body.minOrder || 0}, ${body.estimatedMinutes || 30}, ${body.active !== false}, ${Date.now()}, ${tenantId})
    `;
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    await sql`
      UPDATE delivery_zones SET name = ${body.name}, radius_km = ${body.radiusKm || 0},
        cost = ${body.cost || 0}, min_order = ${body.minOrder || 0},
        estimated_minutes = ${body.estimatedMinutes || 30}, active = ${body.active !== false}
      WHERE id = ${body.id} AND tenant_id = ${tenantId}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { id } = await req.json() as any;
    await sql`DELETE FROM delivery_zones WHERE id = ${id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
