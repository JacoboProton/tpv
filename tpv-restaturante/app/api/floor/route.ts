import { NextRequest } from 'next/server';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { broadcastFloorUpdateServer } from '../../../lib/realtime';
import { FloorPutBodySchema } from '../../../lib/schemas/floorSchema';
import { putFloorInTransaction, deleteTablesInTransaction, deleteOrdersInTransaction, fetchFullFloor } from '../../../lib/floor';
import { apiOk, apiError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { rateLimit } from '../../../lib/rate-limit';
import { resolveFloorConflict, saveFloorSync, getFloorSync } from '../../../lib/floor-sync';
import type { VectorClock } from '../../../lib/vector-clock';
import type { NodePgTransaction } from 'drizzle-orm/node-postgres/session';
import type { TablesRelationalConfig } from 'drizzle-orm/relations';

type Tx = NodePgTransaction<Record<string, unknown>, TablesRelationalConfig>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isVectorClockLike(v: unknown): v is VectorClock {
  if (!isRecord(v)) return false
  for (const key of Object.keys(v)) {
    if (typeof v[key] !== 'number') return false
  }
  return true
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const fullFloor = await fetchFullFloor(tenantId);
    const sync = await getFloorSync(tenantId);
    return apiOk({ ...fullFloor, vectorClock: sync?.vectorClock ?? {}, updatedAt: sync?.updatedAt ?? 0 });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  const tenantId = getTenantId(req);
  const employeeId = auth.employee?.id || 'unknown';

  const rl = await rateLimit(`floor:${tenantId}:${employeeId}`, 60, 60_000);
  if (!rl.allowed) return apiError(new Error('Demasiadas actualizaciones de piso, intenta de nuevo en unos segundos'), 429);

  try {
    const raw: unknown = await req.json();
    const body = FloorPutBodySchema.parse(raw);
    const rawRec = isRecord(raw) ? raw : {};
    const incomingClock = isVectorClockLike(rawRec.vectorClock) ? rawRec.vectorClock : {};
    const incomingUpdatedAt = typeof rawRec.updatedAt === 'number' ? rawRec.updatedAt : Date.now();

    const decision = await resolveFloorConflict(tenantId, incomingClock, incomingUpdatedAt);
    if (!decision.accepted) {
      const fullFloor = await fetchFullFloor(tenantId);
      const sync = await getFloorSync(tenantId);
      return apiError(new Error('Conflict — floor desactualizado'), 409);
    }

    const db = getDb();
    await db.transaction(async (tx: Tx) => {
      await putFloorInTransaction(tx, body.tables, body.orders, body.zones, body.background, tenantId);
    });
    await saveFloorSync(tenantId, decision.mergedClock, Math.max(incomingUpdatedAt, decision.storedUpdatedAt ?? 0));
    const fullFloor = await fetchFullFloor(tenantId);
    const sync = await getFloorSync(tenantId);
    await broadcastFloorUpdateServer({
      isFullSync: true,
      floor: { ...fullFloor, vectorClock: sync?.vectorClock ?? {}, updatedAt: sync?.updatedAt ?? 0 },
    }, tenantId).catch(() => {});
    return apiOk();
  } catch (err) { return apiError(err); }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  const tenantId = getTenantId(req);
  const employeeId = auth.employee?.id || 'unknown';

  const rl = await rateLimit(`floor-patch:${tenantId}:${employeeId}`, 60, 60_000);
  if (!rl.allowed) return apiError(new Error('Demasiadas actualizaciones de piso, intenta de nuevo en unos segundos'), 429);

  try {
    const raw: {
      updatedTables: Array<Record<string, unknown>>; deletedTableIds: string[]; updatedOrders: Record<string, Record<string, unknown>>; deletedOrderIds: string[];
      vectorClock?: VectorClock; updatedAt?: number;
    } = await req.json();
    const { updatedTables, deletedTableIds, updatedOrders, deletedOrderIds } = raw;
    const incomingClock = isVectorClockLike(raw.vectorClock) ? raw.vectorClock : {};
    const incomingUpdatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now();

    const decision = await resolveFloorConflict(tenantId, incomingClock, incomingUpdatedAt);
    if (!decision.accepted) {
      return apiError(new Error('Conflict — floor desactualizado'), 409);
    }

    const db = getDb();
    await db.transaction(async (tx: Tx) => {
      await deleteTablesInTransaction(tx, deletedTableIds, tenantId);
      await deleteOrdersInTransaction(tx, deletedOrderIds, tenantId);
      await putFloorInTransaction(tx, updatedTables || [], updatedOrders || {}, null, null, tenantId);
    });
    await saveFloorSync(tenantId, decision.mergedClock, Math.max(incomingUpdatedAt, decision.storedUpdatedAt ?? 0));
    const fullFloor = await fetchFullFloor(tenantId);
    const sync = await getFloorSync(tenantId);
    await broadcastFloorUpdateServer({
      isFullSync: false,
      diff: {
        updatedTables: updatedTables || [],
        deletedTableIds: deletedTableIds || [],
        updatedOrders: updatedOrders || {},
        deletedOrderIds: deletedOrderIds || [],
      },
      vectorClock: sync?.vectorClock ?? {},
      updatedAt: sync?.updatedAt ?? 0,
    }, tenantId).catch(() => {});
    return apiOk();
  } catch (err) { return apiError(err); }
}
