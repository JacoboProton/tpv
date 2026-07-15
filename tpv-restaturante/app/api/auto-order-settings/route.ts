import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`SELECT * FROM auto_order_settings WHERE tenant_id = ${tenantId}`;
    const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return NextResponse.json(obj);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const tenantId = getTenantId(req);
    for (const [key, value] of Object.entries(body)) {
      await sql`INSERT INTO auto_order_settings (tenant_id, key, value) VALUES (${tenantId}, ${key}, ${String(value)})
        ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
