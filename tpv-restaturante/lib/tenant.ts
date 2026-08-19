export const DEFAULT_TENANT = 'default';

export type TenantId = string;

interface RequestWithHeaders {
  headers?: { get: (name: string) => string | null };
  nextUrl?: { searchParams: URLSearchParams };
}

export function getTenantId(req?: RequestWithHeaders): string {
  const tenantId = req?.headers?.get('x-tenant-id')
    || req?.nextUrl?.searchParams?.get('tenantId')
    || DEFAULT_TENANT;
  return tenantId;
}

/**
 * Tenants que el operador declara como públicos (menú QR, reservas online,
 * lista de espera, fichaje). Por defecto solo `default` — un despliegue de
 * un solo restaurante. Para multi-tenant público, listar explícitamente.
 */
function allowedPublicTenants(): string[] {
  const raw = process.env.ALLOWED_PUBLIC_TENANTS || DEFAULT_TENANT;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Tenant de rutas públicas de ESCRITURA. NO confía en `x-tenant-id` a ciegas:
 * solo acepta tenants declarados en `ALLOWED_PUBLIC_TENANTS`. Devuelve null
 * si el tenant pedido no está autorizado (el caller debe rechazar con 403).
 */
export function getPublicTenantId(req?: RequestWithHeaders): string | null {
  const requested = req?.headers?.get('x-tenant-id')
    || req?.nextUrl?.searchParams?.get('tenantId')
    || DEFAULT_TENANT;
  const allowed = allowedPublicTenants();
  return allowed.includes(requested) ? requested : null;
}

export function withTenant<T extends Record<string, unknown>>(query: T, tenantId?: string): T & { tenantId: string } {
  const tid = tenantId || DEFAULT_TENANT;
  return { ...query, tenantId: tid };
}
