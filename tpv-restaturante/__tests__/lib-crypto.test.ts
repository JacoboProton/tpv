import { describe, it, expect } from 'vitest';
import { sha256 } from '../lib/crypto';

describe('lib/crypto sha256', () => {
  it('hashes a string to hex', async () => {
    const h = await sha256('hola');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', async () => {
    const a = await sha256('tpv');
    const b = await sha256('tpv');
    expect(a).toBe(b);
  });

  it('produces different digests for different inputs', async () => {
    const a = await sha256('abc');
    const b = await sha256('abd');
    expect(a).not.toBe(b);
  });
});