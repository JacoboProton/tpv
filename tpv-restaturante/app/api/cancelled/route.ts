import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { cancelledOrders } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const db = getDb();
    const rows = await db.select({
      id: cancelledOrders.id,
      orderId: cancelledOrders.orderId,
      tableId: cancelledOrders.tableId,
      tableName: cancelledOrders.tableName,
      items: cancelledOrders.items,
      total: cancelledOrders.total,
      employeeName: cancelledOrders.employeeName,
      reason: cancelledOrders.reason,
      cancelledAt: cancelledOrders.cancelledAt,
    }).from(cancelledOrders)
      .where(eq(cancelledOrders.tenantId, tenantId))
      .orderBy(desc(cancelledOrders.cancelledAt))
      .limit(limit);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const b = await req.json();
    const db = getDb();
    const [row] = await db.insert(cancelledOrders).values({
      orderId: b.orderId, tableId: b.tableId, tableName: b.tableName,
      items: b.items, total: b.total, employeeName: b.employeeName,
      reason: b.reason, cancelledAt: Date.now(), tenantId,
    }).returning();
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
