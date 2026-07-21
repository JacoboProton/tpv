import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return apiOk();
  } catch (err) { return apiError(err); }
}
