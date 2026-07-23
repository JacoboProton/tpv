import { NextRequest } from 'next/server';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { broadcastFloorUpdateServer } from '../../../lib/realtime';
import { FloorPutBodySchema } from '../../../lib/schemas/floorSchema';
import { putFloorInTransaction, deleteTablesInTransaction, deleteOrdersInTransaction, fetchFullFloor } from '../../../lib/floor';
import { apiOk, apiError } from '../../../lib/infrastructure/response';
import { parseBody } from '../../../lib/infrastructure/validate';
import { requireRole } from '../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const fullFloor = await fetchFullFloor(tenantId);
    return apiOk(fullFloor);
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const body = await parseBody(req, FloorPutBodySchema);
    const db = getDb();
    const tenantId = getTenantId(req);
    await db.transaction(async (tx: any) => {
      await putFloorInTransaction(tx, body.tables as any[], body.orders as any, body.zones, body.background, tenantId);
    });
    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor, tenantId).catch(() => {});
    return apiOk();
  } catch (err) { return apiError(err); }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const body = await req.json() as {
      updatedTables: unknown[]; deletedTableIds: string[]; updatedOrders: Record<string, unknown>; deletedOrderIds: string[];
    };
    const { updatedTables, deletedTableIds, updatedOrders, deletedOrderIds } = body;
    const db = getDb();
    const tenantId = getTenantId(req);
    await db.transaction(async (tx: any) => {
      await deleteTablesInTransaction(tx, deletedTableIds, tenantId);
      await deleteOrdersInTransaction(tx, deletedOrderIds, tenantId);
      await putFloorInTransaction(tx, (updatedTables || []) as any[], (updatedOrders || {}) as any, null, null, tenantId);
    });
    const fullFloor = await fetchFullFloor(tenantId);
    await broadcastFloorUpdateServer(fullFloor, tenantId).catch(() => {});
    return apiOk();
  } catch (err) { return apiError(err); }
}
