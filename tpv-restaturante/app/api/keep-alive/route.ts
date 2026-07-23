import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { requireRole } from '../../../lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero', 'cocina'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);

  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return apiOk();
  } catch (err) { return apiError(err); }
}
