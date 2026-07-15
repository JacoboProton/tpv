import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM tenants ORDER BY name`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, slug: r.slug,
      logoUrl: r.logo_url, address: r.address, phone: r.phone,
      email: r.email, nif: r.nif, active: r.active,
      config: r.config, createdAt: r.created_at,
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { name, slug } = body;
    if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 });

    const id = 'tnt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await sql`
      INSERT INTO tenants (id, name, slug, address, phone, email, nif, active, config, created_at)
      VALUES (${id}, ${name}, ${slug}, ${body.address || ''}, ${body.phone || ''},
        ${body.email || ''}, ${body.nif || ''}, true, '{}', ${Date.now()})
    `;
    return NextResponse.json({ id, ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { id, name, address, phone, email, nif, active } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await sql`
      UPDATE tenants SET
        name = COALESCE(${name}, name),
        address = COALESCE(${address}, address),
        phone = COALESCE(${phone}, phone),
        email = COALESCE(${email}, email),
        nif = COALESCE(${nif}, nif),
        active = COALESCE(${active}, active)
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json() as any;
    if (!id || id === 'default') return NextResponse.json({ error: 'cannot delete default tenant' }, { status: 400 });
    await sql`DELETE FROM tenants WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
