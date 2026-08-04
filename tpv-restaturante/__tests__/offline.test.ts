import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheGet, cacheSet, isOnline, onNetworkChange, getMutations, enqueueMutation, dequeueMutation, clearMutations, getDueMutations, computeBackoff, hashPayload, validateMutationPayload } from '../lib/offline';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('cacheGet / cacheSet', () => {
  it('stores and retrieves JSON data', () => {
    cacheSet('test', { a: 1, b: [2, 3] });
    expect(cacheGet('test')).toEqual({ a: 1, b: [2, 3] });
  });

  it('returns null for missing key', () => {
    expect(cacheGet('nonexistent')).toBeNull();
  });

  it('overwrites existing value', () => {
    cacheSet('key', 'first');
    cacheSet('key', 'second');
    expect(cacheGet('key')).toBe('second');
  });

  it('handles non-JSON gracefully', () => {
    localStorage.setItem('tpv:cache:bad', 'not-json');
    expect(cacheGet('bad')).toBeNull();
  });

  it('handles storage errors gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(() => cacheSet('x', 'y')).not.toThrow();
    spy.mockRestore();
  });
});

describe('mutation queue', () => {
  it('starts empty', () => {
    expect(getMutations()).toEqual([]);
  });

  it('enqueues a mutation with idempotencyKey and retry fields', () => {
    enqueueMutation({ key: '/api/test', payload: { foo: 1 } });
    const q = getMutations();
    expect(q).toHaveLength(1);
    expect(q[0].key).toBe('/api/test');
    expect(q[0].payload).toEqual({ foo: 1 });
    expect(q[0].createdAt).toBeGreaterThan(0);
    expect(q[0].idempotencyKey).toBeTruthy();
    expect(q[0].attempts).toBe(0);
    expect(q[0].nextRetryAt).toBe(q[0].createdAt);
  });

  it('deduplicates by idempotencyKey (same key + same idempotencyKey)', () => {
    enqueueMutation({ key: '/api/a', payload: { x: 1 }, idempotencyKey: 'k1' });
    enqueueMutation({ key: '/api/a', payload: { x: 2 }, idempotencyKey: 'k1' });
    const q = getMutations();
    expect(q).toHaveLength(1);
    expect(q[0].payload).toEqual({ x: 2 });
  });

  it('keeps different idempotencyKeys for the same endpoint', () => {
    enqueueMutation({ key: '/api/a', payload: { x: 1 }, idempotencyKey: 'k1' });
    enqueueMutation({ key: '/api/a', payload: { x: 2 }, idempotencyKey: 'k2' });
    expect(getMutations()).toHaveLength(2);
  });

  it('coalesces whole-resource mutations (only last state flushes)', () => {
    enqueueMutation({ key: '/api/floor', payload: { v: 1 } });
    enqueueMutation({ key: '/api/floor', payload: { v: 2 } });
    const q = getMutations();
    expect(q).toHaveLength(1);
    expect(q[0].payload).toEqual({ v: 2 });
  });

  it('parses pre-stringified payload shim', () => {
    enqueueMutation('/api/floor', '{"a":1}');
    expect(getMutations()[0].payload).toEqual({ a: 1 });
  });

  it('dequeues FIFO', () => {
    enqueueMutation({ key: '/api/a', payload: '1', idempotencyKey: 'k1' });
    enqueueMutation({ key: '/api/b', payload: '2', idempotencyKey: 'k2' });
    const m = dequeueMutation()!;
    expect(m.key).toBe('/api/a');
    expect(getMutations()).toHaveLength(1);
    expect(getMutations()[0].key).toBe('/api/b');
  });

  it('returns null when dequeuing empty queue', () => {
    expect(dequeueMutation()).toBeNull();
  });

  it('clears all mutations', () => {
    enqueueMutation({ key: '/api/a', payload: '1' });
    enqueueMutation({ key: '/api/b', payload: '2' });
    clearMutations();
    expect(getMutations()).toEqual([]);
  });

  it('handles corrupt queue data', () => {
    localStorage.setItem('tpv:mutations', 'corrupt');
    expect(getMutations()).toEqual([]);
    expect(dequeueMutation()).toBeNull();
  });
});

describe('mutation retry/backoff', () => {
  it('getDueMutations returns only due mutations', () => {
    enqueueMutation({ key: '/api/a', payload: { x: 1 } });
    const m = getMutations()[0];
    expect(getDueMutations(Date.now())).toHaveLength(1);
    expect(getDueMutations(m.nextRetryAt - 1000)).toHaveLength(0);
  });

  it('computeBackoff grows exponentially with jitter within bounds', () => {
    const results = [0, 1, 2, 3, 4, 5, 6, 7].map((attempts, i) => {
      const jitter = () => 0;
      return computeBackoff(attempts, jitter);
    });
    expect(results[0]).toBe(1000);
    expect(results[1]).toBe(2000);
    expect(results[2]).toBe(4000);
    expect(results[3]).toBe(8000);
    expect(results[4]).toBe(16000);
    expect(results[5]).toBe(32000);
    expect(results[6]).toBe(60000);
    expect(results[7]).toBe(60000);
  });

  it('hashPayload is stable and different for different payloads', () => {
    expect(hashPayload({ a: 1 })).toBe(hashPayload({ a: 1 }));
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });

  it('validateMutationPayload checks structural shape (object/array endpoints)', () => {
    expect(validateMutationPayload('/api/employees', [{ id: 'e1', name: 'Alice' }]).ok).toBe(true)
    expect(validateMutationPayload('/api/employees', []).ok).toBe(true)
    expect(validateMutationPayload('/api/employees', { id: 'e1' }).ok).toBe(false)
    expect(validateMutationPayload('/api/floor', { tables: [], orders: {} }).ok).toBe(true)
    expect(validateMutationPayload('/api/floor', []).ok).toBe(false)
    expect(validateMutationPayload('/api/unknown', { anything: true }).ok).toBe(true)
  });
});

describe('isOnline', () => {
  it('returns navigator.onLine', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    expect(isOnline()).toBe(true);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    expect(isOnline()).toBe(false);
  });
});

describe('onNetworkChange', () => {
  it('registers and fires listener on online event', () => {
    const fn = vi.fn();
    const unsubscribe = onNetworkChange(fn);
    window.dispatchEvent(new Event('online'));
    expect(fn).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it('registers and fires listener on offline event', () => {
    const fn = vi.fn();
    const unsubscribe = onNetworkChange(fn);
    window.dispatchEvent(new Event('offline'));
    expect(fn).toHaveBeenCalledWith(false);
    unsubscribe();
  });

  it('unsubscribe removes listener', () => {
    const fn = vi.fn();
    const unsubscribe = onNetworkChange(fn);
    unsubscribe();
    window.dispatchEvent(new Event('online'));
    expect(fn).not.toHaveBeenCalled();
  });
});
