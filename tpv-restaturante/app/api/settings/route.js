import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';
import { invalidateSettingsCache } from '../../../lib/settings-cache';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const rows = await sql`SELECT key, value FROM settings WHERE tenant_id = ${tenantId}`;
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const tenantId = getTenantId(req);
    for (const [key, value] of Object.entries(body)) {
      await sql`
        INSERT INTO settings (tenant_id, key, value)
        VALUES (${tenantId}, ${key}, ${String(value)})
        ON CONFLICT (key) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, value = EXCLUDED.value
      `;
    }
    invalidateSettingsCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
