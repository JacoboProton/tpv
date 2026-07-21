import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { runPendingMigrations } from '../../../lib/run-migrations';

export async function POST() {
  try {
    await runPendingMigrations();
    return apiOk({ ok: true, message: 'Migraciones ejecutadas correctamente' });
  } catch (err) { console.error('Error en migración:', err); return apiError(err); }
}
