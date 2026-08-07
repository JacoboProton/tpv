import { describe, it, expect, beforeEach } from 'vitest';
import { getLocalClock, getLocalUpdatedAt, advanceLocalClock, mergeLocalClock } from '../lib/floor-vc';

describe('lib/floor-vc', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty clock', () => {
    expect(getLocalClock()).toEqual({});
    expect(getLocalUpdatedAt()).toBe(0);
  });

  it('advances the clock and persists it', () => {
    const first = advanceLocalClock();
    expect(first.vectorClock).not.toEqual({});
    expect(first.updatedAt).toBeGreaterThan(0);
    expect(getLocalUpdatedAt()).toBe(first.updatedAt);
    expect(getLocalClock()).toEqual(first.vectorClock);
  });

  it('advanceLocalClock increments the same device entry', () => {
    const a = advanceLocalClock();
    const b = advanceLocalClock();
    const device = Object.keys(a.vectorClock)[0];
    expect(b.vectorClock[device]).toBe((a.vectorClock[device] as number) + 1);
  });

  it('mergeLocalClock merges incoming values', () => {
    advanceLocalClock();
    mergeLocalClock({ 'other-device': 5 });
    const clock = getLocalClock();
    expect(clock['other-device']).toBe(5);
  });

  it('mergeLocalClock ignores nullish and non-object input', () => {
    advanceLocalClock();
    const before = getLocalClock();
    mergeLocalClock(null);
    mergeLocalClock(undefined);
    expect(getLocalClock()).toEqual(before);
  });

  it('recovers from corrupt localStorage JSON', () => {
    localStorage.setItem('tpv:floor-vc', '{not json');
    expect(getLocalClock()).toEqual({});
  });
});