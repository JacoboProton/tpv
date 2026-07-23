/**
 * DEPRECATED: lib/auth.ts
 * Este helper confiaba en el header `x-employee-role`. Está renombrado para evitar usos accidentales.
 * Usa `lib/rbac.ts` -> `requireRole(...)` que valida la sesión y el rol contra la base de datos.
 * Si algún handler importa este fichero, ahora fallará a propósito para que se corrija la llamada.
 */

export function requireRole(_: Request, __?: string) {
  throw new Error('DEPRECATED: use requireRole from lib/rbac.ts (validates role against DB)');
}
