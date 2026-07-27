import { THEMES as _THEMES } from '@/lib/theme';
import type { Theme as _Theme } from '@/lib/theme';
import { seedCatalog as _seedCatalog, seedFloor as _seedFloor, seedEmployees as _seedEmployees, getDailyMenu as _getDailyMenu } from '@/lib/seed';
import { KEYS as _KEYS, TICKET_EDGE as _TICKET_EDGE, TICKET_PRINT_STYLE as _TICKET_PRINT_STYLE, COURSES as _COURSES, MODIFIERS as _MODIFIERS } from '@/lib/constants';
import { PAYMENT_METHODS as _PAYMENT_METHODS } from '@/lib/payment-methods';
import { euros as _euros, round2 as _round2, clone as _clone } from '@/lib/utils';
import { ALLERGENS as _ALLERGENS, ALLERGEN_COLORS as _ALLERGEN_COLORS } from '@/lib/allergens';

export type { Theme } from '@/lib/theme';
export type { SeedCategory, SeedProduct, SeedTable, SeedZone, SeedFloor, SeedEmployee, MenuItem } from '@/lib/seed';
export type { PaymentMethod } from '@/lib/payment-methods';
export type { Allergen } from '@/lib/allergens';

export const THEMES = _THEMES;
export const KEYS = _KEYS;
export const TICKET_EDGE = _TICKET_EDGE;
export const TICKET_PRINT_STYLE = _TICKET_PRINT_STYLE;
export const COURSES = _COURSES;
export const MODIFIERS = _MODIFIERS;
export const seedCatalog = _seedCatalog;
export const seedFloor = _seedFloor;
export const seedEmployees = _seedEmployees;
export const getDailyMenu = _getDailyMenu;
export const PAYMENT_METHODS = _PAYMENT_METHODS;
export const euros = _euros;
export const round2 = _round2;
export const clone = _clone;
export const ALLERGENS = _ALLERGENS;
export const ALLERGEN_COLORS = _ALLERGEN_COLORS;

export let C: _Theme = _THEMES.dark;
export function setGlobalTheme(mode: 'dark' | 'light') {
  C = _THEMES[mode];
}
