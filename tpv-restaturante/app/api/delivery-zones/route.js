import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM delivery_zones ORDER BY name`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, radiusKm: Number(r.radius_km),
      cost: Number(r.cost), minOrder: Number(r.min_order),
      estimatedMinutes: r.estimated_minutes, active: r.active,
      createdAt: r.created_at,
    })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const id = 'dz_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await sql`
      INSERT INTO delivery_zones (id, name, radius_km, cost, min_order, estimated_minutes, active, created_at)
      VALUES (${id}, ${body.name}, ${body.radiusKm || 0}, ${body.cost || 0}, ${body.minOrder || 0}, ${body.estimatedMinutes || 30}, ${body.active !== false}, ${Date.now()})
    `;
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    await sql`
      UPDATE delivery_zones SET name = ${body.name}, radius_km = ${body.radiusKm || 0},
        cost = ${body.cost || 0}, min_order = ${body.minOrder || 0},
        estimated_minutes = ${body.estimatedMinutes || 30}, active = ${body.active !== false}
      WHERE id = ${body.id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await sql`DELETE FROM delivery_zones WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
