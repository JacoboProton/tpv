import { NextRequest, NextResponse } from 'next/server';
import { eq, and, lt, or, sql } from 'drizzle-orm';
import { getDb } from './drizzle';
import { getTenantId } from './tenant';
import { idempotencyKeys } from '../db/schema';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function getKeyFromRequest(req: NextRequest): string {
  return req.headers.get('x-idempotency-key') ?? '';
}

export async function getStoredIdempotencyResponse(req: NextRequest): Promise<NextResponse | null> {
  const key = getKeyFromRequest(req);
  if (!key) return null;
  const tenantId = getTenantId(req);
  const db = getDb();
  try {
    const [row] = await db.select().from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.idempotencyKey, key)))
      .limit(1);
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < Date.now()) return null;
    return NextResponse.json(row.responseBody ?? { ok: true }, { status: row.status });
  } catch {
    return null;
  }
}

export async function storeIdempotencyResponse(
  req: NextRequest,
  status: number,
  body: unknown,
  method = '',
  endpoint = '',
): Promise<void> {
  const key = getKeyFromRequest(req);
  if (!key) return;
  const tenantId = getTenantId(req);
  const db = getDb();
  try {
    await db.insert(idempotencyKeys).values({
      tenantId,
      idempotencyKey: key,
      endpoint,
      method,
      status,
      responseBody: body as Record<string, unknown> | null,
      createdAt: Date.now(),
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    }).onConflictDoNothing();
  } catch { /* non-fatal */ }
}

export async function cleanupExpiredIdempotency(): Promise<number> {
  try {
    const db = getDb();
    const res = await db.delete(idempotencyKeys).where(
      or(lt(idempotencyKeys.expiresAt, Date.now()), sql`${idempotencyKeys.expiresAt} IS NULL`),
    );
    return res.rowCount ?? 0;
  } catch {
    return 0;
  }
}

type NextHandler = () => Promise<NextResponse | Response>;

/**
 * Envuelve un handler de mutación para devolver la respuesta ya procesada
 * si llega una request con la misma x-idempotency-key (dedup de reintentos).
 */
export async function withIdempotency(
  req: NextRequest,
  endpoint: string,
  handler: NextHandler,
): Promise<NextResponse | Response> {
  const key = req.headers.get('x-idempotency-key');
  if (!key) return handler();

  const existing = await getStoredIdempotencyResponse(req);
  if (existing) return existing;

  const res = await handler();
  if (res.status >= 200 && res.status < 300) {
    let body: unknown = null;
    try { body = await res.clone().json(); } catch { /* non-JSON body */ }
    const method = req.method || 'PUT';
    await storeIdempotencyResponse(req, res.status, body, method, endpoint);
  }
  return res;
}
