import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { offers } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const rows = await db.select({
      id: offers.id, name: offers.name, type: offers.type,
      days: offers.days,
      startHour: offers.startHour, endHour: offers.endHour,
      discountPct: sql<number>`${offers.discountPct}::float`,
      fixedPrice: sql<number>`${offers.fixedPrice}::float`,
      productIds: offers.productIds,
      active: offers.active,
    }).from(offers)
      .where(eq(offers.tenantId, tenantId));
    return NextResponse.json(rows);
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const data = await req.json() as any[];
    await db.delete(offers).where(eq(offers.tenantId, tenantId));
    for (const o of data) {
      await db.insert(offers).values({
        id: o.id, name: o.name, type: o.type, days: o.days,
        startHour: o.startHour, endHour: o.endHour,
        discountPct: o.discountPct ?? null,
        fixedPrice: o.fixedPrice ?? null,
        productIds: o.productIds, active: o.active, tenantId,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
