import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

// Module-level cache: best-effort per warm instance (no Redis).
// Cold starts always hit the DB; 3s TTL avoids redundant queries on fast-poll loops.
let callsCache: Record<string, any> = {};
let cacheTime: Record<string, any> = {};

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const now = Date.now();
    if (now - (cacheTime[tenantId] || 0) < 3000) {
      return NextResponse.json(callsCache[tenantId] || []);
    }
    const rows = await sql`
      SELECT * FROM qr_calls WHERE acknowledged = false AND tenant_id = ${tenantId} ORDER BY created_at DESC
    `;
    callsCache[tenantId] = rows.map(r => ({
      id: r.id, tableId: r.table_id, tableName: r.table_name,
      zone: r.zone, acknowledged: r.acknowledged, createdAt: r.created_at,
    }));
    cacheTime[tenantId] = now;
    return NextResponse.json(callsCache[tenantId]);
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;

    let tableName = body.tableName || '';
    if ((!tableName || tableName === body.tableId) && body.tableId) {
      const tbl = await sql`SELECT name FROM tables WHERE id = ${body.tableId} AND tenant_id = ${tenantId} LIMIT 1`;
      tableName = tbl[0]?.name || tableName;
    }

    const id = 'call_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await sql`
      INSERT INTO qr_calls (id, table_id, table_name, zone, acknowledged, created_at, tenant_id)
      VALUES (${id}, ${body.tableId}, ${tableName}, ${body.zone || ''}, false, ${Date.now()}, ${tenantId})
    `;
    callsCache[tenantId] = [];
    cacheTime[tenantId] = 0;
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    await sql`UPDATE qr_calls SET acknowledged = true WHERE id = ${body.id} AND tenant_id = ${tenantId}`;
    callsCache[tenantId] = [];
    cacheTime[tenantId] = 0;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
