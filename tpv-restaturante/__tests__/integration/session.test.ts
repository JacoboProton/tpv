// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sessions, employees } from '../../db/schema';
import { req } from '../helpers/request';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));

const mockJwt = vi.hoisted(() => ({
  verifyLoginTicket: vi.fn(),
  signSessionToken: vi.fn(),
  cookieOptions: vi.fn(() => ({ httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 1000 })),
  JWT_COOKIE: 'tpv_session',
}));

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));
vi.mock('@/lib/auth/jwt', () => mockJwt);

vi.mock('@/lib/drizzle', () => {
  function whereResult(data: any[]) {
    const p = Promise.resolve(data);
    (p as any).orderBy = () => p;
    (p as any).limit = () => p;
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

let signedClaims: Record<string, unknown> | null = null;

beforeEach(() => {
  dbData.clear();
  signedClaims = null;
  mockRbac.authorized = true;
  mockRbac.employee = { id: 'e1', role: 'admin', tenantId: 'default' };
  (mockRbac as any).error = undefined;
  (mockRbac as any).status = undefined;
  mockJwt.verifyLoginTicket.mockReset();
  mockJwt.signSessionToken.mockReset();
  mockJwt.verifyLoginTicket.mockResolvedValue({ sub: 'e1', tenantId: 'default', deviceId: 'device1', exp: Date.now() + 1000 });
  mockJwt.signSessionToken.mockImplementation((claims: Record<string, unknown>) => {
    signedClaims = claims;
    return Promise.resolve('token.abc.def');
  });
});

describe('POST /api/sessions — login', () => {
  it('rejects login without a valid login ticket', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', { method: 'POST', body: { action: 'login', employeeId: 'e1', employeeRole: 'admin', deviceId: 'device1' } }));
    expect(res.status).toBe(401);
  });

  it('rejects login with an invalid login ticket', async () => {
    mockJwt.verifyLoginTicket.mockResolvedValue(null);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', { method: 'POST', body: { action: 'login', deviceId: 'device1', loginTicket: 'basura' } }));
    expect(res.status).toBe(401);
  });

  it('rejects login when the employee does not exist', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', { method: 'POST', body: { action: 'login', employeeId: 'e1', deviceId: 'device1', loginTicket: 'tk' } }));
    expect(res.status).toBe(401);
  });

  it('returns conflict when session exists on another device', async () => {
    seed(employees, [{ id: 'e1', role: 'camarero' }]);
    seed(sessions, [{ tenantId: 'default', employeeId: 'e1', deviceId: 'device2', active: true, createdAt: 1000, lastSeen: 1000, role: 'camarero' }]);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'login', employeeId: 'e1', employeeRole: 'camarero', deviceId: 'device1', loginTicket: 'tk' },
    }));
    const body = await res.json();
    expect(body.conflict).toBe(true);
  });

  it('bypasses conflict for admin without force flag', async () => {
    seed(employees, [{ id: 'e1', role: 'admin' }]);
    seed(sessions, [{ tenantId: 'default', employeeId: 'e1', deviceId: 'device2', active: true, createdAt: 1000, lastSeen: 1000, role: 'admin' }]);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'login', employeeId: 'e1', employeeRole: 'camarero', deviceId: 'device1', loginTicket: 'tk' },
    }));
    expect(res.status).toBe(200);
  });

  it('successfully logs in when no conflict', async () => {
    seed(employees, [{ id: 'e1', role: 'admin' }]);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'login', employeeId: 'e1', employeeRole: 'camarero', deviceId: 'device1', loginTicket: 'tk' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe('token.abc.def');
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('tpv_session=');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
  });

  it('derives the role from the DB and ignores the client-supplied role', async () => {
    seed(employees, [{ id: 'e1', role: 'camarero' }]);
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'login', employeeId: 'e1', employeeRole: 'admin', deviceId: 'device1', loginTicket: 'tk' },
    }));
    expect(res.status).toBe(200);
    expect(signedClaims).toEqual({ sub: 'e1', role: 'camarero', tenantId: 'default', deviceId: 'device1' });
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
  it('returns invalidated when no active session', async () => {
    const { POST } = await import('../../app/api/session/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'keepalive', employeeId: 'e1', deviceId: 'd1' },
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.invalidated).toBe(true);
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
