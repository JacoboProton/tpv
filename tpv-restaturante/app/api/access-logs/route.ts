import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, desc } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { accessLogs } from '../../../db/schema';

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { employeeId, employeeName, role, entryPoint } = await req.json() as any;
    const db = getDb();
    await db.insert(accessLogs).values({
      employeeId, employeeName, role, entryPoint, loggedAt: Date.now(), tenantId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error guardando registro de entrada:', err);
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);
    const db = getDb();

    const [rows, countResult] = await Promise.all([
      db.select({
        id: accessLogs.id,
        employeeId: accessLogs.employeeId,
        employeeName: accessLogs.employeeName,
        role: accessLogs.role,
        entryPoint: accessLogs.entryPoint,
        loggedAt: accessLogs.loggedAt,
      }).from(accessLogs)
        .where(eq(accessLogs.tenantId, tenantId))
        .orderBy(desc(accessLogs.loggedAt))
        .limit(limit).offset(offset),
      db.execute(sql`SELECT COUNT(*)::int AS total FROM access_logs WHERE tenant_id = ${tenantId}`),
    ]);

    const total = (countResult as any).rows?.[0]?.total ?? 0;

    return NextResponse.json({
      rows,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
