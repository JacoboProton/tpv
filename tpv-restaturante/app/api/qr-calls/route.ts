import { NextRequest } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { qrCalls, tables } from '../../../db/schema';
import { apiOk, apiError } from '../../../lib/infrastructure/response';

let callsCache: Record<string, any> = {};
let cacheTime: Record<string, any> = {};

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const now = Date.now();
    if (now - (cacheTime[tenantId] || 0) < 3000) {
      return apiOk(callsCache[tenantId] || []);
    }
    const db = getDb();
    const rows = await db.select().from(qrCalls)
      .where(and(eq(qrCalls.acknowledged, false), eq(qrCalls.tenantId, tenantId)))
      .orderBy(desc(qrCalls.createdAt));
    callsCache[tenantId] = rows.map(r => ({
      id: r.id, tableId: r.tableId, tableName: r.tableName,
      zone: r.zone, acknowledged: r.acknowledged, createdAt: r.createdAt,
    }));
    cacheTime[tenantId] = now;
    return apiOk(callsCache[tenantId]);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const db = getDb();

    let tableName = body.tableName || '';
    if ((!tableName || tableName === body.tableId) && body.tableId) {
      const tbl = await db.select({ name: tables.name }).from(tables)
        .where(and(eq(tables.id, body.tableId), eq(tables.tenantId, tenantId)))
        .limit(1);
      tableName = tbl[0]?.name || tableName;
    }

    const id = 'call_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await db.insert(qrCalls).values({
      id, tableId: body.tableId, tableName, zone: body.zone || '',
      acknowledged: false, createdAt: Date.now(), tenantId,
    });
    callsCache[tenantId] = [];
    cacheTime[tenantId] = 0;
    return apiOk({ id });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const db = getDb();
    await db.update(qrCalls).set({ acknowledged: true })
      .where(and(eq(qrCalls.id, body.id), eq(qrCalls.tenantId, tenantId)));
    callsCache[tenantId] = [];
    cacheTime[tenantId] = 0;
    return apiOk();
  } catch (err) { return apiError(err); }
}
