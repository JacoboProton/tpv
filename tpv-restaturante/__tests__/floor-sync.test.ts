import { describe, it, expect } from 'vitest';
import { decideFloorConflict, type FloorSyncState } from '../lib/floor-sync';

const stored = (vc: Record<string, number>, updatedAt: number): FloorSyncState => ({
  tenantId: 'default', vectorClock: vc, updatedAt,
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
