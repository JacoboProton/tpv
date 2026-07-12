import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

function makeId() { return 'wl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`
      SELECT * FROM waitlist WHERE tenant_id = ${tenantId} ORDER BY position ASC, created_at ASC
    `;
    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, phone: r.phone, pax: r.pax,
      status: r.status, calledCount: r.called_count, calledAt: r.called_at,
      seatedAt: r.seated_at, tableId: r.table_id,
      position: r.position, notes: r.notes, source: r.source,
      createdAt: r.created_at, updatedAt: r.updated_at,
    })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    const { action } = body;

    if (action === 'join') {
      const { name, phone, pax, source } = body;
      const maxPos = await sql`SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM waitlist WHERE status = 'waiting' AND tenant_id = ${tenantId}`;
      const pos = maxPos[0].pos;
      const id = makeId();
      await sql`
        INSERT INTO waitlist (id, name, phone, pax, status, position, source, created_at, updated_at, tenant_id)
        VALUES (${id}, ${name}, ${phone || ''}, ${pax || 2}, 'waiting', ${pos}, ${source || 'manual'}, ${Date.now()}, ${Date.now()}, ${tenantId})
      `;
      return NextResponse.json({ ok: true, id, position: pos });
    }

    if (action === 'call') {
      const { id } = body;
      await sql`
        UPDATE waitlist SET status = 'called', called_count = called_count + 1, called_at = ${Date.now()}, updated_at = ${Date.now()}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'seat') {
      const { id, tableId } = body;
      await sql`
        UPDATE waitlist SET status = 'seated', seated_at = ${Date.now()}, table_id = ${tableId || ''}, updated_at = ${Date.now()}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'cancel') {
      const { id } = body;
      await sql`
        UPDATE waitlist SET status = 'cancelled', updated_at = ${Date.now()} WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'noshow') {
      const { id } = body;
      await sql`
        UPDATE waitlist SET status = 'noshow', updated_at = ${Date.now()} WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'reorder') {
      const { ids } = body;
      for (let i = 0; i < ids.length; i++) {
        await sql`UPDATE waitlist SET position = ${i + 1}, updated_at = ${Date.now()} WHERE id = ${ids[i]} AND tenant_id = ${tenantId}`;
      }
      return NextResponse.json({ ok: true });
    }

    // Create manual entry
    const { name, phone, pax, notes, source } = body;
    const maxPos = await sql`SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM waitlist WHERE status = 'waiting' AND tenant_id = ${tenantId}`;
    const pos = maxPos[0].pos;
    const id = makeId();
    await sql`
      INSERT INTO waitlist (id, name, phone, pax, status, position, notes, source, created_at, updated_at, tenant_id)
      VALUES (${id}, ${name}, ${phone || ''}, ${pax || 2}, 'waiting', ${pos}, ${notes || ''}, ${source || 'manual'}, ${Date.now()}, ${Date.now()}, ${tenantId})
    `;
    return NextResponse.json({ ok: true, id, position: pos });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
