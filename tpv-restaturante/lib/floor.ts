import { sql, eq } from 'drizzle-orm';
import { getDb } from './drizzle';
import { tables, orders, floorPlan } from '../db/schema';
import type { TenantId } from './tenant';

export async function putFloorInTransaction(
  tx: any,
  tableData: Record<string, unknown>[],
  orderData: Record<string, Record<string, unknown>>,
  zones: unknown,
  background: unknown,
  tenantId: string,
) {
  for (const t of tableData) {
    await tx.execute(sql`
      INSERT INTO "tables" ("id","name","status","order_id","order_ids","reserved","reserved_for","is_fiado","type","pos_x","pos_y","table_width","table_height","table_radius","table_shape","rotation","seats","zone","layer","table_color","tenant_id")
      VALUES (${String(t.id)}, ${t.name ?? 'Mesa'}, ${t.status ?? 'libre'}, ${t.orderId != null ? String(t.orderId) : null}, ${JSON.stringify(t.orderIds || (t.orderId ? [String(t.orderId)] : []))}, ${t.reserved ?? null}, ${t.reserved_for ?? ''}, ${t.isFiado ?? false}, ${t.type ?? 'mesa'}, ${t.x ?? 100}, ${t.y ?? 100}, ${t.width ?? 80}, ${t.height ?? 80}, ${t.radius ?? 40}, ${t.shape ?? 'rect'}, ${t.rotation ?? 0}, ${t.seats ?? 4}, ${t.zone ?? ''}, ${t.layer ?? 0}, ${t.color ?? ''}, ${tenantId})
      ON CONFLICT ("id","tenant_id") DO UPDATE SET
        "name"=EXCLUDED.name,"status"=EXCLUDED.status,"order_id"=EXCLUDED.order_id,"order_ids"=EXCLUDED.order_ids,
        "reserved"=EXCLUDED.reserved,"reserved_for"=EXCLUDED.reserved_for,"is_fiado"=EXCLUDED.is_fiado,
        "type"=EXCLUDED.type,"pos_x"=EXCLUDED.pos_x,"pos_y"=EXCLUDED.pos_y,
        "table_width"=EXCLUDED.table_width,"table_height"=EXCLUDED.table_height,"table_radius"=EXCLUDED.table_radius,
        "table_shape"=EXCLUDED.table_shape,"rotation"=EXCLUDED.rotation,"seats"=EXCLUDED.seats,
        "zone"=EXCLUDED.zone,"layer"=EXCLUDED.layer,"table_color"=EXCLUDED.table_color
    `);
  }

  for (const [oid, o] of Object.entries(orderData)) {
    await tx.execute(sql`
      INSERT INTO "orders" ("id","table_id","items","created_at","employee_name","tenant_id")
      VALUES (${oid}, ${String(o.tableId)}, ${JSON.stringify(o.items ?? [])}, ${o.createdAt ?? Date.now()}, ${o.employeeName ?? null}, ${tenantId})
      ON CONFLICT ("id","tenant_id") DO UPDATE SET
        "table_id"=EXCLUDED.table_id,"items"=EXCLUDED.items,"created_at"=EXCLUDED.created_at,"employee_name"=EXCLUDED.employee_name
    `);
  }

  if (zones || background) {
    const zonesVal = typeof zones === 'string' ? JSON.parse(zones) : (zones || []);
    const bgVal = typeof background === 'string' ? JSON.parse(background) : (background ?? null);
    await tx.execute(sql`
      INSERT INTO "floor_plan" ("id","zones","background") VALUES (1, ${JSON.stringify(zonesVal)}, ${JSON.stringify(bgVal)})
      ON CONFLICT ("id") DO UPDATE SET "zones"=EXCLUDED.zones,"background"=EXCLUDED.background
    `);
  }
}

export async function deleteTablesInTransaction(tx: any, ids: string[], tenantId: TenantId) {
  if (!ids || ids.length === 0) return;
  await tx.execute(sql`
    DELETE FROM "tables"
    WHERE "tenant_id" = ${tenantId} AND "id" IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
  `);
}

export async function deleteOrdersInTransaction(tx: any, ids: string[], tenantId: TenantId) {
  if (!ids || ids.length === 0) return;
  await tx.execute(sql`
    DELETE FROM "orders"
    WHERE "tenant_id" = ${tenantId} AND "id" IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
  `);
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
