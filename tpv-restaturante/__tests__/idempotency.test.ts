import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { idempotencyKeys } from '../db/schema';

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
        const rows = dbData.get(idempotencyKeys) || [];
        const exists = rows.some(r => r.tenantId === v.tenantId && r.idempotencyKey === v.idempotencyKey);
        if (!exists) rows.push(v);
        dbData.set(idempotencyKeys, rows);
        return {
          onConflictDoNothing: () => Promise.resolve({ rowCount: exists ? 0 : 1 }),
        };
      },
    }),
    update: () => ({
      set: (v: any) => ({
        where: () => {
          const rows = dbData.get(idempotencyKeys) || [];
          const idx = rows.findIndex(r => r.tenantId === 'default' && r.idempotencyKey === (v.idempotencyKey ?? rows[0]?.idempotencyKey));
          if (idx >= 0) rows[idx] = { ...rows[idx], ...v };
          dbData.set(idempotencyKeys, rows);
          return Promise.resolve({ rowCount: idx >= 0 ? 1 : 0 });
        },
      }),
    }),
    select: () => ({ from }),
    delete: () => ({
      where: () => {
        if (dbData.has(idempotencyKeys)) {
          const rows = dbData.get(idempotencyKeys)!;
          dbData.set(idempotencyKeys, []);
          return Promise.resolve({ rowCount: rows.length });
        }
        return Promise.resolve({ rowCount: deleteValue });
      },
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

  it('returns null for in-flight (processing) rows', async () => {
    seed(idempotencyKeys, [{
      tenantId: 'default', idempotencyKey: 'k1',
      responseBody: null, status: 0, expiresAt: Date.now() + 1000,
    }]);
    const req = reqWithKey('k1');
    await expect(getStoredIdempotencyResponse(req)).resolves.toBeNull();
  });

  it('storeIdempotencyResponse persists a row with a TTL', async () => {
    await storeIdempotencyResponse(reqWithKey('k2'), 200, { ok: true }, 'PUT', '/api/x');
    const rows = dbData.get(idempotencyKeys) || [];
    expect(rows).toHaveLength(1);
    expect(rows[0].idempotencyKey).toBe('k2');
    expect(rows[0].endpoint).toBe('/api/x');
    expect(rows[0].method).toBe('PUT');
    expect(rows[0].status).toBe(200);
    expect(rows[0].expiresAt).toBeGreaterThan(rows[0].createdAt);
  });

  it('storeIdempotencyResponse no-ops without a key', async () => {
    const req = new NextRequest('http://localhost/api/x', { method: 'PUT' });
    await storeIdempotencyResponse(req, 200, { ok: true });
    expect(dbData.get(idempotencyKeys) || []).toHaveLength(0);
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

  it('withIdempotency returns the stored response on replay (claim lost)', async () => {
    seed(idempotencyKeys, [{
      tenantId: 'default', idempotencyKey: 'k9',
      responseBody: { ok: true }, status: 200, expiresAt: Date.now() + 1000,
    }]);
    const handler = vi.fn();
    const res = await withIdempotency(reqWithKey('k9') as any, '/api/x', handler);
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('withIdempotency claims the key and caches successful responses', async () => {
    const handler = vi.fn();
    (handler as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ done: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const req = reqWithKey('k5');
    const res = await withIdempotency(req as any, '/api/x', handler);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    const rows = dbData.get(idempotencyKeys) || [];
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(200);
    expect(rows[0].responseBody).toEqual({ done: true });
  });

  it('withIdempotency does not run the handler twice for concurrent same-key requests', async () => {
    let calls = 0;
    const handler = vi.fn(async () => {
      calls += 1;
      return new Response(JSON.stringify({ ok: true, calls }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    const first = await withIdempotency(reqWithKey('conc') as any, '/api/x', handler);
    expect(first.status).toBe(200);
    expect(calls).toBe(1);

    const replay = await withIdempotency(reqWithKey('conc') as any, '/api/x', handler);
    expect(replay.status).toBe(200);
    expect(calls).toBe(1);
    expect(await replay.clone().json()).toEqual({ ok: true, calls: 1 });
  });

  it('withIdempotency returns 425 while a request is still in flight', async () => {
    seed(idempotencyKeys, [{
      tenantId: 'default', idempotencyKey: 'inflight',
      responseBody: null, status: 0, expiresAt: Date.now() + 1000,
    }]);
    const handler = vi.fn();
    const res = await withIdempotency(reqWithKey('inflight') as any, '/api/x', handler);
    expect(res.status).toBe(425);
    expect(handler).not.toHaveBeenCalled();
  });

  it('withIdempotency does not cache error responses', async () => {
    const handler = vi.fn();
    (handler as any).mockResolvedValueOnce(new Response('err', { status: 500 }));
    const res = await withIdempotency(reqWithKey('k6') as any, '/api/x', handler);
    expect(res.status).toBe(500);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(dbData.get(idempotencyKeys) || []).toHaveLength(0);
  });
});