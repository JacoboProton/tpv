import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError } from '../../../lib/infrastructure/response';
import { categories, products, tables, orders, sales, employees, accessLogs, stockLog, cancelledOrders, offers, settings, modifierGroups, productStock, deliveryRunners, deliveryOrders, deliveryTracking } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const db = getDb();
    const [categoriesRows, productsRows, tablesRows, ordersRows, salesRows, employeesRows, accessLogsRows, stockLogRows, cancelledOrdersRows, offersRows, settingsRows, modifiersRows, productStockRows, deliveryRunnersRows, deliveryOrdersRows, deliveryTrackingRows] =
      await Promise.all([
        db.select().from(categories).where(eq(categories.tenantId, tenantId)).orderBy(categories.name),
        db.select().from(products).where(eq(products.tenantId, tenantId)).orderBy(products.name),
        db.select().from(tables).where(eq(tables.tenantId, tenantId)).orderBy(tables.id),
        db.select().from(orders).where(eq(orders.tenantId, tenantId)).orderBy(orders.id),
        db.select().from(sales).where(eq(sales.tenantId, tenantId)).orderBy(sales.id),
        db.select().from(employees).where(eq(employees.tenantId, tenantId)).orderBy(employees.id),
        db.select().from(accessLogs).where(eq(accessLogs.tenantId, tenantId)).orderBy(accessLogs.id),
        db.select().from(stockLog).where(eq(stockLog.tenantId, tenantId)).orderBy(stockLog.id),
        db.select().from(cancelledOrders).where(eq(cancelledOrders.tenantId, tenantId)).orderBy(cancelledOrders.id),
        db.select().from(offers).where(eq(offers.tenantId, tenantId)).orderBy(offers.id),
        db.select().from(settings).where(eq(settings.tenantId, tenantId)).orderBy(settings.key),
        db.select().from(modifierGroups).where(eq(modifierGroups.tenantId, tenantId)).orderBy(modifierGroups.id),
        db.select().from(productStock).where(eq(productStock.tenantId, tenantId)).orderBy(productStock.productId, productStock.location),
        db.select().from(deliveryRunners).where(eq(deliveryRunners.tenantId, tenantId)).orderBy(deliveryRunners.id),
        db.select().from(deliveryOrders).where(eq(deliveryOrders.tenantId, tenantId)).orderBy(deliveryOrders.id),
        db.select().from(deliveryTracking).where(eq(deliveryTracking.tenantId, tenantId)).orderBy(deliveryTracking.id),
      ]);

    const data = {
      categories: categoriesRows, products: productsRows, tables: tablesRows, orders: ordersRows, sales: salesRows, employees: employeesRows,
      accessLogs: accessLogsRows, stockLog: stockLogRows, cancelledOrders: cancelledOrdersRows,
      offers: offersRows, settings: settingsRows, modifiers: modifiersRows, productStock: productStockRows,
      deliveryRunners: deliveryRunnersRows, deliveryOrders: deliveryOrdersRows, deliveryTracking: deliveryTrackingRows,
    };

    const stats: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      stats[key] = Array.isArray(val) ? val.length : 0;
    }

    return apiOk({
      exportedAt: new Date().toISOString(),
      version: '2.0',
      stats,
      data,
    });
  } catch (err: any) { return apiError(err); }
}
