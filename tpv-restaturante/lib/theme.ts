export interface Theme {
  base: string;
  surface: string;
  surfaceLight: string;
  line: string;
  brass: string;
  brassLight: string;
  sage: string;
  sageLight: string;
  wine: string;
  wineLight: string;
  cream: string;
  muted: string;
  headerBg: string;
  ticketBg: string;
  ticketText: string;
  overlay: string;
}

export const THEMES: Record<string, Theme> = {
  dark: {
    base: '#3d424f',
    surface: '#4d5363',
    surfaceLight: '#5f6578',
    line: '#7a8095',
    brass: '#e0c06a',
    brassLight: '#f0d88a',
    sage: '#9abaa0',
    sageLight: '#b4d4b8',
    wine: '#d08080',
    wineLight: '#e89a9a',
    cream: '#f5f0e8',
    muted: '#c0b8ac',
    headerBg: '#3d424f',
    ticketBg: '#f5f0e8',
    ticketText: '#3d424f',
    overlay: 'rgba(0,0,0,0.30)',
  },
  light: {
    base: '#fffcf5',
    surface: '#f8f4ec',
    surfaceLight: '#efeae0',
    line: '#ded8ca',
    brass: '#d0b658',
    brassLight: '#b8a048',
    sage: '#8aaa8c',
    sageLight: '#9abaa0',
    wine: '#d08080',
    wineLight: '#e89a9a',
    cream: '#4a4640',
    muted: '#aaa498',
    headerBg: '#f8f4ec',
    ticketBg: '#ffffff',
    ticketText: '#4a4640',
    overlay: 'rgba(0,0,0,0.20)',
  },
};

export let C: Theme = THEMES.dark;

export function setGlobalTheme(mode: 'dark' | 'light') {
  C = THEMES[mode];
}
