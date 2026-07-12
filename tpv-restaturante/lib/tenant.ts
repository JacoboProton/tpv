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

export function withTenant<T extends Record<string, unknown>>(query: T, tenantId?: string): T & { tenantId: string } {
  const tid = tenantId || DEFAULT_TENANT;
  return { ...query, tenantId: tid };
}
