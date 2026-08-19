import { describe, it, expect, afterEach } from 'vitest';
import { getTenantId, getPublicTenantId, DEFAULT_TENANT } from '@/lib/tenant';

const OLD_ENV = process.env;

function req(headers: Record<string, string | null> = {}, query = '') {
  return {
    headers: { get: (n: string) => headers[n] ?? null },
    nextUrl: { searchParams: new URLSearchParams(query) },
  };
}

afterEach(() => {
  process.env = { ...OLD_ENV };
  delete process.env.ALLOWED_PUBLIC_TENANTS;
});

describe('getTenantId', () => {
  it('usa x-tenant-id si existe', () => {
    expect(getTenantId(req({ 'x-tenant-id': 'acme' }))).toBe('acme');
  });

  it('cae al query param tenantId', () => {
    expect(getTenantId(req({}, 'tenantId=b2'))).toBe('b2');
  });

  it('usa default si no hay nada', () => {
    expect(getTenantId(req({}))).toBe(DEFAULT_TENANT);
  });
});

describe('getPublicTenantId', () => {
  it('por defecto solo acepta el tenant default', () => {
    expect(getPublicTenantId(req({ 'x-tenant-id': 'default' }))).toBe('default');
    expect(getPublicTenantId(req({ 'x-tenant-id': 'victima' }))).toBeNull();
    expect(getPublicTenantId(req({}))).toBe('default');
  });

  it('acepta tenants declarados en ALLOWED_PUBLIC_TENANTS', () => {
    process.env.ALLOWED_PUBLIC_TENANTS = 'acme,beta';
    expect(getPublicTenantId(req({ 'x-tenant-id': 'acme' }))).toBe('acme');
    expect(getPublicTenantId(req({ 'x-tenant-id': 'beta' }))).toBe('beta');
    expect(getPublicTenantId(req({ 'x-tenant-id': 'gamma' }))).toBeNull();
  });

  it('ignora tenants no autorizados aunque vengan en query', () => {
    process.env.ALLOWED_PUBLIC_TENANTS = 'acme';
    expect(getPublicTenantId(req({}, 'tenantId=hack'))).toBeNull();
  });

  it('soporta lista separada por comas con espacios', () => {
    process.env.ALLOWED_PUBLIC_TENANTS = ' acme , beta ';
    expect(getPublicTenantId(req({ 'x-tenant-id': 'beta' }))).toBe('beta');
  });
});