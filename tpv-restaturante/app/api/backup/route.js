import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const [categories, products, tables, orders, sales, employees, accessLogs, stockLog, cancelledOrders, offers, settings, modifiers, productStock, deliveryRunners, deliveryOrders, deliveryTracking] =
      await Promise.all([
        sql`SELECT * FROM categories ORDER BY name`,
        sql`SELECT * FROM products ORDER BY name`,
        sql`SELECT * FROM tables ORDER BY id`,
        sql`SELECT * FROM orders ORDER BY id`,
        sql`SELECT * FROM sales ORDER BY id`,
        sql`SELECT * FROM employees ORDER BY id`,
        sql`SELECT * FROM access_logs ORDER BY id`,
        sql`SELECT * FROM stock_log ORDER BY id`,
        sql`SELECT * FROM cancelled_orders ORDER BY id`,
        sql`SELECT * FROM offers ORDER BY id`,
        sql`SELECT * FROM settings ORDER BY key`,
        sql`SELECT * FROM modifier_groups ORDER BY id`,
        sql`SELECT * FROM product_stock ORDER BY product_id, location`,
        sql`SELECT * FROM delivery_runners ORDER BY id`,
        sql`SELECT * FROM delivery_orders ORDER BY id`,
        sql`SELECT * FROM delivery_tracking ORDER BY id`,
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
