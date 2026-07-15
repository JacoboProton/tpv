import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const orders = await sql`
      SELECT * FROM delivery_orders WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 100
    `;
    return NextResponse.json(orders);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const id = 'del_' + Date.now();
    const items = body.items ? JSON.stringify(body.items) : '[]';
    await sql`
      INSERT INTO delivery_orders (id, order_id, table_id, customer_name, customer_phone, address, address_lat, address_lng, notes, runner_id, items, status, created_at, tenant_id)
      VALUES (${id}, ${body.orderId || null}, ${body.tableId || null}, ${body.customerName}, ${body.customerPhone || ''}, ${body.address}, ${body.addressLat || null}, ${body.addressLng || null}, ${body.notes || ''}, ${body.runnerId || null}, ${items}, 'pending', ${Date.now()}, ${tenantId})
    `;
    return NextResponse.json({ id, ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const now = body.deliveredAt || null;
    await sql`
      UPDATE delivery_orders SET status = ${body.status}, runner_id = COALESCE(${body.runnerId}, runner_id), estimated_at = COALESCE(${body.estimatedAt || null}, estimated_at), delivered_at = COALESCE(${now}, delivered_at), items = COALESCE(${body.items ? JSON.stringify(body.items) : null}, items) WHERE id = ${body.id} AND tenant_id = ${tenantId}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
