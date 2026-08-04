// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import { apiKeys } from '../../db/schema';

const stored: any[] = [];
const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }
function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

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
    insert: () => ({ values: (v: any) => { stored.push(v); return db; } }),
    update: () => ({ set: () => ({ where: () => Promise.resolve({ rowCount: 0 }) }) }),
    delete: () => ({ where: () => Promise.resolve({ rowCount: 0 }) }),
    select: () => ({ from }),
  };
  return { getDb: () => db };
});

import { createApiKey, hashApiKey, verifyApiKey } from '../../lib/auth/api-keys';

beforeEach(() => {
  dbData.clear();
  mockRbac.authorized = true;
  (mockRbac as any).error = undefined;
  (mockRbac as any).status = undefined;
});

describe('lib/auth/api-keys', () => {
  it('creates an API key with hashed value', async () => {
    const { row, key } = await createApiKey('default', 'pos', 'Terminal 1');
    expect(key.startsWith('tpv_pos_')).toBe(true);
    expect(row.keyPrefix).toBe(key.slice(0, 12) + '…');
    expect(row.active).toBe(true);
    expect(row.clientType).toBe('pos');
    expect(hashApiKey(key)).not.toBe(key);
  });

  it('hashing is deterministic and not reversible to plaintext', () => {
    const key = 'tpv_mobile_rawvalue';
    const h = hashApiKey(key);
    expect(h).toBe(sha256(key));
    expect(h).not.toBe(key);
  });

  it('verifyApiKey returns the active row matching the raw key', async () => {
    const raw = 'tpv_pos_secret_123';
    seed(apiKeys, [{
      id: 'ak_1', tenantId: 'default', clientType: 'pos', label: 'T1',
      keyHash: hashApiKey(raw), keyPrefix: 'tpv_pos_sec…', active: true,
      createdAt: 1, rotatedAt: null, lastUsedAt: null,
    }]);
    const row = await verifyApiKey(raw, 'default');
    expect(row).not.toBeNull();
    expect(row!.clientType).toBe('pos');
    expect(row!.id).toBe('ak_1');
  });

  it('verifyApiKey returns null when no API key is registered', async () => {
    await expect(verifyApiKey('tpv_pos_nope', 'default')).resolves.toBeNull();
  });
});

describe('GET /api/api-keys', () => {
  it('rejects when not authorized', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { GET } = await import('../../app/api/api-keys/route');
    const { req } = await import('../helpers/request');
    const res = await GET(req('http://localhost'));
    expect(res.status).toBe(401);
  });
});