import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { action, details } = body;
    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });
    await sql`
      INSERT INTO kds_audit_log (action, details, created_at)
      VALUES (${action}, ${JSON.stringify(details || {})}, ${Date.now()})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '200');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    let query = sql`SELECT * FROM kds_audit_log`;
    if (action) query = sql`${query} WHERE action = ${action}`;
    query = sql`${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const rows = await query;
    return NextResponse.json(rows.map(r => ({
      id: r.id, action: r.action, details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
      createdAt: r.created_at,
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
