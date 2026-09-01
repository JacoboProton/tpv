import { NextRequest } from 'next/server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId, getPublicTenantId } from '../../../lib/tenant';
import { qrOrders, orders, tables, deliveryOrders, products } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiTooManyRequests, apiForbidden } from '../../../lib/infrastructure/response';
import { rateLimit, getClientIp } from '../../../lib/rate-limit';
import { requireRole } from '../../../lib/rbac';
import { QrOrderPostBody } from '@/lib/schemas/api-schemas';

function makeId(prefix = 'qo') { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function optNum(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function toOrderItems(v: Array<unknown>): Array<{
  productId?: string; name?: string; price?: string | number;
  qty?: number; notes?: string; modifiers?: unknown; course?: string;
}> {
  return v.flatMap((it) => isRecord(it) ? [{
    productId: optStr(it.productId), name: optStr(it.name),
    price: typeof it.price === 'number' || typeof it.price === 'string' ? it.price : undefined,
    qty: optNum(it.qty), notes: optStr(it.notes), modifiers: it.modifiers,
    course: optStr(it.course),
  }] : []);
}

// SIN requireRole — endpoint público para que clientes creen pedidos
// desde el menú QR. No requiere sesión TPV. Se autentica por tenantId
// (header x-tenant-id) y se filtra por mesa activa.
export async function POST(req: NextRequest) {
  const rl = await rateLimit(`qrorder:w:${getClientIp(req)}`, 40, 60_000);
  if (!rl.allowed) return apiTooManyRequests();
  try {
    const db = getDb();
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiForbidden('tenant_no_autorizado');
    const parsed = QrOrderPostBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;

    if (body.action === 'status') {
      if (!body.orderId) return apiBadRequest('orderId required');
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
      tableId, items, customerName, customerPhone, customerEmail,
      notes, modality, address, addressLat, addressLng, zoneId, deliveryCost, scheduledAt,
    } = body;

    if (!items || items.length === 0) {
      return apiBadRequest('items required');
    }

    const orderId = makeId('qo');
    const now = Date.now();

    const rawItems = toOrderItems(items);
    const priceMap = new Map<string, number>();
    const priceRows = await db
      .select({ id: products.id, price: products.price })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), inArray(products.id, rawItems.map(i => i.productId).filter(Boolean) as string[])));
    for (const p of priceRows) priceMap.set(p.id, Number(p.price));

    const orderItems = rawItems.map((it, i) => {
      const serverPrice = it.productId != null ? priceMap.get(it.productId) : undefined;
      const price = serverPrice != null ? serverPrice : Number(it.price);
      return {
        id: 'i_' + now + '_' + i + Math.random().toString(36).slice(2, 6),
        productId: it.productId, name: it.name, price,
        qty: it.qty || 1, notes: it.notes || '', modifiers: it.modifiers || [],
        sent: true, sentAt: now, ready: false, served: false,
        course: it.course || '', source: 'qr',
      };
    });

    const serverAmount = orderItems.reduce((s, i) => s + Number(i.price) * i.qty, 0);

    const tpvOrderId = makeId('o');
    const empName = modality === 'dinein' ? 'QR' : modality === 'pickup' ? 'Recogida' : 'Domicilio';

    if (tableId && modality === 'dinein') {
      await db.insert(orders).values({
        id: tpvOrderId, tableId, items: orderItems,
        createdAt: now, employeeName: empName, tenantId,
      });
      const [table] = await db.select({ orderIds: tables.orderIds }).from(tables)
        .where(and(eq(tables.id, tableId), eq(tables.tenantId, tenantId))).limit(1);
      const existingIds: unknown[] = Array.isArray(table?.orderIds) ? table.orderIds : [];
      const newIds = [...existingIds.filter((x): x is string => typeof x === 'string'), tpvOrderId];
      await db.update(tables).set({
        status: 'ocupada', orderId: tpvOrderId, orderIds: newIds,
      }).where(and(eq(tables.id, tableId), eq(tables.tenantId, tenantId)));
    }

    const qrTableId = tableId || 'online';
    await db.insert(qrOrders).values({
      id: orderId, tableId: qrTableId, items: orderItems,
      orderStatus: 'pending',
      modality: modality || 'dinein', amount: String(serverAmount || 0),
      deliveryCost: String(deliveryCost || 0),
      customerName: customerName || '', customerPhone: customerPhone || '',
      customerEmail: customerEmail || '', notes: notes || '',
      address: address || '',
      addressLat: addressLat != null ? String(addressLat) : null,
      addressLng: addressLng != null ? String(addressLng) : null,
      zoneId: zoneId || '', scheduledAt: scheduledAt ?? null,
      accepted: body.autoAccept !== false,
      createdAt: now, updatedAt: now, tenantId,
    });

    if (modality === 'pickup' || modality === 'delivery') {
      const delId = 'del_' + Date.now();
      await db.insert(deliveryOrders).values({
        id: delId, orderId, tableId: qrTableId,
        customerName: customerName || '', customerPhone: customerPhone || '',
        address: address || '',
        addressLat: addressLat != null ? String(addressLat) : null,
        addressLng: addressLng != null ? String(addressLng) : null,
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

// SIN requireRole — endpoint público para que clientes consulten
// el estado de su pedido QR. Identificado por orderId + tenantId.
export async function GET(req: NextRequest) {
  const rl = await rateLimit(`qrorder:r:${getClientIp(req)}`, 120, 60_000);
  if (!rl.allowed) return apiTooManyRequests();
  try {
    const db = getDb();
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiForbidden('tenant_no_autorizado');
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
      return apiOk(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
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
      return apiOk(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
    }
    const allRows = await db.select().from(qrOrders)
      .where(eq(qrOrders.tenantId, tenantId))
      .orderBy(desc(qrOrders.createdAt)).limit(100);
    return apiOk(allRows.map((r) => ({
      id: r.id, tableId: r.tableId, modality: r.modality, orderStatus: r.orderStatus,
      customerName: r.customerName, customerPhone: r.customerPhone,
      customerEmail: r.customerEmail, address: r.address, zoneId: r.zoneId,
      deliveryCost: Number(r.deliveryCost || 0), amount: Number(r.amount),
      items: r.items, notes: r.notes, accepted: r.accepted,
      scheduledAt: r.scheduledAt, createdAt: r.createdAt, updatedAt: r.updatedAt,
    })));
  } catch (err) { return apiError(err); }
}

// SIN requireRole — endpoint público para que clientes actualicen
// su pedido QR (cancelar, cambiar estado). Autenticado por id + tenantId.
export async function PUT(req: NextRequest) {
  const rl = await rateLimit(`qrorder:w:${getClientIp(req)}`, 40, 60_000);
  if (!rl.allowed) return apiTooManyRequests();
  try {
    const db = getDb();
    const tenantId = getPublicTenantId(req);
    if (!tenantId) return apiForbidden('tenant_no_autorizado');
    const parsed = QrOrderPostBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action } = body;
    const id = typeof body.id === 'string' ? body.id : '';

    if (action === 'status') {
      if (!id) return apiBadRequest('id required');
      const status = String(body.status);
      // Un cliente solo puede cancelar su propio pedido. El resto de transiciones
      // de estado (paid, confirmed, preparing, ready...) requieren sesión de staff.
      if (status !== 'cancelled') {
        const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
        if (!auth.authorized) return apiForbidden('status_no_permitido');
      }
      await db.update(qrOrders).set({ orderStatus: status, updatedAt: Date.now() })
        .where(and(eq(qrOrders.id, id), eq(qrOrders.tenantId, tenantId)));
      return apiOk();
    }

    if (action === 'accept') {
      if (!id) return apiBadRequest('id required');
      const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
      if (!auth.authorized) return apiForbidden('solo_staff');
      await db.update(qrOrders).set({ accepted: true, orderStatus: 'confirmed', updatedAt: Date.now() })
        .where(and(eq(qrOrders.id, id), eq(qrOrders.tenantId, tenantId)));
      return apiOk();
    }

    if (action === 'update_items') {
      if (!id) return apiBadRequest('id required');
      await db.update(qrOrders).set({ items: body.items, updatedAt: Date.now() })
        .where(and(eq(qrOrders.id, id), eq(qrOrders.tenantId, tenantId)));
      return apiOk();
    }

    return apiBadRequest('unknown action');
  } catch (err) { return apiError(err); }
}
