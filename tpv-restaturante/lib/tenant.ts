export type TenantId = string;

export const DEFAULT_TENANT = 'default';

/**
 * Extract tenant id from request headers, query string or fallback to default.
 */
export function getTenantId(req: any): TenantId {
  const tenantId =
    req?.headers?.get?.('x-tenant-id') ||
    req?.nextUrl?.searchParams?.get?.('tenantId') ||
    DEFAULT_TENANT;
  return tenantId as TenantId;
}

/**
 * Append tenantId to a query object (used for building SQL queries).
 */
export function withTenant(query: Record<string, any>, tenantId?: TenantId) {
  const tid = tenantId || DEFAULT_TENANT;
  return { ...query, tenantId: tid };
}
