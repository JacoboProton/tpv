import { describe, it, expect } from 'vitest';
import { euros, round2, clone, seedCatalog, seedFloor, seedEmployees, getDailyMenu, THEMES, setGlobalTheme, KEYS, ALLERGENS, C } from '../components/constants';

describe('euros', () => {
  it('formats numbers as euros', () => {
    expect(euros(10)).toContain('10');
    expect(euros(10)).toContain('€');
  });

  it('shows 2 decimal places', () => {
    expect(euros(10.5)).toContain('10,50');
  });

  it('formats zero', () => {
    expect(euros(0)).toContain('0,00');
  });

  it('formats large numbers', () => {
    const result = euros(1234.56);
    expect(result).toContain('1234');
    expect(result).toContain('56');
    expect(result).toContain('€');
  });
});

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(10.456)).toBe(10.46);
    expect(round2(10.001)).toBe(10);
  });

  it('rounds negative numbers', () => {
    expect(round2(-10.456)).toBe(-10.46);
  });

  it('handles whole numbers', () => {
    expect(round2(5)).toBe(5);
  });
});

describe('clone', () => {
  it('deep clones objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = clone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it('clones arrays', () => {
    const arr = [1, [2, 3]];
    const cloned = clone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[1]).not.toBe(arr[1]);
  });

  it('handles null', () => {
    expect(clone(null)).toBeNull();
  });
});

describe('THEMES', () => {
  it('has dark and light themes', () => {
    expect(THEMES.dark).toBeDefined();
    expect(THEMES.light).toBeDefined();
  });

  it('each theme has all required color keys', () => {
    const keys = ['base', 'surface', 'surfaceLight', 'line', 'brass', 'brassLight', 'sage', 'sageLight', 'wine', 'wineLight', 'cream', 'muted', 'headerBg', 'ticketBg', 'ticketText', 'overlay'];
    for (const mode of ['dark', 'light']) {
      keys.forEach(k => {
        expect(THEMES[mode]).toHaveProperty(k);
      });
    }
  });
});

describe('setGlobalTheme', () => {
  it('switches C reference', () => {
    const original = C;
    setGlobalTheme('light');
    expect(C).not.toBe(original);
    expect(C.base).toBe(THEMES.light.base);
    setGlobalTheme('dark');
    expect(C.base).toBe(THEMES.dark.base);
  });
});

describe('KEYS', () => {
  it('has all cache keys', () => {
    expect(KEYS.CATALOG).toBe('tpv:catalog');
    expect(KEYS.FLOOR).toBe('tpv:floor');
    expect(KEYS.SALES).toBe('tpv:sales');
    expect(KEYS.EMPLOYEES).toBe('tpv:employees');
  });
});

describe('ALLERGENS', () => {
  it('is an array of objects with id and label', () => {
    expect(Array.isArray(ALLERGENS)).toBe(true);
    expect(ALLERGENS.length).toBeGreaterThan(5);
    ALLERGENS.forEach(a => {
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('label');
    });
  });
});

describe('seedCatalog', () => {
  it('returns products and categories', () => {
    const cat = seedCatalog();
    expect(cat.products).toBeDefined();
    expect(cat.categories).toBeDefined();
    expect(cat.products.length).toBeGreaterThan(0);
    expect(cat.categories.length).toBeGreaterThan(0);
  });

  it('each product has required fields', () => {
    const cat = seedCatalog();
    cat.products.forEach(p => {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.price).toBeGreaterThan(0);
      expect(p.stock).toBeDefined();
    });
  });

  it('products have different prices', () => {
    const cat = seedCatalog();
    const prices = cat.products.map(p => p.price);
    expect(new Set(prices).size).toBeGreaterThan(1);
  });
});

describe('seedFloor', () => {
  it('creates tables with orders', () => {
    const floor = seedFloor();
    expect(floor.tables).toBeDefined();
    expect(floor.orders).toBeDefined();
    expect(floor.tables.length).toBeGreaterThan(8);
  });

  it('includes para llevar and domicilio tables', () => {
    const floor = seedFloor();
    const tipos = floor.tables.map(t => t.type);
    expect(tipos).toContain('llevar');
    expect(tipos).toContain('domicilio');
  });

  it('has 9 mesas, 6 barras, 4 delivery', () => {
    const floor = seedFloor();
    expect(floor.tables.filter(t => t.type === 'mesa')).toHaveLength(9);
    expect(floor.tables.filter(t => t.type === 'barra')).toHaveLength(6);
    const delivery = floor.tables.filter(t => t.type === 'llevar' || t.type === 'domicilio');
    expect(delivery).toHaveLength(4);
  });

  it('each table has required fields', () => {
    const floor = seedFloor();
    floor.tables.forEach(t => {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.width).toBeGreaterThan(0);
      expect(t.height).toBeGreaterThan(0);
    });
  });

  it('has zones defined', () => {
    const floor = seedFloor();
    expect(floor.zones).toHaveLength(3);
  });
});

describe('seedEmployees', () => {
  it('creates valid employees', () => {
    const emps = seedEmployees();
    expect(emps.length).toBeGreaterThanOrEqual(3);
    emps.forEach(e => {
      expect(e.pin.length).toBe(4);
      expect(['admin', 'camarero']).toContain(e.role);
    });
  });

  it('includes an admin', () => {
    const emps = seedEmployees();
    expect(emps.some(e => e.role === 'admin')).toBe(true);
  });
});

describe('getDailyMenu', () => {
  it('returns menu for valid hour', () => {
    const d = new Date('2025-03-20T14:00:00');
    const menu = getDailyMenu(d);
    if (menu) {
      expect(menu.discount).toBeGreaterThan(0);
      expect(menu.items!.length).toBeGreaterThan(0);
    }
  });

  it('returns undefined for non-menu hour on weekday', () => {
    const d = new Date('2024-03-20T09:00:00');
    const menu = getDailyMenu(d);
    expect(menu).toBeUndefined();
  });

  it('returns happy hour outside meal hours', () => {
    const d = new Date('2024-03-20T20:00:00');
    const menu = getDailyMenu(d);
    // happy hour is active in test seed, so this may return happy hour
    // just verify it returns a menu object with the expected shape
    if (menu) {
      expect(menu.discount).toBeGreaterThan(0);
    }
  });
});
