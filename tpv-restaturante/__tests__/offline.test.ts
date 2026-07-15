import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheGet, cacheSet, isOnline, onNetworkChange, getMutations, enqueueMutation, dequeueMutation, clearMutations } from '../lib/offline';

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

  it('enqueues a mutation', () => {
    enqueueMutation('/api/test', '{"foo":1}');
    const q = getMutations();
    expect(q).toHaveLength(1);
    expect(q[0].key).toBe('/api/test');
    expect(q[0].payload).toBe('{"foo":1}');
    expect(q[0].createdAt).toBeGreaterThan(0);
  });

  it('enqueues multiple mutations in order', () => {
    enqueueMutation('/api/a', '1');
    enqueueMutation('/api/b', '2');
    expect(getMutations()).toHaveLength(2);
    expect(getMutations()[0].key).toBe('/api/a');
    expect(getMutations()[1].key).toBe('/api/b');
  });

  it('dequeues FIFO', () => {
    enqueueMutation('/api/first', '1');
    enqueueMutation('/api/second', '2');
    const m = dequeueMutation()!;
    expect(m.key).toBe('/api/first');
    expect(getMutations()).toHaveLength(1);
    expect(getMutations()[0].key).toBe('/api/second');
  });

  it('returns null when dequeuing empty queue', () => {
    expect(dequeueMutation()).toBeNull();
  });

  it('clears all mutations', () => {
    enqueueMutation('/api/a', '1');
    enqueueMutation('/api/b', '2');
    clearMutations();
    expect(getMutations()).toEqual([]);
  });

  it('handles corrupt queue data', () => {
    localStorage.setItem('tpv:mutations', 'corrupt');
    expect(getMutations()).toEqual([]);
    expect(dequeueMutation()).toBeNull();
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
