import { createHash, randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../drizzle';
import { apiKeys } from '../../db/schema';

export type ApiKeyClientType = 'pos' | 'kds' | 'mobile';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

export function generateApiKey(clientType: ApiKeyClientType): string {
  return `tpv_${clientType}_${randomBytes(24).toString('base64url')}`;
}

export function keyPrefix(key: string): string {
  return key.slice(0, 12) + '…';
}

export function isClientType(v: string): v is ApiKeyClientType {
  return v === 'pos' || v === 'kds' || v === 'mobile';
}

export interface ApiKeyRow {
  id: string;
  tenantId: string;
  clientType: string;
  label: string;
  keyHash: string;
  keyPrefix: string;
  active: boolean;
  createdAt: number;
  rotatedAt: number | null;
  lastUsedAt: number | null;
}

export async function createApiKey(
  tenantId: string,
  clientType: ApiKeyClientType,
  label: string,
): Promise<{ row: Omit<ApiKeyRow, 'keyHash'>; key: string }> {
  const key = generateApiKey(clientType);
  const id = `ak_${randomBytes(8).toString('hex')}`;
  const now = Date.now();
  const db = getDb();
  await db.insert(apiKeys).values({
    id, tenantId, clientType, label,
    keyHash: hashApiKey(key), keyPrefix: keyPrefix(key),
    active: true, createdAt: now,
  });
  return {
    row: { id, tenantId, clientType, label, keyPrefix: keyPrefix(key), active: true, createdAt: now, rotatedAt: null, lastUsedAt: null },
    key,
  };
}

export async function listApiKeys(tenantId: string): Promise<Omit<ApiKeyRow, 'keyHash'>[]> {
  const db = getDb();
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.tenantId, tenantId));
  return rows.map((r) => ({
    id: r.id, tenantId: r.tenantId, clientType: r.clientType, label: r.label,
    keyPrefix: r.keyPrefix, active: r.active, createdAt: r.createdAt,
    rotatedAt: r.rotatedAt, lastUsedAt: r.lastUsedAt,
  }));
}

export async function rotateApiKey(
  tenantId: string,
  id: string,
): Promise<{ row: Omit<ApiKeyRow, 'keyHash'>; key: string } | null> {
  const db = getDb();
  const existing = await db.select().from(apiKeys).where(and(
    eq(apiKeys.tenantId, tenantId),
    eq(apiKeys.id, id),
  ));
  if (existing.length === 0) return null;

  const storedType = existing[0].clientType;
  if (!isClientType(storedType)) return null;

  const key = generateApiKey(storedType);
  const now = Date.now();
  await db.update(apiKeys).set({ keyHash: hashApiKey(key), keyPrefix: keyPrefix(key), rotatedAt: now })
    .where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.id, id)));

  return {
    row: {
      id, tenantId, clientType: existing[0].clientType, label: existing[0].label,
      keyPrefix: keyPrefix(key), active: existing[0].active, createdAt: existing[0].createdAt,
      rotatedAt: now, lastUsedAt: existing[0].lastUsedAt,
    },
    key,
  };
}

export async function setApiKeyActive(tenantId: string, id: string, active: boolean): Promise<boolean> {
  const db = getDb();
  const result = await db.update(apiKeys).set({ active })
    .where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.id, id)));
  return result.rowCount ? result.rowCount > 0 : true;
}

export async function deleteApiKey(tenantId: string, id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(apiKeys).where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.id, id)));
  return result.rowCount ? result.rowCount > 0 : true;
}

/**
 * Validates a raw API key against the DB (active + tenant match).
 * Updates lastUsedAt as a best-effort side effect.
 */
export async function verifyApiKey(rawKey: string, tenantId: string): Promise<ApiKeyRow | null> {
  const hash = hashApiKey(rawKey);
  const db = getDb();
  const rows = await db.select().from(apiKeys).where(and(
    eq(apiKeys.tenantId, tenantId),
    eq(apiKeys.keyHash, hash),
    eq(apiKeys.active, true),
  ));
  if (rows.length === 0) return null;
  const row = rows[0];
  db.update(apiKeys).set({ lastUsedAt: Date.now() })
    .where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.id, row.id)))
    .catch(() => {});
  return {
    id: row.id, tenantId: row.tenantId, clientType: row.clientType, label: row.label,
    keyHash: row.keyHash, keyPrefix: row.keyPrefix, active: row.active,
    createdAt: row.createdAt, rotatedAt: row.rotatedAt, lastUsedAt: row.lastUsedAt,
  };
}
