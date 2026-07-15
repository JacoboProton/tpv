import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

function makeId(prefix = 'qo') { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;

    if (body.action === 'status') {
      const rows = await sql`SELECT * FROM qr_orders WHERE id = ${body.orderId} AND tenant_id = ${tenantId}`;
      if (rows.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const r = rows[0];
      return NextResponse.json({
        id: r.id, tableId: r.table_id, orderStatus: r.order_status,
        modality: r.modality, items: r.items, amount: Number(r.amount),
        deliveryCost: Number(r.delivery_cost || 0),
        createdAt: r.created_at, updatedAt: r.updated_at,
      });
    }

    // Submit order
    const {
      tableId, items, amount, customerName, customerPhone, customerEmail,
      notes, modality, address, addressLat, addressLng, zoneId, deliveryCost, scheduledAt,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'items required' }, { status: 400 });
    }

    const orderId = makeId('qo');
    const now = Date.now();

    const orderItems = items.map((it: any, i: any) => ({
      id: 'i_' + now + '_' + i + Math.random().toString(36).slice(2, 6),
      productId: it.productId, name: it.name, price: it.price,
      qty: it.qty || 1, notes: it.notes || '', modifiers: it.modifiers || [],
      sent: true, sentAt: now, ready: false, served: false,
      course: it.course || '', source: 'qr',
    }));

    const tpvOrderId = makeId('o');
    const empName = modality === 'dinein' ? 'QR' : modality === 'pickup' ? 'Recogida' : 'Domicilio';

    // For dine-in, write to orders table so TPV picks it up
    if (tableId && modality === 'dinein') {
      await sql`
        INSERT INTO orders (id, table_id, items, created_at, employee_name, tenant_id)
        VALUES (${tpvOrderId}, ${tableId}, ${JSON.stringify(orderItems)}, ${now}, ${empName}, ${tenantId})
      `;
      const table = await sql`SELECT order_ids FROM tables WHERE id = ${tableId} AND tenant_id = ${tenantId}`;
      const existingIds = table[0]?.order_ids || [];
      const newIds = [...existingIds.filter((x: any) => x), tpvOrderId];
      await sql`
        UPDATE tables SET status = 'ocupada', order_id = ${tpvOrderId}, order_ids = ${JSON.stringify(newIds)}
        WHERE id = ${tableId} AND tenant_id = ${tenantId}
      `;
    }

    // Insert into qr_orders for tracking
    const qrTableId = tableId || 'online';
    await sql`
      INSERT INTO qr_orders (id, table_id, items, order_status, modality, amount, delivery_cost,
        customer_name, customer_phone, customer_email, notes, address, address_lat, address_lng,
        zone_id, scheduled_at, accepted, created_at, updated_at, tenant_id)
      VALUES (${orderId}, ${qrTableId}, ${JSON.stringify(orderItems)},
        ${body.paymentRequired ? 'paid' : 'pending'},
        ${modality || 'dinein'}, ${amount || 0}, ${deliveryCost || 0},
        ${customerName || ''}, ${customerPhone || ''}, ${customerEmail || ''},
        ${notes || ''}, ${address || ''}, ${addressLat || null}, ${addressLng || null},
        ${zoneId || ''}, ${scheduledAt || null},
        ${body.autoAccept !== false}, ${now}, ${now}, ${tenantId})
    `;

    // Create delivery order entry for pickup/delivery
    if (modality === 'pickup' || modality === 'delivery') {
      const delId = 'del_' + Date.now();
      await sql`
        INSERT INTO delivery_orders (id, order_id, table_id, customer_name, customer_phone, address,
          address_lat, address_lng, notes, items, status, created_at, estimated_at, tenant_id)
        VALUES (${delId}, ${orderId}, ${qrTableId}, ${customerName || ''}, ${customerPhone || ''},
          ${address || ''}, ${addressLat || null}, ${addressLng || null},
          ${notes || ''}, ${JSON.stringify(orderItems)}, 'pending', ${now}, ${scheduledAt || null}, ${tenantId})
      `;
    }

    return NextResponse.json({
      ok: true, orderId, tpvOrderId,
      paymentRequired: body.paymentRequired === true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const rows = await sql`SELECT * FROM qr_orders WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (rows.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const r = rows[0];
      return NextResponse.json({
        id: r.id, tableId: r.table_id, orderStatus: r.order_status,
        modality: r.modality, items: r.items, amount: Number(r.amount),
        deliveryCost: Number(r.delivery_cost || 0), customerName: r.customer_name,
        customerPhone: r.customer_phone, customerEmail: r.customer_email,
        address: r.address, addressLat: r.address_lat, addressLng: r.address_lng,
        zoneId: r.zone_id, notes: r.notes, accepted: r.accepted,
        scheduledAt: r.scheduled_at, createdAt: r.created_at, updatedAt: r.updated_at,
      });
    }
    const tableId = searchParams.get('tableId');
    if (tableId) {
      const rows = await sql`
        SELECT * FROM qr_orders WHERE table_id = ${tableId} AND order_status != 'cancelled' AND tenant_id = ${tenantId}
        ORDER BY created_at DESC LIMIT 20
      `;
      return NextResponse.json(rows.map(r => ({
        id: r.id, tableId: r.table_id, modality: r.modality,
        orderStatus: r.order_status, amount: Number(r.amount),
        createdAt: r.created_at,
      })));
    }
    const modality = searchParams.get('modality');
    if (modality) {
      const rows = await sql`
        SELECT * FROM qr_orders WHERE modality = ${modality} AND tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 50
      `;
      return NextResponse.json(rows.map(r => ({
        id: r.id, modality: r.modality, orderStatus: r.order_status,
        customerName: r.customer_name, amount: Number(r.amount),
        createdAt: r.created_at,
      })));
    }
    // List all recent orders
    const allRows = await sql`
      SELECT * FROM qr_orders WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 100
    `;
    return NextResponse.json(allRows.map(r => ({
      id: r.id, tableId: r.table_id, modality: r.modality, orderStatus: r.order_status,
      customerName: r.customer_name, customerPhone: r.customer_phone,
      customerEmail: r.customer_email, address: r.address, zoneId: r.zone_id,
      deliveryCost: Number(r.delivery_cost || 0), amount: Number(r.amount),
      items: r.items, notes: r.notes, accepted: r.accepted,
      scheduledAt: r.scheduled_at, createdAt: r.created_at, updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action, id } = body;

    if (action === 'status') {
      await sql`UPDATE qr_orders SET order_status = ${body.status}, updated_at = ${Date.now()} WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'accept') {
      await sql`UPDATE qr_orders SET accepted = true, order_status = 'confirmed', updated_at = ${Date.now()} WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_items') {
      await sql`UPDATE qr_orders SET items = ${JSON.stringify(body.items)}, updated_at = ${Date.now()} WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
