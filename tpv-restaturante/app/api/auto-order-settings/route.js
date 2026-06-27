import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM auto_order_settings`;
    const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return NextResponse.json(obj);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      await sql`INSERT INTO auto_order_settings (key, value) VALUES (${key}, ${String(value)})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
