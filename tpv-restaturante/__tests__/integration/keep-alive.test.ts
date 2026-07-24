import { describe, it, expect, vi, beforeEach } from 'vitest';
import { req } from '../helpers/request';

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));
vi.mock('@/lib/drizzle', () => ({
  getDb: () => ({ execute: () => Promise.resolve({ rows: [] }) }),
}));

beforeEach(() => {
  mockRbac.authorized = true;
  mockRbac.employee = { id: 'e1', role: 'admin', tenantId: 'default' };
  (mockRbac as any).error = undefined;
  (mockRbac as any).status = undefined;
});

describe('GET /api/keep-alive', () => {
  it('returns 200 when authorized', async () => {
    const { GET } = await import('../../app/api/keep-alive/route');
    const res = await GET(req());
    expect(res.status).toBe(200);
  });

  it('returns 401 when not authorized', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { GET } = await import('../../app/api/keep-alive/route');
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});
