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

import { createApiKey, hashApiKey, verifyApiKey, listApiKeys, rotateApiKey, setApiKeyActive, deleteApiKey, generateApiKey, keyPrefix } from '../../lib/auth/api-keys';

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

describe('lib/auth/api-keys helpers & lifecycle', () => {
  it('generateApiKey prefixes by client type and is unique', () => {
    const a = generateApiKey('pos');
    const b = generateApiKey('pos');
    expect(a.startsWith('tpv_pos_')).toBe(true);
    expect(a).not.toBe(b);
    expect(generateApiKey('kds').startsWith('tpv_kds_')).toBe(true);
    expect(generateApiKey('mobile').startsWith('tpv_mobile_')).toBe(true);
  });

  it('keyPrefix truncates to 12 chars', () => {
    const key = generateApiKey('pos');
    expect(keyPrefix(key)).toBe(key.slice(0, 12) + '…');
  });

  it('createApiKey returns a complete row without keyHash', async () => {
    const { row, key } = await createApiKey('default', 'kds', 'Pantalla A');
    expect(row.label).toBe('Pantalla A');
    expect(row.rotatedAt).toBeNull();
    expect(row.lastUsedAt).toBeNull();
    expect(stored.length).toBeGreaterThan(0);
    expect(hashApiKey(key)).toBe(stored[stored.length - 1].keyHash);
  });

  it('listApiKeys omits keyHash and returns seeded rows', async () => {
    seed(apiKeys, [{
      id: 'ak_2', tenantId: 'default', clientType: 'mobile', label: 'M1',
      keyHash: 'x', keyPrefix: 'tpv_mobile…', active: true, createdAt: 1, rotatedAt: 2, lastUsedAt: 3,
    }]);
    const rows = await listApiKeys('default');
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('keyHash');
    expect(rows[0].keyPrefix).toBe('tpv_mobile…');
  });

  it('rotateApiKey returns null when the key does not exist', async () => {
    await expect(rotateApiKey('default', 'does-not-exist')).resolves.toBeNull();
  });

  it('rotateApiKey replaces the hash for an existing key', async () => {
    seed(apiKeys, [{
      id: 'ak_3', tenantId: 'default', clientType: 'kds', label: 'K',
      keyHash: 'old', keyPrefix: 'tpv_kds_old', active: true, createdAt: 1, rotatedAt: null, lastUsedAt: null,
    }]);
    const out = await rotateApiKey('default', 'ak_3');
    expect(out).not.toBeNull();
    expect(out!.row.rotatedAt).toBeGreaterThan(0);
    expect(hashApiKey(out!.key)).toBe(sha256(out!.key));
  });

  it('setApiKeyActive reflects the update rowCount', async () => {
    seed(apiKeys, [{ id: 'ak_4', tenantId: 'default' }]);
    await expect(setApiKeyActive('default', 'ak_4', false)).resolves.toBe(true);
  });

  it('deleteApiKey reflects the delete rowCount', async () => {
    await expect(deleteApiKey('default', 'ak_5')).resolves.toBe(true);
  });
});