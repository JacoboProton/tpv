import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { employeeTurns } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const turnDate = searchParams.get('turnDate');
    const db = getDb();

    let conditions = [eq(employeeTurns.tenantId, tenantId)];
    if (employeeId && turnDate) {
      conditions.push(eq(employeeTurns.employeeId, employeeId));
      conditions.push(eq(employeeTurns.turnDate, turnDate));
    } else if (employeeId) {
      conditions.push(eq(employeeTurns.employeeId, employeeId));
    } else if (turnDate) {
      conditions.push(eq(employeeTurns.turnDate, turnDate));
    }

    const rows = await db.select().from(employeeTurns)
      .where(and(...conditions))
      .orderBy(employeeTurns.time);

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { employeeId, employeeName, action, turnDate } = await req.json() as any;
    const time = Date.now();
    const db = getDb();

    await db.insert(employeeTurns).values({
      employeeId, employeeName, action, turnDate, time, tenantId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
