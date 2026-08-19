// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { employees } from '../../db/schema';
import { req } from '../helpers/request';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default', getPublicTenantId: () => 'default' }));

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
    select: (cols: any) => ({ from: (t: any) => ({ where: () => whereResult(dbData.get(t) || []) }) }),
  };
  return { getDb: () => db };
});

beforeEach(() => {
  dbData.clear();
});

describe('GET /api/fichar/employees — kiosco público', () => {
  it('returns only id, name and position (no sensitive fields)', async () => {
    seed(employees, [
      { id: 'e1', tenantId: 'default', name: 'Ana', position: 'Camarera', role: 'camarero', pinHash: 'secret-hash', monthlyLimit: '0' },
      { id: 'e2', tenantId: 'default', name: 'Luis', position: '', role: 'admin', pinHash: 'otro-hash', monthlyLimit: '9999' },
    ]);
    const { GET } = await import('../../app/api/fichar/employees/route');
    const res = await GET(req('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual([
      { id: 'e1', name: 'Ana', position: 'Camarera' },
      { id: 'e2', name: 'Luis', position: '' },
    ]);
    for (const emp of body) {
      expect(emp).not.toHaveProperty('role');
      expect(emp).not.toHaveProperty('pinHash');
      expect(emp).not.toHaveProperty('monthlyLimit');
    }
  });
});
