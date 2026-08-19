import { NextRequest, NextResponse } from 'next/server';
import { eq, and, lt, or, sql } from 'drizzle-orm';
import { getDb } from './drizzle';
import { getTenantId } from './tenant';
import { idempotencyKeys } from '../db/schema';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const PROCESSING_STATUS = 0;

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
    if (row.status === PROCESSING_STATUS) return null;
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
 *
 * Cierra el TOCTOU SELECT→handler→INSERT: primero reclama la clave con un
 * INSERT ON CONFLICT DO NOTHING. Si gana el claim (único request), ejecuta el
 * handler y actualiza la respuesta; si lo pierde (ya existe la clave), devuelve
 * la respuesta almacenada sin re-ejecutar el lado de efectos (Stripe, BD).
 * Ante fallo del handler, libera la clave para permitir un reintento real.
 */
export async function withIdempotency(
  req: NextRequest,
  endpoint: string,
  handler: NextHandler,
): Promise<NextResponse | Response> {
  const key = req.headers.get('x-idempotency-key');
  if (!key) return handler();

  const tenantId = getTenantId(req);
  const db = getDb();
  const now = Date.now();

  let claimed = false;
  try {
    const inserted = await db.insert(idempotencyKeys).values({
      tenantId,
      idempotencyKey: key,
      endpoint,
      method: req.method || 'PUT',
      status: PROCESSING_STATUS,
      responseBody: null,
      createdAt: now,
      expiresAt: now + IDEMPOTENCY_TTL_MS,
    }).onConflictDoNothing();
    claimed = (inserted?.rowCount ?? 0) > 0;
  } catch {
    claimed = true;
  }

  if (!claimed) {
    const existing = await getStoredIdempotencyResponse(req);
    return existing ?? NextResponse.json({ error: 'Solicitud en proceso' }, { status: 425 });
  }

  const res = await handler();
  if (res.status >= 200 && res.status < 300) {
    let body: unknown = null;
    try { body = await res.clone().json(); } catch { /* non-JSON body */ }
    try {
      await db.update(idempotencyKeys)
        .set({ status: res.status, responseBody: body, method: req.method || 'PUT' })
        .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.idempotencyKey, key)));
    } catch { /* non-fatal */ }
  } else {
    try {
      await db.delete(idempotencyKeys).where(
        and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.idempotencyKey, key)),
      );
    } catch { /* non-fatal */ }
  }
  return res;
}
