import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { rateLimit } from '../../../../lib/rate-limit';

export async function GET(req) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`we:${ip}`, 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'failed';

    const events = await sql`
      SELECT event_id, type, status, error, created_at, processed_at
      FROM webhook_events
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(events);
  } catch (err) {
    console.error('[Webhook Events] Error listing:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`we:${ip}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
    }

    const { eventId } = await req.json();

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId requerido' }, { status: 400 });
    }

    await sql`
      UPDATE webhook_events SET status = 'failed', error = NULL
      WHERE event_id = ${eventId}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook Events] Error resetting:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
