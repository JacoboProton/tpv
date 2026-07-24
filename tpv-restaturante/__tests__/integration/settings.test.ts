import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settings } from '../../db/schema';
import { req } from '../helpers/request';

const dbData = new Map<object, any[]>();

function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));

let invalidateCalled = false;
vi.mock('@/lib/settings-cache', () => ({ invalidateSettingsCache: () => { invalidateCalled = true; } }));

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
  invalidateCalled = false;
  mockRbac.authorized = true;
  mockRbac.employee = { id: 'e1', role: 'admin', tenantId: 'default' };
  (mockRbac as any).error = undefined;
  (mockRbac as any).status = undefined;
});

describe('GET /api/settings', () => {
  it('returns settings as key-value object', async () => {
    seed(settings, [
      { key: 'site_name', value: 'My Restaurant' },
      { key: 'currency', value: 'EUR' },
    ]);
    const { GET } = await import('../../app/api/settings/route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.site_name).toBe('My Restaurant');
    expect(body.currency).toBe('EUR');
  });

  it('returns empty object when no settings', async () => {
    const { GET } = await import('../../app/api/settings/route');
    const res = await GET(req());
    const body = await res.json();
    expect(body).toEqual({});
  });

});

describe('PUT /api/settings', () => {
  it('upserts settings', async () => {
    const { PUT } = await import('../../app/api/settings/route');
    const res = await PUT(req('http://localhost', {
      method: 'PUT',
      body: { site_name: 'Updated', currency: 'USD' },
    }));
    expect(res.status).toBe(200);
    expect(invalidateCalled).toBe(true);
  });
});
