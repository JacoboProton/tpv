import { describe, it, expect } from 'vitest';
import { C } from '../lib/theme';

describe('theme', () => {
  const allColors = [
    'base', 'surface', 'surfaceLight', 'brass', 'brassLight',
    'cream', 'muted', 'wine', 'sage', 'line',
  ] as const;

  it('has all expected color keys', () => {
    for (const key of allColors) {
      expect(C).toHaveProperty(key);
    }
  });

  it('all colors are valid 6-char hex strings', () => {
    for (const key of allColors) {
      expect(C[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('base is darkest, cream is lightest', () => {
    const hexToR = (h: string) => parseInt(h.slice(1, 3), 16);
    expect(hexToR(C.base)).toBeLessThan(hexToR(C.cream));
  });

  it('brassLight is lighter than brass', () => {
    const hexToR = (h: string) => parseInt(h.slice(1, 3), 16);
    expect(hexToR(C.brassLight)).toBeGreaterThan(hexToR(C.brass));
  });
});
