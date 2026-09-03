// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { employees } from '../../db/schema';
import { req } from '../helpers/request';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));
const mockBcrypt = vi.hoisted(() => ({
  hashSync: vi.fn((s: string) => 'hashed_' + s),
  compareSync: vi.fn((s: string, hash: string) => hash === 'hashed_' + s),
}));

const mockRate = vi.hoisted(() => ({
  blockMs: 0,
  verifyFailCalls: 0,
  failAllowed: true,
  getBlockMillis: vi.fn(async () => mockRate.blockMs),
  setBlock: vi.fn(async (key: string, ms: number) => { mockRate.blockMs = ms; }),
  rateLimit: vi.fn(async (key: string, max: number, windowMs: number) => {
    if (key.startsWith('verify-fail:')) {
      mockRate.verifyFailCalls += 1;
      return { allowed: mockRate.failAllowed, remaining: 0, reset: Date.now() + windowMs };
    }
    return { allowed: true, remaining: max - 1, reset: Date.now() + windowMs };
  }),
  getClientIp: vi.fn(() => '1.2.3.4'),
}));

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('bcryptjs', () => ({ default: mockBcrypt, ...mockBcrypt }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mockRate.rateLimit,
  getClientIp: mockRate.getClientIp,
  getBlockMillis: mockRate.getBlockMillis,
  setBlock: mockRate.setBlock,
}));

vi.mock('@/lib/drizzle', () => {
  function thenable(data: any[]) {
    const p = Promise.resolve(data) as any;
    p.orderBy = () => p;
    return p;
  }
  function from(table: any) { return { where: () => thenable(dbData.get(table) || []) }; }
  return { getDb: () => ({ select: () => ({ from }), update: () => ({ set: () => ({ where: () => Promise.resolve() }) }), insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }) }) };
});

vi.mock('@/lib/idempotency', () => ({ withIdempotency: (_req: any, _path: string, fn: any) => fn() }));
vi.mock('@/lib/auth/jwt', () => ({ signLoginTicket: async () => 'ticket-123' }));

beforeEach(() => {
  dbData.clear();
  mockRate.blockMs = 0;
  mockRate.verifyFailCalls = 0;
  mockRate.failAllowed = true;
  mockRate.getBlockMillis.mockClear();
  mockRate.setBlock.mockClear();
  mockRate.rateLimit.mockClear();
});

describe('POST /api/employees verify lockout', () => {
  it('accepts a valid PIN when no server block is active', async () => {
    seed(employees, [
      { id: 'e1', name: 'Alice', role: 'admin', tenantId: 'default',
        pinHash: 'hashed_1234' },
    ]);
    mockBcrypt.compareSync.mockImplementation((s: string, hash: string) => hash === 'hashed_1234');

    const { POST } = await import('../../app/api/employees/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'verify', pin: '1234' },
    }));
    expect(res.status).toBe(200);
    expect(mockRate.setBlock).not.toHaveBeenCalled();
  });

  it('rejects even a valid PIN while the server block is active (not bypassable client-side)', async () => {
    seed(employees, [
      { id: 'e1', name: 'Alice', role: 'admin', tenantId: 'default',
        pinHash: 'hashed_1234' },
    ]);
    mockBcrypt.compareSync.mockImplementation((s: string, hash: string) => hash === 'hashed_1234');
    mockRate.blockMs = 5 * 60 * 1000;

    const { POST } = await import('../../app/api/employees/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'verify', pin: '1234' },
    }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Demasiados intentos fallidos/);
  });

  it('sets the server block once the failure threshold is reached', async () => {
    seed(employees, [
      { id: 'e1', name: 'Alice', role: 'admin', tenantId: 'default', pinHash: 'hashed_x' },
    ]);
    mockBcrypt.compareSync.mockImplementation(() => false);
    mockRate.failAllowed = false;

    const { POST } = await import('../../app/api/employees/route');
    const res = await POST(req('http://localhost', {
      method: 'POST', body: { action: 'verify', pin: 'wrong' },
    }));
    expect(res.status).toBe(401);
    expect(mockRate.setBlock).toHaveBeenCalledWith('verify-block:1.2.3.4', 5 * 60 * 1000);
  });
});
