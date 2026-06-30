export const DEFAULT_TENANT = 'default';

export function getTenantId(req) {
  const tenantId = req?.headers?.get('x-tenant-id')
    || req?.nextUrl?.searchParams?.get('tenantId')
    || DEFAULT_TENANT;
  return tenantId;
}

export function withTenant(query, tenantId) {
  const tid = tenantId || DEFAULT_TENANT;
  return { ...query, tenantId: tid };
}
