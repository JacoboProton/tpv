import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const deliveryId = searchParams.get('deliveryId');
    if (deliveryId) {
      const rows = await sql`
        SELECT dt.* FROM delivery_tracking dt
        JOIN delivery_orders d ON d.id = dt.delivery_id
        WHERE dt.delivery_id = ${deliveryId} AND d.tenant_id = ${tenantId}
        ORDER BY dt.created_at
      `;
      return NextResponse.json(rows);
    }
    return NextResponse.json([]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    const { deliveryId, status, locationLat, locationLng, note } = body;
    // Verify delivery belongs to tenant
    const delivery = await sql`
      SELECT id FROM delivery_orders WHERE id = ${deliveryId} AND tenant_id = ${tenantId} LIMIT 1
    `;
    if (delivery.length === 0) {
      return NextResponse.json({ error: 'Delivery no encontrado' }, { status: 404 });
    }
    await sql`
      INSERT INTO delivery_tracking (delivery_id, status, location_lat, location_lng, note, created_at)
      VALUES (${deliveryId}, ${status}, ${locationLat || null}, ${locationLng || null}, ${note || ''}, ${Date.now()})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
