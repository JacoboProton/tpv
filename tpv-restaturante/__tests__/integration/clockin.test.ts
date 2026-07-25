import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clockinLogs } from '../../db/schema';
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
    insert: () => ({
      values: () => Promise.resolve([]),
    }),
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

describe('GET /api/clockin', () => {
  it('requires auth', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { GET } = await import('../../app/api/clockin/route');
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns 400 when no employeeId and no from/to', async () => {
    const { GET } = await import('../../app/api/clockin/route');
    const res = await GET(req());
    expect(res.status).toBe(400);
  });

  it('returns logs with summary for employee on date', async () => {
    const now = Date.now();
    seed(clockinLogs, [
      { id: 1, employeeId: 'e1', employeeName: 'Alice', action: 'entrada', method: 'pin', clockinDate: new Date().toISOString().slice(0, 10), createdAt: now - 3600000, edited: false, editedBy: '', editReason: '', signature: '', tenantId: 'default' },
      { id: 2, employeeId: 'e1', employeeName: 'Alice', action: 'pausa', method: 'pin', clockinDate: new Date().toISOString().slice(0, 10), createdAt: now - 1800000, edited: false, editedBy: '', editReason: '', signature: '', tenantId: 'default' },
      { id: 3, employeeId: 'e1', employeeName: 'Alice', action: 'vuelta', method: 'pin', clockinDate: new Date().toISOString().slice(0, 10), createdAt: now - 900000, edited: false, editedBy: '', editReason: '', signature: '', tenantId: 'default' },
    ]);
    const { GET } = await import('../../app/api/clockin/route');
    const res = await GET(req('http://localhost?employeeId=e1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBeDefined();
    expect(body.summary.lastAction).toBe('vuelta');
    expect(body.summary.isActive).toBe(true);
    expect(body.logs).toHaveLength(3);
  });

  it('returns logs with from/to range', async () => {
    seed(clockinLogs, [
      { id: 1, employeeId: 'e1', employeeName: 'Alice', action: 'entrada', method: 'pin', clockinDate: '2025-01-01', createdAt: 1000, edited: false, editedBy: '', editReason: '', signature: '', tenantId: 'default' },
    ]);
    const { GET } = await import('../../app/api/clockin/route');
    const res = await GET(req('http://localhost?from=2025-01-01&to=2025-01-31'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});
