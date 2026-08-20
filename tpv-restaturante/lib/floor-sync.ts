import { eq } from 'drizzle-orm';
import { getDb } from './drizzle';
import { floorSync } from '../db/schema';
import { compareClocks, mergeClocks, type VectorClock } from './vector-clock';

export interface FloorSyncState {
  tenantId: string;
  vectorClock: VectorClock;
  updatedAt: number;
}

export interface FloorSyncDecision {
  accepted: boolean;
  stored: FloorSyncState | null;
  mergedClock: VectorClock;
  storedUpdatedAt: number | null;
}

/**
 * Lógica pura de resolución LWW + vector clock (sin I/O).
 * - Si el reloj entrante domina el almacenado → aceptar.
 * - Si el almacenado domina → rechazar (409).
 * - Concurrentes → gana el de updatedAt mayor (LWW por wall-clock);
 *   a igualdad de updatedAt, gana el entrante (último en llegar).
 */
export function decideFloorConflict(
  stored: FloorSyncState | null,
  incomingClock: VectorClock,
  incomingUpdatedAt: number,
): FloorSyncDecision {
  if (!stored) {
    return { accepted: true, stored: null, mergedClock: incomingClock, storedUpdatedAt: null };
  }

  const order = compareClocks(incomingClock, stored.vectorClock);

  if (order === 'a-dominates') {
    return {
      accepted: true,
      stored,
      mergedClock: mergeClocks(incomingClock, stored.vectorClock),
      storedUpdatedAt: stored.updatedAt,
    };
  }

  if (order === 'b-dominates') {
    return { accepted: false, stored, mergedClock: stored.vectorClock, storedUpdatedAt: stored.updatedAt };
  }

  // concurrent → LWW por updatedAt
  if (incomingUpdatedAt >= stored.updatedAt) {
    return {
      accepted: true,
      stored,
      mergedClock: mergeClocks(incomingClock, stored.vectorClock),
      storedUpdatedAt: stored.updatedAt,
    };
  }

  return { accepted: false, stored, mergedClock: stored.vectorClock, storedUpdatedAt: stored.updatedAt };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isVectorClock(v: unknown): v is VectorClock {
  if (!isRecord(v)) return false
  for (const key of Object.keys(v)) {
    if (typeof v[key] !== 'number') return false
  }
  return true
}

export async function getFloorSync(tenantId: string): Promise<FloorSyncState | null> {
  try {
    const db = getDb();
    const [row] = await db.select().from(floorSync)
      .where(eq(floorSync.tenantId, tenantId))
      .limit(1);
    if (!row) return null;
    return {
      tenantId: row.tenantId,
      vectorClock: isVectorClock(row.vectorClock) ? row.vectorClock : {},
      updatedAt: row.updatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Resuelve un conflicto de floor usando LWW + vector clock.
 */
export async function resolveFloorConflict(
  tenantId: string,
  incomingClock: VectorClock,
  incomingUpdatedAt: number,
): Promise<FloorSyncDecision> {
  const stored = await getFloorSync(tenantId);
  return decideFloorConflict(stored, incomingClock, incomingUpdatedAt);
}

export async function saveFloorSync(tenantId: string, clock: VectorClock, updatedAt: number): Promise<void> {
  try {
    const db = getDb();
    await db.insert(floorSync).values({
      tenantId,
      vectorClock: clock,
      updatedAt,
    }).onConflictDoUpdate({
      target: floorSync.tenantId,
      set: { vectorClock: clock, updatedAt },
    });
  } catch { /* non-fatal */ }
}
