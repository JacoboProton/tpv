import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { qrOrders, deliveryOrders } from '../../../../db/schema';

function parseItems(raw: any) {
  if (!raw) return [];
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
  if (Array.isArray(raw)) return raw;
  return [];
}

function calcAmount(items: any[]) {
  return items.reduce((s: number, i: any) => s + (parseFloat(i.price) || 0) * (i.qty || 1), 0);
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const [qrRows, delRows] = await Promise.all([
      db.select().from(qrOrders).where(eq(qrOrders.tenantId, tenantId)).orderBy(desc(qrOrders.createdAt)).limit(100),
      db.select().from(deliveryOrders)
        .where(sql`${deliveryOrders.source} != 'manual' AND ${eq(deliveryOrders.tenantId, tenantId)}`)
        .orderBy(desc(deliveryOrders.createdAt)).limit(100),
    ]);

    const mappedQR = qrRows.map(r => ({
      id: r.id, type: 'qr',
      tableId: r.tableId, modality: r.modality,
      orderStatus: r.orderStatus,
      customerName: r.customerName, customerPhone: r.customerPhone,
      customerEmail: r.customerEmail, address: r.address,
      zoneId: r.zoneId, deliveryCost: Number(r.deliveryCost || 0),
      amount: Number(r.amount), items: r.items, notes: r.notes,
      accepted: r.accepted, scheduledAt: r.scheduledAt,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      source: r.modality === 'dinein' ? 'qr_mesa' : 'qr_online',
    }));

    const mappedDel = delRows.map(r => {
      const items = parseItems(r.items);
      return {
        id: r.id, type: 'platform',
        modality: r.source === 'glovo' ? 'delivery' : 'delivery',
        orderStatus: r.status,
        customerName: r.customerName, customerPhone: r.customerPhone,
        address: r.address, notes: r.notes,
        items, amount: calcAmount(items),
        createdAt: r.createdAt,
        source: r.source,
        platformOrderId: r.platformOrderId,
        platformStatus: r.platformStatus,
        deliveryCost: 0,
        accepted: r.status !== 'pending' || false,
      };
    });

    const all = [...mappedQR, ...mappedDel].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json(all);
  } catch (err) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
