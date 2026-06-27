import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM qr_calls WHERE acknowledged = false ORDER BY created_at DESC
    `;
    return NextResponse.json(rows.map(r => ({
      id: r.id, tableId: r.table_id, tableName: r.table_name,
      zone: r.zone, acknowledged: r.acknowledged, createdAt: r.created_at,
    })));
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
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    await sql`UPDATE qr_calls SET acknowledged = true WHERE id = ${body.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
