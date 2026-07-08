import { sql } from './db';
import type { TenantId } from './tenant';

/** Helper to generate upsert queries for tables */
export function upsertTableQueries(tables: any[], tenantId: TenantId) {
  const queries = [];
  for (const t of tables) {
    queries.push(sql`
      INSERT INTO tables (
        tenant_id, id, name, status, order_id, order_ids, reserved, reserved_for, is_fiado, type,
        pos_x, pos_y, table_width, table_height, table_radius,
        table_shape, rotation, seats, zone, layer, table_color
      ) VALUES (
        ${tenantId}, ${t.id}, ${t.name}, ${t.status}, ${t.orderId ?? null},
        ${JSON.stringify(t.orderIds || (t.orderId ? [t.orderId] : []))},
        ${JSON.stringify(t.reserved ?? null)}, ${t.reserved_for ?? ''}, ${t.isFiado ?? false}, ${t.type ?? 'mesa'},
        ${t.x ?? 100}, ${t.y ?? 100}, ${t.width ?? 80}, ${t.height ?? 80}, ${t.radius ?? 40},
        ${t.shape ?? 'rect'}, ${t.rotation ?? 0}, ${t.seats ?? 4},
        ${t.zone ?? ''}, ${t.layer ?? 0}, ${t.color ?? ''}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        order_id = EXCLUDED.order_id,
        order_ids = EXCLUDED.order_ids,
        reserved = EXCLUDED.reserved,
        reserved_for = EXCLUDED.reserved_for,
        is_fiado = EXCLUDED.is_fiado,
        type = EXCLUDED.type,
        pos_x = EXCLUDED.pos_x,
        pos_y = EXCLUDED.pos_y,
        table_width = EXCLUDED.table_width,
        table_height = EXCLUDED.table_height,
        table_radius = EXCLUDED.table_radius,
        table_shape = EXCLUDED.table_shape,
        rotation = EXCLUDED.rotation,
        seats = EXCLUDED.seats,
        zone = EXCLUDED.zone,
        layer = EXCLUDED.layer,
        table_color = EXCLUDED.table_color;
    `);
  }
  return queries;
}

/** Helper to generate upsert queries for orders */
export function upsertOrderQueries(orders: Record<string, any>, tenantId: TenantId) {
  const queries = [];
  for (const [oid, o] of Object.entries(orders)) {
    queries.push(sql`
      INSERT INTO orders (tenant_id, id, table_id, items, created_at, employee_name)
      VALUES (
        ${tenantId}, ${oid}, ${o.tableId}, ${JSON.stringify(o.items)}, ${o.createdAt}, ${o.employeeName ?? null}
      )
      ON CONFLICT (tenant_id, id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        table_id = EXCLUDED.table_id,
        items = EXCLUDED.items,
        created_at = EXCLUDED.created_at,
        employee_name = EXCLUDED.employee_name;
    `);
  }
  return queries;
}

/** Upsert floor plan (zones/background) */
export function upsertFloorPlanQuery(zones: any, background: any) {
  const zonesVal = typeof zones === 'string' ? zones : JSON.stringify(zones || []);
  const bgVal = typeof background === 'string' ? background : JSON.stringify(background ?? null);
  return sql`
    INSERT INTO floor_plan (id, zones, background)
    VALUES (1, ${zonesVal}::jsonb, ${bgVal}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      zones = EXCLUDED.zones,
      background = EXCLUDED.background;
  `;
}

/** Fetch the complete floor state after an operation */
export async function fetchFullFloor(tenantId: TenantId) {
  const [tableRows, orderRows, floorPlanRows] = await Promise.all([
    sql`SELECT id, name, status, order_id AS "orderId", order_ids AS "orderIds", reserved, reserved_for, is_fiado AS "isFiado", type,
                pos_x AS "x", pos_y AS "y", table_width AS "width", table_height AS "height",
                table_radius AS "radius", table_shape AS "shape", rotation,
                seats, zone, layer, table_color AS "color"
          FROM tables WHERE tenant_id = ${tenantId} ORDER BY id`,
    sql`SELECT o.id, o.table_id AS "tableId", o.items, o.created_at AS "createdAt", o.employee_name AS "employeeName"
          FROM orders o WHERE o.tenant_id = ${tenantId}`,
    sql`SELECT zones, background FROM floor_plan WHERE id = 1`,
  ]);

  const ordersMap: Record<string, any> = {};
  for (const o of orderRows) ordersMap[o.id] = o;
  const fp = floorPlanRows[0] || { zones: [], background: null };
  const rawZones = fp.zones;
  const zonesParsed = typeof rawZones === 'string' ? JSON.parse(rawZones || '[]') : (rawZones || []);

  return {
    tables: tableRows,
    orders: ordersMap,
    zones: zonesParsed,
    background: fp.background,
  };
}
