import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const deliveryId = searchParams.get('deliveryId');
    if (deliveryId) {
      const rows = await sql`SELECT * FROM delivery_tracking WHERE delivery_id = ${deliveryId} ORDER BY created_at`;
      return NextResponse.json(rows);
    }
    return NextResponse.json([]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { deliveryId, status, locationLat, locationLng, note } = body;
    await sql`
      INSERT INTO delivery_tracking (delivery_id, status, location_lat, location_lng, note, created_at)
      VALUES (${deliveryId}, ${status}, ${locationLat || null}, ${locationLng || null}, ${note || ''}, ${Date.now()})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
