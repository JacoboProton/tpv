import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { kdsAuditLog } from '../../../../db/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { action, details } = body;
    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });
    const db = getDb();
    await db.insert(kdsAuditLog).values({
      action, details: details || {}, createdAt: Date.now(),
    });
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
    const db = getDb();

    const filters = action ? eq(kdsAuditLog.action, action) : undefined;

    const rows = await db.select({
      id: kdsAuditLog.id, action: kdsAuditLog.action,
      details: kdsAuditLog.details, createdAt: kdsAuditLog.createdAt,
    }).from(kdsAuditLog)
      .where(filters)
      .orderBy(desc(kdsAuditLog.createdAt))
      .limit(limit).offset(offset);

    return NextResponse.json(rows.map(r => ({
      id: r.id, action: r.action,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
      createdAt: r.createdAt,
    })));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
