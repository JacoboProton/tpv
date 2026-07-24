import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError } from '../../../lib/infrastructure/response';

function makeId(): string { return 'res_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const recurring = searchParams.get('recurring');
    if (recurring === '1') {
      const rows = await db.execute(sql`
        SELECT * FROM reservation_recurring WHERE tenant_id = ${tenantId} ORDER BY weekday, time
      `).then((r: any) => r.rows as any[]);
      return apiOk({ recurring: rows.map((r: any) => ({
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

    const rows = await db.execute(query).then((r: any) => r.rows as any[]);
    return apiOk(rows.map((r: any) => ({
      id: r.id, date: r.date, time: r.time, pax: r.pax,
      name: r.name, phone: r.phone, email: r.email,
      status: r.status, zone: r.zone, notes: r.notes,
      tableId: r.table_id, customerId: r.customer_id,
      depositAmount: Number(r.deposit_amount || 0),
      depositPaid: r.deposit_paid, source: r.source,
      createdAt: r.created_at, updatedAt: r.updated_at,
    })));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const r = await req.json() as any;
    if (r.recurring) {
      const id = (r.id as string) || makeId().replace('res_', 'rec_');
      await db.execute(sql`
        INSERT INTO reservation_recurring (id, name, weekday, time, pax, phone, notes, zone, table_id, active, created_at, tenant_id)
        VALUES (${id}, ${r.name}, ${r.weekday}, ${r.time}, ${r.pax}, ${r.phone || ''}, ${r.notes || ''}, ${r.zone || ''}, ${r.tableId || ''}, true, ${Date.now()}, ${tenantId})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, weekday = EXCLUDED.weekday, time = EXCLUDED.time,
          pax = EXCLUDED.pax, phone = EXCLUDED.phone, notes = EXCLUDED.notes,
          zone = EXCLUDED.zone, table_id = EXCLUDED.table_id
      `);
      return apiOk({ ok: true, id });
    }
    const id = (r.id as string) || makeId();
    await db.execute(sql`
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
    `);
    if (r.tableId && (r.status === 'confirmada' || r.status === 'sentada' || r.status === 'pendiente')) {
      await db.execute(sql`UPDATE tables SET reserved_for = ${r.name} WHERE id = ${r.tableId} AND tenant_id = ${tenantId}`);
    }
    if (r.tableId && (r.status === 'cancelada' || r.status === 'noshow')) {
      await db.execute(sql`UPDATE tables SET reserved_for = '' WHERE id = ${r.tableId} AND tenant_id = ${tenantId}`);
    }
    return apiOk({ id });
  } catch (err) { return apiError(err); }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as { id: string; recurring?: string };
    const { id, recurring } = body;
    if (recurring) {
      await db.execute(sql`DELETE FROM reservation_recurring WHERE id = ${id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }
    const [row] = await db.execute(sql`
      SELECT table_id FROM reservations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
    `).then((r: any) => r.rows as any[]);
    if (row?.table_id) {
      await db.execute(sql`UPDATE tables SET reserved_for = '' WHERE id = ${row.table_id} AND tenant_id = ${tenantId}`);
    }
    await db.execute(sql`DELETE FROM reservations WHERE id = ${id} AND tenant_id = ${tenantId}`);
    return apiOk();
  } catch (err) { return apiError(err); }
}
