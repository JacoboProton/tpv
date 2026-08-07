import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { idempotencyKeys } from '../db/schema';

const stored: any[] = [];
const dbData = new Map<object, any[]>();
let deleteValue = 5;
function seed(table: object, data: any[]) { dbData.set(table, data); }

vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));

vi.mock('@/lib/drizzle', () => {
  function chain(data: any[]) {
    const p: any = Promise.resolve(data);
    p.limit = () => p;
    return p;
  }
  function from(table: any) {
    return {
      where: () => chain(dbData.get(table) || []),
    };
  }
  const db: any = {
    insert: () => ({
      values: (v: any) => {
        stored.push(v);
        return { onConflictDoNothing: () => Promise.resolve() };
      },
    }),
    select: () => ({ from }),
    delete: () => ({
      where: () => Promise.resolve({ rowCount: deleteValue }),
    }),
  };
  return { getDb: () => db };
});

import {
  getStoredIdempotencyResponse,
  storeIdempotencyResponse,
  cleanupExpiredIdempotency,
  withIdempotency,
} from '../lib/idempotency';

function reqWithKey(key: string, method = 'PUT'): NextRequest {
  return new NextRequest('http://localhost/api/x', {
    method,
    headers: { 'x-idempotency-key': key },
  });
}

beforeEach(() => {
  dbData.clear();
  stored.length = 0;
  deleteValue = 5;
});

describe('lib/idempotency', () => {
  it('returns null when no idempotency key is present', async () => {
    const req = new NextRequest('http://localhost/api/x', { method: 'PUT' });
    await expect(getStoredIdempotencyResponse(req)).resolves.toBeNull();
  });

  it('returns null when there is no stored response', async () => {
    const req = reqWithKey('k1');
    await expect(getStoredIdempotencyResponse(req)).resolves.toBeNull();
  });

  it('returns the stored response when present and not expired', async () => {
    seed(idempotencyKeys, [{
      tenantId: 'default', idempotencyKey: 'k1',
      responseBody: { ok: true }, status: 201, expiresAt: Date.now() + 1000,
    }]);
    const req = reqWithKey('k1');
    const res = await getStoredIdempotencyResponse(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(201);
    expect(await res!.json()).toEqual({ ok: true });
  });

  it('returns null when the stored response is expired', async () => {
    seed(idempotencyKeys, [{
      tenantId: 'default', idempotencyKey: 'k1',
      responseBody: { ok: true }, status: 200, expiresAt: Date.now() - 10,
    }]);
    const req = reqWithKey('k1');
    await expect(getStoredIdempotencyResponse(req)).resolves.toBeNull();
  });

  it('storeIdempotencyResponse persists a row with a TTL', async () => {
    await storeIdempotencyResponse(reqWithKey('k2'), 200, { ok: true }, 'PUT', '/api/x');
    expect(stored).toHaveLength(1);
    expect(stored[0].idempotencyKey).toBe('k2');
    expect(stored[0].endpoint).toBe('/api/x');
    expect(stored[0].method).toBe('PUT');
    expect(stored[0].status).toBe(200);
    expect(stored[0].expiresAt).toBeGreaterThan(stored[0].createdAt);
  });

  it('storeIdempotencyResponse no-ops without a key', async () => {
    const req = new NextRequest('http://localhost/api/x', { method: 'PUT' });
    await storeIdempotencyResponse(req, 200, { ok: true });
    expect(stored).toHaveLength(0);
  });

  it('cleanupExpiredIdempotency deletes expired rows and returns count', async () => {
    await expect(cleanupExpiredIdempotency()).resolves.toBe(5);
  });

  it('withIdempotency runs the handler when there is no key', async () => {
    const req = new NextRequest('http://localhost/api/x', { method: 'PUT' });
    const handler = vi.fn();
    (handler as any).mockResolvedValueOnce(new Response('fn({ ok: true })'));
    const res = await withIdempotency(req as any, '/api/x', handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it('withIdempotency returns the stored response on replay', async () => {
    seed(idempotencyKeys, [{
      tenantId: 'default', idempotencyKey: 'k9',
      responseBody: { ok: true }, status: 200, expiresAt: Date.now() + 1000,
    }]);
    const handler = vi.fn();
    const res = await withIdempotency(reqWithKey('k9') as any, '/api/x', handler);
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('withIdempotency caches successful responses', async () => {
    const handler = vi.fn();
    (handler as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ done: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const req = reqWithKey('k5');
    const res = await withIdempotency(req as any, '/api/x', handler);
    expect(res.status).toBe(200);
    expect(stored).toHaveLength(1);
  });

  it('withIdempotency does not cache error responses', async () => {
    const handler = vi.fn();
    (handler as any).mockResolvedValueOnce(new Response('err', { status: 500 }));
    const res = await withIdempotency(reqWithKey('k6') as any, '/api/x', handler);
    expect(res.status).toBe(500);
    expect(stored).toHaveLength(0);
  });
});