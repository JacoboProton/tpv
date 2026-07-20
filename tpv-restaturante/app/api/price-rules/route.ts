import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { productPriceRules } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const rules = await db.select({
      id: productPriceRules.id, productId: productPriceRules.productId,
      name: productPriceRules.name, active: productPriceRules.active,
      days: productPriceRules.days, startTime: productPriceRules.startTime,
      endTime: productPriceRules.endTime, type: productPriceRules.type,
      value: productPriceRules.value, createdAt: productPriceRules.createdAt,
    }).from(productPriceRules)
      .where(eq(productPriceRules.tenantId, tenantId))
      .orderBy(productPriceRules.productId, productPriceRules.name);
    return NextResponse.json(rules.map(r => ({ ...r, active: !!r.active })));
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const rules = await req.json();
    const db = getDb();
    await db.delete(productPriceRules).where(eq(productPriceRules.tenantId, tenantId));
    for (const r of rules) {
      await db.insert(productPriceRules).values({
        id: r.id, productId: r.product_id, name: r.name,
        active: r.active ?? true, days: r.days,
        startTime: r.start_time, endTime: r.end_time,
        type: r.type, value: r.value, createdAt: Date.now(), tenantId,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
