import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { runPendingMigrations } from '../../../lib/run-migrations';
import { requireRole } from '../../../lib/rbac';

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    await runPendingMigrations();
    return apiOk({ ok: true, message: 'Migraciones ejecutadas correctamente' });
  } catch (err) { console.error('Error en migración:', err); return apiError(err); }
}
