import { describe, it, expect } from 'vitest';
import { euros, round2, clone, seedCatalog, seedFloor, seedEmployees, getDailyMenu } from '../components/constants';

describe('euros', () => {
  it('formats numbers as euros', () => {
    expect(euros(10)).toContain('10');
    expect(euros(10)).toContain('€');
  });

  it('shows 2 decimal places', () => {
    expect(euros(10.5)).toContain('10,50');
  });
});

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(10.456)).toBe(10.46);
    expect(round2(10.001)).toBe(10);
  });
});

describe('clone', () => {
  it('deep clones objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = clone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
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
});

describe('getDailyMenu', () => {
  it('returns menu for valid hour', () => {
    const d = new Date('2024-03-20T14:00:00'); // Wednesday 2pm
    const menu = getDailyMenu(d);
    if (menu) {
      expect(menu.discount).toBeGreaterThan(0);
      expect(menu.items.length).toBeGreaterThan(0);
    }
  });

  it('returns undefined outside hours', () => {
    const d = new Date('2024-03-20T20:00:00'); // 8pm
    const menu = getDailyMenu(d);
    expect(menu).toBeUndefined();
  });
});
