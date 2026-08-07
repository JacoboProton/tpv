import { describe, it, expect, vi, beforeEach } from 'vitest';
import { floorSync } from '../db/schema';
import { decideFloorConflict, getFloorSync, resolveFloorConflict, saveFloorSync, type FloorSyncState } from '../lib/floor-sync';

const stored = (vc: Record<string, number>, updatedAt: number): FloorSyncState => ({
  tenantId: 'default', vectorClock: vc, updatedAt,
});

const dbData = new Map<object, any[]>();
const insertCalls: any[] = [];
function seed(table: object, data: any[]) { dbData.set(table, data); }

vi.mock('@/lib/drizzle', () => {
  const makeWhere = (table: any) => {
    const rows = dbData.get(table) || [];
    return { limit: () => Promise.resolve(rows.slice(0, 1)) };
  };
  const db: any = {
    select: () => ({ from: (table: any) => ({ where: () => makeWhere(table) }) }),
    insert: () => ({ values: (v: any) => ({ onConflictDoUpdate: () => { insertCalls.push(v); return Promise.resolve(); } }) }),
  };
  return { getDb: () => db };
});

beforeEach(() => {
  dbData.clear();
  insertCalls.length = 0;
});

describe('decideFloorConflict (LWW + vector clock)', () => {
  it('accepts first write (no stored state)', () => {
    const d = decideFloorConflict(null, { a: 1 }, 1000);
    expect(d.accepted).toBe(true);
    expect(d.mergedClock).toEqual({ a: 1 });
  });

  it('accepts when incoming dominates stored clock', () => {
    const d = decideFloorConflict(stored({ a: 1, b: 1 }, 1000), { a: 2, b: 1 }, 2000);
    expect(d.accepted).toBe(true);
    expect(d.mergedClock).toEqual({ a: 2, b: 1 });
  });

  it('rejects when stored dominates incoming', () => {
    const d = decideFloorConflict(stored({ a: 2, b: 1 }, 2000), { a: 1, b: 1 }, 3000);
    expect(d.accepted).toBe(false);
  });

  it('accepts concurrent write when incoming updatedAt is newer', () => {
    const d = decideFloorConflict(stored({ a: 2 }, 1000), { b: 1 }, 5000);
    expect(d.accepted).toBe(true);
    expect(d.mergedClock).toEqual({ a: 2, b: 1 });
  });

  it('rejects concurrent write when incoming updatedAt is older', () => {
    const d = decideFloorConflict(stored({ b: 1 }, 5000), { a: 2 }, 1000);
    expect(d.accepted).toBe(false);
  });

  it('accepts concurrent write on equal updatedAt (incoming wins, último en llegar)', () => {
    const d = decideFloorConflict(stored({ a: 2 }, 3000), { b: 1 }, 3000);
    expect(d.accepted).toBe(true);
  });
});

describe('floor-sync DB functions', () => {
  it('getFloorSync returns null when there is no row', async () => {
    await expect(getFloorSync('default')).resolves.toBeNull();
  });

  it('getFloorSync maps the stored row', async () => {
    seed(floorSync, [{
      tenantId: 'default', vectorClock: { a: 2 }, updatedAt: 1234,
    }]);
    const state = await getFloorSync('default');
    expect(state).toEqual({ tenantId: 'default', vectorClock: { a: 2 }, updatedAt: 1234 });
  });

  it('getFloorSync handles corrupt rows gracefully', async () => {
    seed(floorSync, [{ tenantId: 'default', vectorClock: undefined, updatedAt: null }]);
    const state = await getFloorSync('default');
    expect(state?.vectorClock).toEqual({});
    expect(state?.updatedAt).toBe(0);
  });

  it('resolveFloorConflict forward to decided/stored state', async () => {
    seed(floorSync, [{ tenantId: 'default', vectorClock: { a: 1 }, updatedAt: 1000 }]);
    const d = await resolveFloorConflict('default', { a: 2 }, 2000);
    expect(d.accepted).toBe(true);
    expect(d.mergedClock).toEqual({ a: 2 });
  });

  it('resolveFloorConflict rejects when stored dominates', async () => {
    seed(floorSync, [{ tenantId: 'default', vectorClock: { a: 2 }, updatedAt: 2000 }]);
    const d = await resolveFloorConflict('default', { a: 1 }, 3000);
    expect(d.accepted).toBe(false);
  });

  it('saveFloorSync upserts with the clock and timestamp', async () => {
    await saveFloorSync('default', { a: 3 }, 999);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({ tenantId: 'default', vectorClock: { a: 3 }, updatedAt: 999 });
  });
});
