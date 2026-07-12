import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';

function parseItems(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
  if (Array.isArray(raw)) return raw;
  return [];
}

function calcAmount(items) {
  return items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (i.qty || 1), 0);
}

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const [qrOrders, delOrders] = await Promise.all([
      sql`SELECT * FROM qr_orders WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT * FROM delivery_orders WHERE source != 'manual' AND tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 100`,
    ]);

    const mappedQR = qrOrders.map(r => ({
      id: r.id, type: 'qr',
      tableId: r.table_id, modality: r.modality,
      orderStatus: r.order_status,
      customerName: r.customer_name, customerPhone: r.customer_phone,
      customerEmail: r.customer_email, address: r.address,
      zoneId: r.zone_id, deliveryCost: Number(r.delivery_cost || 0),
      amount: Number(r.amount), items: r.items, notes: r.notes,
      accepted: r.accepted, scheduledAt: r.scheduled_at,
      createdAt: r.created_at, updatedAt: r.updated_at,
      source: r.modality === 'dinein' ? 'qr_mesa' : 'qr_online',
    }));

    const mappedDel = delOrders.map(r => {
      const items = parseItems(r.items);
      return {
        id: r.id, type: 'platform',
        modality: r.source === 'glovo' ? 'delivery' : 'delivery',
        orderStatus: r.status,
        customerName: r.customer_name, customerPhone: r.customer_phone,
        address: r.address, notes: r.notes,
        items, amount: calcAmount(items),
        createdAt: r.created_at,
        source: r.source,
        platformOrderId: r.platform_order_id,
        platformStatus: r.platform_status,
        deliveryCost: 0,
        accepted: r.status !== 'pending' || false,
      };
    });

    const all = [...mappedQR, ...mappedDel].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json(all);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
