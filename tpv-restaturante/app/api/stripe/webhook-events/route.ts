import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { rateLimit } from '../../../../lib/rate-limit';
import { getTenantId } from '../../../../lib/tenant';
import { webhookEvents } from '../../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`we:${ip}`, 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'failed';
    const db = getDb();

    const events = await db.select({
      eventId: webhookEvents.eventId, type: webhookEvents.type,
      status: webhookEvents.status, error: webhookEvents.error,
      createdAt: webhookEvents.createdAt, processedAt: webhookEvents.processedAt,
    }).from(webhookEvents)
      .where(eq(webhookEvents.status, status))
      .orderBy(desc(webhookEvents.createdAt))
      .limit(50);

    return NextResponse.json(events);
  } catch (err) {
    console.error('[Webhook Events] Error listing:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`we:${ip}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
    }

    const { eventId } = await req.json() as any;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId requerido' }, { status: 400 });
    }

    const db = getDb();
    await db.update(webhookEvents).set({ status: 'failed', error: null })
      .where(eq(webhookEvents.eventId, eventId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook Events] Error resetting:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
