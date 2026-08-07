// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  signSessionToken,
  verifySessionToken,
  extractToken,
  cookieOptions,
  isRs256Configured,
  JWT_COOKIE,
} from '../lib/auth/jwt';

const ORIG = { ...process.env };

afterEach(() => {
  for (const k of ['JWT_SECRET', 'JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY', 'JWT_TTL_MS', 'NODE_ENV']) {
    if (ORIG[k] === undefined) delete process.env[k];
    else process.env[k] = ORIG[k];
  }
});

const claims = { sub: 'emp-1', role: 'admin', tenantId: 'default', deviceId: 'dev-1' };

describe('lib/auth/jwt', () => {
  it('is Rs256Configured = false without a private key env', () => {
    process.env.JWT_PRIVATE_KEY = '';
    expect(isRs256Configured()).toBe(false);
  });

  it('is Rs256Configured = true when a private key is set', () => {
    process.env.JWT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----x';
    expect(isRs256Configured()).toBe(true);
  });

  it('signs an HS256 token and verifies it back', async () => {
    process.env.JWT_SECRET = 'unit-test-secret';
    const token = await signSessionToken(claims);
    expect(token.split('.')).toHaveLength(3);
    const verified = await verifySessionToken(token);
    expect(verified).toMatchObject(claims);
    expect(verified!.iat).toBeGreaterThan(0);
    expect(verified!.exp).toBeGreaterThan(0);
  });

  it('rejects a tampered token', async () => {
    process.env.JWT_SECRET = 'unit-test-secret';
    const token = await signSessionToken(claims);
    const tampered = token.slice(0, -2) + 'aa';
    await expect(verifySessionToken(tampered)).resolves.toBeNull();
  });

  it('returns null for empty/invalid token', async () => {
    await expect(verifySessionToken('not-a-jwt')).resolves.toBeNull();
  });

  it('round-trips an RS256 token when keys are configured', async () => {
    const { generateKeyPair, exportPKCS8, exportSPKI } = await import('jose');
    const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
    process.env.JWT_PRIVATE_KEY = await exportPKCS8(privateKey);
    process.env.JWT_PUBLIC_KEY = await exportSPKI(publicKey);
    const token = await signSessionToken(claims);
    const verified = await verifySessionToken(token);
    expect(verified).toMatchObject({ sub: claims.sub, role: claims.role, tenantId: claims.tenantId });
  });

  it('extractToken parses a Bearer header', () => {
    const req = new Request('http://localhost/api/x', {
      headers: { authorization: 'Bearer tok123' },
    });
    expect(extractToken(req)).toBe('tok123');
  });

  it('extractToken parses the tpv_session cookie', () => {
    const req = new Request('http://localhost/api/x', {
      headers: { cookie: 'other=x; tpv_session=abc%20def; another=y' },
    });
    expect(extractToken(req)).toBe('abc def');
  });

  it('extractToken returns null without credentials', () => {
    expect(extractToken(new Request('http://localhost/api/x'))).toBeNull();
  });

  it('cookieOptions is non-secure in dev', () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const opts = cookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBeGreaterThan(0);
    expect(JWT_COOKIE).toBe('tpv_session');
  });

  it('cookieOptions is secure in production', () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(cookieOptions().secure).toBe(true);
  });
});