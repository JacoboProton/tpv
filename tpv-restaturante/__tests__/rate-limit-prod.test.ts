import { describe, it, expect, vi } from 'vitest';

describe('lib/rate-limit production guard', () => {
  it('throws in production without Redis', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    
    await expect(async () => {
      const { rateLimit } = await import('../lib/rate-limit');
      await rateLimit('prod-test', 1, 1000);
    }).rejects.toThrow('Rate limiting requiere Upstash Redis en producción');
  });

  it('works in development without Redis', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    
    const { rateLimit } = await import('../lib/rate-limit');
    const result = await rateLimit('dev-test', 2, 60_000);
    expect(result.allowed).toBe(true);
  });
});