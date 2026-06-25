import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const [categories, products, tables, orders, sales, employees, accessLogs, stockLog, cancelledOrders] =
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
      ]);

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        categories,
        products,
        tables,
        orders,
        sales,
        employees,
        accessLogs,
        stockLog,
        cancelledOrders,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
