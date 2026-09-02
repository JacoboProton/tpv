import { describe, it, expect } from 'vitest';
import { rateLimit, checkRateLimit, getClientIp } from '../lib/rate-limit';

describe('lib/rate-limit (mem fallback)', () => {
  it('allows up to max and then rejects within the window', async () => {
    const key = 'mem-test-1';
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(await rateLimit(key, 3, 60_000));
    }
    expect(results.map(r => r.allowed)).toEqual([true, true, true, false]);
    expect(results[0].remaining).toBe(2);
    expect(results[1].remaining).toBe(1);
    expect(results[2].remaining).toBe(0);
    expect(results[3].remaining).toBe(0);
    expect(results[0].reset).toBeGreaterThan(0);
  });

  it('starts a fresh window for an unknown key', async () => {
    const first = await rateLimit('mem-fresh', 2, 60_000);
    expect(first).toMatchObject({ allowed: true, remaining: 1 });
  });

  it('keeps buckets isolated per key', async () => {
    await rateLimit('mem-key-a', 1, 60_000);
    const b = await rateLimit('mem-key-b', 1, 60_000);
    expect(b.allowed).toBe(true);
  });

  it('checkRateLimit maps to allowed/remaining/resetAt', async () => {
    const a = await checkRateLimit('mem-check-1', 2, 60_000);
    expect(a).toMatchObject({ allowed: true, remaining: 1 });
    expect(a.resetAt).toBeGreaterThan(0);
    const b = await checkRateLimit('mem-check-2', 1, 60_000);
    expect(b.remaining).toBe(0);
    const c = await checkRateLimit('mem-check-2', 1, 60_000);
    expect(c).toMatchObject({ allowed: false, remaining: 0 });
  });
});

describe('lib/rate-limit getClientIp', () => {
  function req(headers: Record<string, string>): Request {
    return new Request('http://localhost/api/x', { headers });
  }

  it('uses the trusted peer-ip header (set by custom server) first', () => {
    expect(getClientIp(req({
      'x-tpv-peer-ip': '203.0.113.7',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      'x-real-ip': '9.9.9.9',
    }))).toBe('203.0.113.7');
  });

  it('uses x-forwarded-for first address when no peer-ip', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
    expect(getClientIp(req({ 'x-forwarded-for': ' 10.0.0.1 ' }))).toBe('10.0.0.1');
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIp(req({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
  });

  it('falls back to loopback when no header present', () => {
    expect(getClientIp(req({}))).toBe('127.0.0.1');
  });
});