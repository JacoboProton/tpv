import { NextRequest } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { qrOrders, orders, tables, deliveryOrders } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound } from '../../../lib/infrastructure/response';

function makeId(prefix = 'qo') { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;

    if (body.action === 'status') {
      const [r] = await db.select().from(qrOrders)
        .where(and(eq(qrOrders.id, body.orderId), eq(qrOrders.tenantId, tenantId))).limit(1);
      if (!r) return apiNotFound('not_found');
      return apiOk({
        id: r.id, tableId: r.tableId, orderStatus: r.orderStatus,
        modality: r.modality, items: r.items, amount: Number(r.amount),
        deliveryCost: Number(r.deliveryCost || 0),
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      });
    }

    const {
      tableId, items, amount, customerName, customerPhone, customerEmail,
      notes, modality, address, addressLat, addressLng, zoneId, deliveryCost, scheduledAt,
    } = body;

    if (!items || items.length === 0) {
      return apiBadRequest('items required');
    }

    const orderId = makeId('qo');
    const now = Date.now();

    const orderItems = items.map((it: any, i: number) => ({
      id: 'i_' + now + '_' + i + Math.random().toString(36).slice(2, 6),
      productId: it.productId, name: it.name, price: it.price,
      qty: it.qty || 1, notes: it.notes || '', modifiers: it.modifiers || [],
      sent: true, sentAt: now, ready: false, served: false,
      course: it.course || '', source: 'qr',
    }));

    const tpvOrderId = makeId('o');
    const empName = modality === 'dinein' ? 'QR' : modality === 'pickup' ? 'Recogida' : 'Domicilio';

    if (tableId && modality === 'dinein') {
      await db.insert(orders).values({
        id: tpvOrderId, tableId, items: orderItems,
        createdAt: now, employeeName: empName, tenantId,
      });
      const [table] = await db.select({ orderIds: tables.orderIds }).from(tables)
        .where(and(eq(tables.id, tableId), eq(tables.tenantId, tenantId))).limit(1);
      const existingIds = Array.isArray(table?.orderIds) ? table.orderIds : [];
      const newIds = [...existingIds.filter((x: any) => x), tpvOrderId];
      await db.update(tables).set({
        status: 'ocupada', orderId: tpvOrderId, orderIds: newIds,
      }).where(and(eq(tables.id, tableId), eq(tables.tenantId, tenantId)));
    }

    const qrTableId = tableId || 'online';
    await db.insert(qrOrders).values({
      id: orderId, tableId: qrTableId, items: orderItems,
      orderStatus: body.paymentRequired ? 'paid' : 'pending',
      modality: modality || 'dinein', amount: String(amount || 0),
      deliveryCost: String(deliveryCost || 0),
      customerName: customerName || '', customerPhone: customerPhone || '',
      customerEmail: customerEmail || '', notes: notes || '',
      address: address || '', addressLat: addressLat ?? null, addressLng: addressLng ?? null,
      zoneId: zoneId || '', scheduledAt: scheduledAt ?? null,
      accepted: body.autoAccept !== false,
      createdAt: now, updatedAt: now, tenantId,
    });

    if (modality === 'pickup' || modality === 'delivery') {
      const delId = 'del_' + Date.now();
      await db.insert(deliveryOrders).values({
        id: delId, orderId, tableId: qrTableId,
        customerName: customerName || '', customerPhone: customerPhone || '',
        address: address || '', addressLat: addressLat ?? null, addressLng: addressLng ?? null,
        notes: notes || '', items: orderItems, status: 'pending',
        createdAt: now, estimatedAt: scheduledAt ?? null, tenantId,
      });
    }

    return apiOk({
      orderId, tpvOrderId,
      paymentRequired: body.paymentRequired === true,
    });
  } catch (err) { return apiError(err); }
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const [r] = await db.select().from(qrOrders)
        .where(and(eq(qrOrders.id, id), eq(qrOrders.tenantId, tenantId))).limit(1);
      if (!r) return apiNotFound('not_found');
      return apiOk({
        id: r.id, tableId: r.tableId, orderStatus: r.orderStatus,
        modality: r.modality, items: r.items, amount: Number(r.amount),
        deliveryCost: Number(r.deliveryCost || 0), customerName: r.customerName,
        customerPhone: r.customerPhone, customerEmail: r.customerEmail,
        address: r.address, addressLat: r.addressLat, addressLng: r.addressLng,
        zoneId: r.zoneId, notes: r.notes, accepted: r.accepted,
        scheduledAt: r.scheduledAt, createdAt: r.createdAt, updatedAt: r.updatedAt,
      });
    }
    const tableId = searchParams.get('tableId');
    if (tableId) {
      const rows = await db.select({
        id: qrOrders.id, tableId: qrOrders.tableId, modality: qrOrders.modality,
        orderStatus: qrOrders.orderStatus, amount: qrOrders.amount, createdAt: qrOrders.createdAt,
      }).from(qrOrders)
        .where(sql`${eq(qrOrders.tableId, tableId)} AND ${qrOrders.orderStatus} != 'cancelled' AND ${eq(qrOrders.tenantId, tenantId)}`)
        .orderBy(desc(qrOrders.createdAt)).limit(20);
      return apiOk(rows.map((r: any) => ({ ...r, amount: Number(r.amount) })));
    }
    const modality = searchParams.get('modality');
    if (modality) {
      const rows = await db.select({
        id: qrOrders.id, modality: qrOrders.modality,
        orderStatus: qrOrders.orderStatus, customerName: qrOrders.customerName,
        amount: qrOrders.amount, createdAt: qrOrders.createdAt,
      }).from(qrOrders)
        .where(sql`${eq(qrOrders.modality, modality)} AND ${eq(qrOrders.tenantId, tenantId)}`)
        .orderBy(desc(qrOrders.createdAt)).limit(50);
      return apiOk(rows.map((r: any) => ({ ...r, amount: Number(r.amount) })));
    }
    const allRows = await db.select().from(qrOrders)
      .where(eq(qrOrders.tenantId, tenantId))
      .orderBy(desc(qrOrders.createdAt)).limit(100);
    return apiOk(allRows.map((r: any) => ({
      id: r.id, tableId: r.tableId, modality: r.modality, orderStatus: r.orderStatus,
      customerName: r.customerName, customerPhone: r.customerPhone,
      customerEmail: r.customerEmail, address: r.address, zoneId: r.zoneId,
      deliveryCost: Number(r.deliveryCost || 0), amount: Number(r.amount),
      items: r.items, notes: r.notes, accepted: r.accepted,
      scheduledAt: r.scheduledAt, createdAt: r.createdAt, updatedAt: r.updatedAt,
    })));
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action, id } = body;

    if (action === 'status') {
      await db.update(qrOrders).set({ orderStatus: body.status, updatedAt: Date.now() })
        .where(and(eq(qrOrders.id, id), eq(qrOrders.tenantId, tenantId)));
      return apiOk();
    }

    if (action === 'accept') {
      await db.update(qrOrders).set({ accepted: true, orderStatus: 'confirmed', updatedAt: Date.now() })
        .where(and(eq(qrOrders.id, id), eq(qrOrders.tenantId, tenantId)));
      return apiOk();
    }

    if (action === 'update_items') {
      await db.update(qrOrders).set({ items: body.items, updatedAt: Date.now() })
        .where(and(eq(qrOrders.id, id), eq(qrOrders.tenantId, tenantId)));
      return apiOk();
    }

    return apiBadRequest('unknown action');
  } catch (err) { return apiError(err); }
}
