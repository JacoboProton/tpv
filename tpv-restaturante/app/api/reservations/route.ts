import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

function makeId(): string { return 'res_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const recurring = searchParams.get('recurring');
    if (recurring === '1') {
      const rows = await sql`SELECT * FROM reservation_recurring WHERE tenant_id = ${tenantId} ORDER BY weekday, time`;
      return NextResponse.json({ recurring: (rows as any[]).map(r => ({
        id: r.id, name: r.name, weekday: r.weekday, time: r.time,
        pax: r.pax, phone: r.phone, notes: r.notes,
        zone: r.zone, tableId: r.table_id, active: r.active,
        createdAt: r.created_at,
      }))});
    }
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    let query = sql`SELECT * FROM reservations WHERE tenant_id = ${tenantId}`;
    const conds: any[] = [];
    if (date) conds.push(sql`date = ${date}`);
    if (from) conds.push(sql`date >= ${from}`);
    if (to) conds.push(sql`date <= ${to}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a: any, c: any) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY date DESC, time DESC`;
    const rows = await query;
    return NextResponse.json((rows as any[]).map(r => ({
      id: r.id, date: r.date, time: r.time, pax: r.pax,
      name: r.name, phone: r.phone, email: r.email,
      status: r.status, zone: r.zone, notes: r.notes,
      tableId: r.table_id, customerId: r.customer_id,
      depositAmount: Number(r.deposit_amount || 0),
      depositPaid: r.deposit_paid, source: r.source,
      createdAt: r.created_at, updatedAt: r.updated_at,
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const r = await req.json() as any;
    if (r.recurring) {
      const id = (r.id as string) || makeId().replace('res_', 'rec_');
      await sql`
        INSERT INTO reservation_recurring (id, name, weekday, time, pax, phone, notes, zone, table_id, active, created_at, tenant_id)
        VALUES (${id}, ${r.name}, ${r.weekday}, ${r.time}, ${r.pax}, ${r.phone || ''}, ${r.notes || ''}, ${r.zone || ''}, ${r.tableId || ''}, true, ${Date.now()}, ${tenantId})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, weekday = EXCLUDED.weekday, time = EXCLUDED.time,
          pax = EXCLUDED.pax, phone = EXCLUDED.phone, notes = EXCLUDED.notes,
          zone = EXCLUDED.zone, table_id = EXCLUDED.table_id
      `;
      return NextResponse.json({ ok: true, id });
    }
    const id = (r.id as string) || makeId();
    await sql`
      INSERT INTO reservations (id, date, time, pax, name, phone, email, status, zone, notes, table_id, customer_id, deposit_amount, deposit_paid, source, created_at, updated_at, tenant_id)
      VALUES (${id}, ${r.date}, ${r.time}, ${r.pax}, ${r.name}, ${r.phone || ''}, ${r.email || ''},
        ${r.status || 'pendiente'}, ${r.zone || ''}, ${r.notes || ''}, ${r.tableId || ''}, ${r.customerId || ''},
        ${r.depositAmount || 0}, ${r.depositPaid || false}, ${r.source || 'manual'}, ${Date.now()}, ${Date.now()}, ${tenantId})
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date, time = EXCLUDED.time, pax = EXCLUDED.pax,
        name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email,
        status = EXCLUDED.status, zone = EXCLUDED.zone, notes = EXCLUDED.notes,
        table_id = EXCLUDED.table_id, customer_id = EXCLUDED.customer_id,
        deposit_amount = EXCLUDED.deposit_amount, deposit_paid = EXCLUDED.deposit_paid,
        updated_at = EXCLUDED.updated_at
    `;
    if (r.tableId && (r.status === 'confirmada' || r.status === 'sentada' || r.status === 'pendiente')) {
      await sql`UPDATE tables SET reserved_for = ${r.name} WHERE id = ${r.tableId} AND tenant_id = ${tenantId}`;
    }
    if (r.tableId && (r.status === 'cancelada' || r.status === 'noshow')) {
      await sql`UPDATE tables SET reserved_for = '' WHERE id = ${r.tableId} AND tenant_id = ${tenantId}`;
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as { id: string; recurring?: string };
    const { id, recurring } = body;
    if (recurring) {
      await sql`DELETE FROM reservation_recurring WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }
    const row = await sql`SELECT table_id FROM reservations WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if ((row as any[]).length > 0 && (row as any[])[0].table_id) {
      await sql`UPDATE tables SET reserved_for = '' WHERE id = ${(row as any[])[0].table_id} AND tenant_id = ${tenantId}`;
    }
    await sql`DELETE FROM reservations WHERE id = ${id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
