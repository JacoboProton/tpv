import { describe, it, expect, vi, beforeEach } from 'vitest';
import { kdsPairings } from '../../db/schema';
import { req } from '../helpers/request';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));

vi.mock('@/lib/drizzle', () => {
  function thenable(data: any[]) {
    const p = Promise.resolve(data) as any;
    p.orderBy = () => p;
    p.limit = () => p;
    return p;
  }
  function from(table: any) {
    const data = dbData.get(table) || [];
    const p = thenable(data);
    p.where = () => thenable(data.filter((r: any) => !r.revoked));
    p.leftJoin = () => ({ where: () => thenable(data) });
    return p;
  }
  const db: any = {
    select: () => ({ from }),
    insert: () => ({ values: () => Promise.resolve([]) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
    delete: () => ({ where: () => Promise.resolve([]) }),
    transaction: (cb: any) => cb(db),
    execute: () => Promise.resolve({ rows: [] }),
  };
  return { getDb: () => db };
});

beforeEach(() => {
  dbData.clear();
  mockRbac.authorized = true;
  mockRbac.employee = { id: 'e1', role: 'admin', tenantId: 'default' };
  (mockRbac as any).error = undefined;
  (mockRbac as any).status = undefined;
});

describe('POST /api/kds verify', () => {
  it('pairs with valid code', async () => {
    seed(kdsPairings, [{
      id: 'k1', code: 'ABC123', label: 'Cocina', deviceId: '',
      expiresAt: Date.now() + 600000, createdAt: Date.now(), revoked: false, tenantId: 'default',
    }]);
    const { POST } = await import('../../app/api/kds/route');
    const res = await POST(req('http://localhost', {
      method: 'POST',
      body: { action: 'verify', code: 'ABC123', deviceId: 'dev1', label: 'Cocina' },
    }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deviceId).toBe('dev1');
    expect(body.pairing.label).toBe('Cocina');
  });

  it('rejects invalid code', async () => {
    const { POST } = await import('../../app/api/kds/route');
    const res = await POST(req('http://localhost', {
      method: 'POST',
      body: { action: 'verify', code: 'INVALID', deviceId: 'dev1' },
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Código inválido');
  });

  it('rejects revoked code', async () => {
    seed(kdsPairings, [{
      id: 'k1', code: 'ABC123', label: 'Cocina', deviceId: '',
      expiresAt: Date.now() + 600000, createdAt: Date.now(), revoked: true, tenantId: 'default',
    }]);
    const { POST } = await import('../../app/api/kds/route');
    const res = await POST(req('http://localhost', {
      method: 'POST',
      body: { action: 'verify', code: 'ABC123', deviceId: 'dev1' },
    }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/kds generate', () => {
  it('generates a new code', async () => {
    const { POST } = await import('../../app/api/kds/route');
    const res = await POST(req('http://localhost', {
      method: 'POST',
      body: { action: 'generate', label: 'Cocina2' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBeDefined();
    expect(body.code.length).toBe(6);
  });

  it('requires auth', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { POST } = await import('../../app/api/kds/route');
    const res = await POST(req('http://localhost', {
      method: 'POST',
      body: { action: 'generate' },
    }));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/kds', () => {
  it('returns paired status when deviceId is provided and found', async () => {
    seed(kdsPairings, [{
      id: 'k1', code: 'ABC123', label: 'Cocina', deviceId: 'dev1',
      expiresAt: Date.now() + 600000, createdAt: Date.now(), revoked: false, tenantId: 'default',
    }]);
    const { GET } = await import('../../app/api/kds/route');
    const res = await GET(req('http://localhost?deviceId=dev1'));
    const body = await res.json();
    expect(body.paired).toBe(true);
    expect(body.pairing.deviceId).toBe('dev1');
  });

  it('returns not paired when deviceId not found', async () => {
    const { GET } = await import('../../app/api/kds/route');
    const res = await GET(req('http://localhost?deviceId=nonexistent'));
    const body = await res.json();
    expect(body.paired).toBe(false);
  });
});
