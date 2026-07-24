import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sessions } from '../../db/schema';
import { req } from '../helpers/request';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));

vi.mock('@/lib/drizzle', () => {
  function whereResult(data: any[]) {
    const p = Promise.resolve(data);
    (p as any).orderBy = () => p;
    return p;
  }
  function from(table: any) {
    return { where: () => whereResult(dbData.get(table) || []) };
  }
  const db: any = {
    select: () => ({ from }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: () => Promise.resolve([]) }) }),
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

describe('POST /api/sessions — login', () => {
  it('requires employeeId and deviceId', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', { method: 'POST', body: { action: 'login' } }));
    expect(res.status).toBe(400);
  });

  it('returns conflict when session exists on another device', async () => {
    seed(sessions, [{ tenantId: 'default', employeeId: 'e1', deviceId: 'device2', active: true, createdAt: 1000, lastSeen: 1000, role: 'camarero' }]);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'login', employeeId: 'e1', employeeRole: 'camarero', deviceId: 'device1' },
    }));
    const body = await res.json();
    expect(body.conflict).toBe(true);
  });

  it('bypasses conflict for admin without force flag', async () => {
    seed(sessions, [{ tenantId: 'default', employeeId: 'e1', deviceId: 'device2', active: true, createdAt: 1000, lastSeen: 1000, role: 'admin' }]);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'login', employeeId: 'e1', employeeRole: 'admin', deviceId: 'device1' },
    }));
    expect(res.status).toBe(200);
  });

  it('successfully logs in when no conflict', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'login', employeeId: 'e1', employeeRole: 'admin', deviceId: 'device1' },
    }));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/sessions — logout', () => {
  it('requires auth', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'logout', employeeId: 'e1', deviceId: 'd1' },
    }));
    expect(res.status).toBe(401);
  });

  it('requires employeeId and deviceId', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'logout' },
    }));
    expect(res.status).toBe(400);
  });

  it('successfully logs out', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'logout', employeeId: 'e1', deviceId: 'd1' },
    }));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/sessions — keepalive', () => {
  it('requires auth', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'keepalive', employeeId: 'e1', deviceId: 'd1' },
    }));
    expect(res.status).toBe(401);
  });

  it('returns 200 when session is active', async () => {
    seed(sessions, [{ tenantId: 'default', employeeId: 'e1', deviceId: 'd1', active: true, lastSeen: 1000 }]);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'keepalive', employeeId: 'e1', deviceId: 'd1' },
    }));
    expect(res.status).toBe(200);
  });

  it('returns invalidated when session is inactive', async () => {
    seed(sessions, [{ tenantId: 'default', employeeId: 'e1', deviceId: 'd1', active: false, lastSeen: 1000 }]);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'keepalive', employeeId: 'e1', deviceId: 'd1' },
    }));
    const body = await res.json();
    expect(body.invalidated).toBe(true);
  });

  it('returns invalidated when no session exists', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'keepalive', employeeId: 'e1', deviceId: 'd1' },
    }));
    const body = await res.json();
    expect(body.invalidated).toBe(true);
  });
});

describe('POST /api/sessions — unknown action', () => {
  it('returns 400 for unknown action', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'nonexistent' },
    }));
    expect(res.status).toBe(400);
  });
});
