import { getDb } from './drizzle';
import { sql, eq } from 'drizzle-orm';
import { tables, orders, floorPlan } from '../db/schema';
import type { TenantId } from './tenant';

export function upsertTableQueries(tableData: Record<string, unknown>[], tenantId: TenantId) {
  const db = getDb();
  const queries = [];
  for (const t of tableData) {
    queries.push(
      db.insert(tables).values({
        id: String(t.id),
        name: t.name as string,
        status: (t.status as string) ?? 'libre',
        orderId: t.orderId != null ? String(t.orderId) : null,
        orderIds: t.orderIds || (t.orderId ? [String(t.orderId)] : []),
        reserved: (t.reserved as string) ?? null,
        reservedFor: (t.reserved_for as string) ?? '',
        isFiado: (t.isFiado as boolean) ?? false,
        type: (t.type as string) ?? 'mesa',
        posX: (t.x as number) ?? 100,
        posY: (t.y as number) ?? 100,
        tableWidth: (t.width as number) ?? 80,
        tableHeight: (t.height as number) ?? 80,
        tableRadius: (t.radius as number) ?? 40,
        tableShape: (t.shape as string) ?? 'rect',
        rotation: (t.rotation as number) ?? 0,
        seats: (t.seats as number) ?? 4,
        zone: (t.zone as string) ?? '',
        layer: (t.layer as number) ?? 0,
        tableColor: (t.color as string) ?? '',
        tenantId,
      }).onConflictDoUpdate({
        target: [tables.id, tables.tenantId],
        set: {
          name: sql.raw('EXCLUDED.name'),
          status: sql.raw('EXCLUDED.status'),
          orderId: sql.raw('EXCLUDED.order_id'),
          orderIds: sql.raw('EXCLUDED.order_ids'),
          reserved: sql.raw('EXCLUDED.reserved'),
          reservedFor: sql.raw('EXCLUDED.reserved_for'),
          isFiado: sql.raw('EXCLUDED.is_fiado'),
          type: sql.raw('EXCLUDED.type'),
          posX: sql.raw('EXCLUDED.pos_x'),
          posY: sql.raw('EXCLUDED.pos_y'),
          tableWidth: sql.raw('EXCLUDED.table_width'),
          tableHeight: sql.raw('EXCLUDED.table_height'),
          tableRadius: sql.raw('EXCLUDED.table_radius'),
          tableShape: sql.raw('EXCLUDED.table_shape'),
          rotation: sql.raw('EXCLUDED.rotation'),
          seats: sql.raw('EXCLUDED.seats'),
          zone: sql.raw('EXCLUDED.zone'),
          layer: sql.raw('EXCLUDED.layer'),
          tableColor: sql.raw('EXCLUDED.table_color'),
        },
      }).toSQL()
    );
  }
  return queries;
}

export function upsertOrderQueries(orderData: Record<string, Record<string, unknown>>, tenantId: TenantId) {
  const db = getDb();
  const queries = [];
  for (const [oid, o] of Object.entries(orderData)) {
    queries.push(
      db.insert(orders).values({
        id: oid,
        tableId: String(o.tableId),
        items: o.items as any[],
        createdAt: (o.createdAt as number) ?? Date.now(),
        employeeName: (o.employeeName as string) ?? null,
        tenantId,
      }).onConflictDoUpdate({
        target: [orders.id, orders.tenantId],
        set: {
          tableId: sql.raw('EXCLUDED.table_id'),
          items: sql.raw('EXCLUDED.items'),
          createdAt: sql.raw('EXCLUDED.created_at'),
          employeeName: sql.raw('EXCLUDED.employee_name'),
        },
      }).toSQL()
    );
  }
  return queries;
}

export function upsertFloorPlanQuery(zones: unknown, background: unknown) {
  const db = getDb();
  const zonesVal = typeof zones === 'string' ? JSON.parse(zones) : (zones || []);
  const bgVal = typeof background === 'string' ? JSON.parse(background) : (background ?? null);
  return db.insert(floorPlan).values({
    id: 1,
    zones: zonesVal,
    background: bgVal,
  }).onConflictDoUpdate({
    target: floorPlan.id,
    set: {
      zones: sql.raw('EXCLUDED.zones'),
      background: sql.raw('EXCLUDED.background'),
    },
  }).toSQL();
}

export async function fetchFullFloor(tenantId: TenantId) {
  const db = getDb();
  const [tableRows, orderRows, floorPlanRows] = await Promise.all([
    db.select({
      id: tables.id,
      name: tables.name,
      status: tables.status,
      orderId: tables.orderId,
      orderIds: tables.orderIds,
      reserved: tables.reserved,
      reservedFor: tables.reservedFor,
      isFiado: tables.isFiado,
      type: tables.type,
      x: tables.posX,
      y: tables.posY,
      width: tables.tableWidth,
      height: tables.tableHeight,
      radius: tables.tableRadius,
      shape: tables.tableShape,
      rotation: tables.rotation,
      seats: tables.seats,
      zone: tables.zone,
      layer: tables.layer,
      color: tables.tableColor,
    }).from(tables).where(eq(tables.tenantId, tenantId)).orderBy(tables.id),
    db.select({
      id: orders.id,
      tableId: orders.tableId,
      items: orders.items,
      createdAt: orders.createdAt,
      employeeName: orders.employeeName,
    }).from(orders).where(eq(orders.tenantId, tenantId)),
    db.select({
      zones: floorPlan.zones,
      background: floorPlan.background,
    }).from(floorPlan).where(eq(floorPlan.id, 1)),
  ]);

  const ordersMap: Record<string, Record<string, unknown>> = {};
  for (const o of orderRows) ordersMap[o.id] = o as Record<string, unknown>;
  const fp = floorPlanRows[0] || { zones: [], background: null };

  return {
    tables: tableRows,
    orders: ordersMap,
    zones: fp.zones ?? [],
    background: fp.background,
  };
}
