import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { stockLog } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

    const [rows, countResult] = await Promise.all([
      db.select({
        id: stockLog.id, productId: stockLog.productId,
        productName: stockLog.productName,
        oldStock: stockLog.oldStock, newStock: stockLog.newStock,
        changeAmount: stockLog.changeAmount, reason: stockLog.reason,
        employeeName: stockLog.employeeName, createdAt: stockLog.createdAt,
      }).from(stockLog)
        .where(eq(stockLog.tenantId, tenantId))
        .orderBy(sql`created_at DESC`)
        .limit(limit).offset(offset),
      db.execute(sql`SELECT COUNT(*)::int AS total FROM stock_log WHERE tenant_id = ${tenantId}`),
    ]);

    const total = ((countResult as any).rows?.[0]?.total ?? 0) as number;

    return apiOk({
      rows,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { productId, productName, oldStock, newStock, reason, employeeName } = await req.json() as any;

    const changeAmount = newStock - oldStock;

    const [record] = await db.insert(stockLog).values({
      productId, productName, oldStock, newStock,
      changeAmount, reason, employeeName, createdAt: Date.now(), tenantId,
    }).returning({
      id: stockLog.id, productId: stockLog.productId, productName: stockLog.productName,
      oldStock: stockLog.oldStock, newStock: stockLog.newStock,
      changeAmount: stockLog.changeAmount, reason: stockLog.reason,
      employeeName: stockLog.employeeName, createdAt: stockLog.createdAt,
    });

    return apiOk(record);
  } catch (err) {
    console.error('Error creando stock log:', err);
    return apiError(err);
  }
}
