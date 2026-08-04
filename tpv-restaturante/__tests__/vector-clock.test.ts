import { describe, it, expect } from 'vitest';
import { incrementClock, mergeClocks, compareClocks, type VectorClock } from '../lib/vector-clock';

describe('vector clock operations', () => {
  it('incrementClock bumps only the device counter', () => {
    const vc: VectorClock = { a: 1, b: 2 };
    expect(incrementClock(vc, 'a')).toEqual({ a: 2, b: 2 });
    expect(vc.a).toBe(1); // immutable
  });

  it('incrementClock initializes missing device', () => {
    expect(incrementClock({}, 'web')).toEqual({ web: 1 });
  });

  it('mergeClocks takes the max per device', () => {
    const a: VectorClock = { x: 3, y: 1 };
    const b: VectorClock = { x: 2, y: 5, z: 1 };
    expect(mergeClocks(a, b)).toEqual({ x: 3, y: 5, z: 1 });
  });

  it('compareClocks equal', () => {
    expect(compareClocks({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe('equal');
  });

  it('compareClocks a dominates b', () => {
    expect(compareClocks({ a: 2, b: 2 }, { a: 1, b: 2 })).toBe('a-dominates');
    expect(compareClocks({ a: 2 }, { a: 1 })).toBe('a-dominates');
  });

  it('compareClocks b dominates a', () => {
    expect(compareClocks({ a: 1, b: 2 }, { a: 2, b: 2 })).toBe('b-dominates');
  });

  it('compareClocks concurrent when neither dominates', () => {
    expect(compareClocks({ a: 2 }, { b: 1 })).toBe('concurrent');
    expect(compareClocks({ a: 2, b: 1 }, { a: 1, b: 2 })).toBe('concurrent');
  });
});
