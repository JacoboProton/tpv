import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { deliveryRunners } from '../../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const rows = await db.select().from(deliveryRunners)
      .where(eq(deliveryRunners.tenantId, tenantId))
      .orderBy(deliveryRunners.name);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const runners = await req.json();
    const db = getDb();
    for (const r of runners) {
      if (r.id) {
        await db.insert(deliveryRunners).values({
          id: r.id, name: r.name, phone: r.phone || '',
          active: r.active, createdAt: Date.now(), tenantId,
        }).onConflictDoUpdate({
          target: deliveryRunners.id,
          set: { name: sql`EXCLUDED.name`, phone: sql`EXCLUDED.phone`, active: sql`EXCLUDED.active` },
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { id } = await req.json() as any;
    const db = getDb();
    await db.delete(deliveryRunners)
      .where(eq(deliveryRunners.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
