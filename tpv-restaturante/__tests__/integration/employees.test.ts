// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { employees } from '../../db/schema';

const dbData = new Map<object, any[]>();

function seed(table: object, data: any[]) { dbData.set(table, data); }
function resetTables() { dbData.clear(); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));
const mockBcrypt = vi.hoisted(() => ({
  hashSync: vi.fn((s: string) => 'hashed_' + s),
  compareSync: vi.fn((s: string, hash: string) => hash === 'hashed_' + s),
}));

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('bcryptjs', () => ({ default: mockBcrypt, ...mockBcrypt }));
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

function req(url = 'http://localhost', opts: any = {}): NextRequest {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.headers || {})) headers[k] = String(v);
  if (!headers['content-type']) headers['content-type'] = 'application/json';
  if (!headers['x-tenant-id']) headers['x-tenant-id'] = 'default';
  return new NextRequest(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }) as any;
}

beforeEach(() => {
  resetTables();
  mockRbac.authorized = true;
  mockRbac.employee = { id: 'e1', role: 'admin', tenantId: 'default' };
  (mockRbac as any).error = undefined;
  (mockRbac as any).status = undefined;
  mockBcrypt.compareSync.mockImplementation((s: string, hash: string) => hash === 'hashed_' + s);
  mockBcrypt.hashSync.mockImplementation((s: string) => 'hashed_' + s);
});

describe('GET /api/employees', () => {
  it('returns empty list when no employees', async () => {
    const { GET } = await import('../../app/api/employees/route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns employees from database', async () => {
    seed(employees, [
      { id: 'e1', name: 'Alice', role: 'admin', tenantId: 'default',
        personalDiscountEnabled: true, monthlyLimit: 100, monthlyUsed: 0, monthlyUsedMonth: '',
        position: 'Manager', workType: 'full', workPct: 100, dni: '12345',
        notes: '', whatsappCode: '', whatsappLinked: false, createdAt: 1000,
        pinHash: 'hashed_pin' },
      { id: 'e2', name: 'Bob', role: 'camarero', tenantId: 'default',
        personalDiscountEnabled: false, monthlyLimit: 0, monthlyUsed: 0, monthlyUsedMonth: '',
        position: '', workType: '', workPct: 100, dni: '',
        notes: '', whatsappCode: '', whatsappLinked: false, createdAt: 2000,
        pinHash: null },
    ]);
    const { GET } = await import('../../app/api/employees/route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe('Alice');
    expect(body[0].hasPin).toBe(true);
    expect(body[1].name).toBe('Bob');
    expect(body[1].hasPin).toBe(false);
  });
});

describe('PUT /api/employees', () => {
  it('requires admin role', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { PUT } = await import('../../app/api/employees/route');
    const res = await PUT(req('http://localhost', { method: 'PUT', body: [] }));
    expect(res.status).toBe(401);
  });

  it('upserts employees and deletes missing ones', async () => {
    seed(employees, [{ id: 'e3', tenantId: 'default', name: 'Old' }]);
    const { PUT } = await import('../../app/api/employees/route');
    const res = await PUT(req('http://localhost', {
      method: 'PUT',
      body: [
        { id: 'e1', name: 'Alice', role: 'admin', pin: '1234', position: 'Manager' },
        { id: 'e2', name: 'Bob', role: 'camarero' },
      ],
    }));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/employees', () => {
  it('verify action returns employee on valid PIN', async () => {
    seed(employees, [
      { id: 'e1', name: 'Alice', role: 'admin', tenantId: 'default',
        pinHash: 'hashed_1234', personalDiscountEnabled: true,
        monthlyLimit: 100, monthlyUsed: 50, monthlyUsedMonth: '202601' },
    ]);
    mockBcrypt.compareSync.mockImplementation((s: string, hash: string) => hash === 'hashed_1234');

    const { POST } = await import('../../app/api/employees/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'verify', pin: '1234' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Alice');
    expect(body.role).toBe('admin');
  });

  it('verify returns 401 on invalid PIN', async () => {
    seed(employees, [
      { id: 'e1', name: 'Alice', role: 'admin', tenantId: 'default', pinHash: 'hashed_wrong' },
    ]);
    mockBcrypt.compareSync.mockImplementation(() => false);

    const { POST } = await import('../../app/api/employees/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'verify', pin: 'wrong' },
    }));
    expect(res.status).toBe(401);
  });

  it('generate-codes requires admin', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { POST } = await import('../../app/api/employees/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'generate-codes' },
    }));
    expect(res.status).toBe(401);
  });

  it('link-whatsapp links by code', async () => {
    seed(employees, [
      { id: 'e1', name: 'Alice', tenantId: 'default', whatsappCode: 'ABC123', whatsappLinked: false },
    ]);

    const { POST } = await import('../../app/api/employees/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'link-whatsapp', code: 'ABC123' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.employeeName).toBe('Alice');
  });
});
