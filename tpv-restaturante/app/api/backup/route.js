import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const [categories, products, tables, orders, sales, employees, accessLogs, stockLog, cancelledOrders, offers, settings, modifiers, productStock, deliveryRunners, deliveryOrders, deliveryTracking] =
      await Promise.all([
        sql`SELECT * FROM categories WHERE tenant_id = ${tenantId} ORDER BY name`,
        sql`SELECT * FROM products WHERE tenant_id = ${tenantId} ORDER BY name`,
        sql`SELECT * FROM tables WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM orders WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM sales WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM employees WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM access_logs WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM stock_log WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM cancelled_orders WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM offers WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM settings WHERE tenant_id = ${tenantId} ORDER BY key`,
        sql`SELECT * FROM modifier_groups WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM product_stock WHERE tenant_id = ${tenantId} ORDER BY product_id, location`,
        sql`SELECT * FROM delivery_runners WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM delivery_orders WHERE tenant_id = ${tenantId} ORDER BY id`,
        sql`SELECT * FROM delivery_tracking WHERE tenant_id = ${tenantId} ORDER BY id`,
      ]);

    const data = {
      categories, products, tables, orders, sales, employees,
      accessLogs, stockLog, cancelledOrders,
      offers, settings, modifiers, productStock,
      deliveryRunners, deliveryOrders, deliveryTracking,
    };

    const stats = {};
    for (const [key, val] of Object.entries(data)) {
      stats[key] = Array.isArray(val) ? val.length : 0;
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      version: '2.0',
      stats,
      data,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
