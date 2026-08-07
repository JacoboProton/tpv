import { describe, it, expect } from 'vitest';
import { THEMES, C, setGlobalTheme } from '../lib/theme';

describe('lib/theme', () => {
  it('exports dark and light palettes with all keys', () => {
    const keys = ['base', 'surface', 'surfaceLight', 'line', 'brass', 'brassLight', 'sage', 'sageLight', 'wine', 'wineLight', 'cream', 'muted', 'headerBg', 'ticketBg', 'ticketText', 'overlay'];
    for (const mode of ['dark', 'light'] as const) {
      for (const k of keys) {
        expect(typeof THEMES[mode][k as keyof typeof THEMES.dark]).toBe('string');
      }
    }
  });

  it('starts on the dark theme', () => {
    expect(C).toBe(THEMES.dark);
  });

  it('setGlobalTheme switches the active palette', () => {
    setGlobalTheme('light');
    expect(C).toBe(THEMES.light);
    expect(C.base).toBe('#fffcf5');
    setGlobalTheme('dark');
    expect(C).toBe(THEMES.dark);
  });
});