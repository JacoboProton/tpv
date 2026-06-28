import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

let callsCache = [];
let cacheTime = 0;

export async function GET() {
  try {
    const now = Date.now();
    if (now - cacheTime < 3000 && callsCache.length >= 0) {
      return NextResponse.json(callsCache);
    }
    const rows = await sql`
      SELECT * FROM qr_calls WHERE acknowledged = false ORDER BY created_at DESC
    `;
    callsCache = rows.map(r => ({
      id: r.id, tableId: r.table_id, tableName: r.table_name,
      zone: r.zone, acknowledged: r.acknowledged, createdAt: r.created_at,
    }));
    cacheTime = now;
    return NextResponse.json(callsCache);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const id = 'call_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await sql`
      INSERT INTO qr_calls (id, table_id, table_name, zone, acknowledged, created_at)
      VALUES (${id}, ${body.tableId}, ${body.tableName || ''}, ${body.zone || ''}, false, ${Date.now()})
    `;
    callsCache = [];
    cacheTime = 0;
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    await sql`UPDATE qr_calls SET acknowledged = true WHERE id = ${body.id}`;
    callsCache = [];
    cacheTime = 0;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
