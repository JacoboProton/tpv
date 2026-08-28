import { describe, it, expect, vi, beforeEach } from 'vitest';
import { products, categories, productStock, combos, comboSlots, comboSlotItems, productPriceRules, mealMenus, mealMenuCourses, mealMenuCourseItems, mealMenuSchedules } from '../../db/schema';
import { req } from '../helpers/request';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));

vi.mock('@/lib/drizzle', () => {
  function thenable(data: any[]) {
    const p = Promise.resolve(data) as any;
    p.orderBy = () => p;
    p.limit = () => p;
    p.offset = () => p;
    return p;
  }
  function from(table: any) {
    const data = dbData.get(table) || [];
    const p = thenable(data);
    p.where = () => thenable(data);
    p.leftJoin = () => ({ where: () => thenable(data) });
    return p;
  }
  const db: any = {
    select: (fields?: any) => {
      if (fields && fields.count !== undefined) {
        return { from: (table: any) => ({
          where: () => Promise.resolve([{ count: dbData.get(table)?.length || 0 }])
        })};
      }
      return { from };
    },
    insert: () => ({ values: () => ({ onConflictDoUpdate: () => Promise.resolve([]) }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
    delete: () => ({ where: () => Promise.resolve([]) }),
    transaction: (cb: any) => cb(db),
    execute: () => Promise.resolve({ rows: [] }),
  };
  return { getDb: () => db };
});

beforeEach(() => {
  dbData.clear();
  mockRbac.authorized = true;
  mockRbac.employee = { id: 'e1', role: 'admin', tenantId: 'default' };
  (mockRbac as any).error = undefined;
  (mockRbac as any).status = undefined;
});

describe('GET /api/catalog', () => {
  it('returns empty catalog when no data', async () => {
    const { GET } = await import('../../app/api/catalog/route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toEqual([]);
    expect(body.products).toEqual([]);
    expect(body.combos).toEqual([]);
    expect(body.mealMenus).toEqual([]);
    expect(body.priceRules).toEqual([]);
  });

  it('returns catalog with products and stock', async () => {
    seed(products, [
      { id: 'p1', name: 'Burger', category: 'cat1', price: 10, ubicacion: 'Bar', course: 'main', image: null, allergens: [], description: null, featured: false, active: true, showTpv: true, showQr: true, agotado: false, carouselSort: null, type: '', inventariable: false, tenantId: 'default' },
      { id: 'p2', name: 'Fries', category: 'cat1', price: 4, ubicacion: 'Bar', course: 'starter', image: null, allergens: [], description: null, featured: false, active: true, showTpv: true, showQr: true, agotado: false, carouselSort: null, type: '', inventariable: false, tenantId: 'default' },
    ]);
    seed(categories, [
      { id: 'cat1', name: 'Main', sortOrder: 0, active: true, printerZone: '', showQr: true, tenantId: 'default' },
    ]);
    seed(productStock, [
      { productId: 'p1', location: 'main', stock: 10, lowStock: 2, tenantId: 'default' },
    ]);

    const { GET } = await import('../../app/api/catalog/route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toHaveLength(1);
    expect(body.products).toHaveLength(2);
    expect(body.products[0].stockByLocation).toBeDefined();
    expect(body.products[0].stockByLocation.main.stock).toBe(10);
  });

  it('returns catalog with combos', async () => {
    seed(combos, [{ id: 'combo1', name: 'Menu', description: '', price: 15, image: null, active: true, createdAt: 1000, discountPct: 0, tenantId: 'default' }]);
    seed(comboSlots, [{ id: 'slot1', comboId: 'combo1', name: 'Main', minChoices: 1, maxChoices: 1, sortOrder: 0, tenantId: 'default' }]);
    seed(comboSlotItems, [{ id: 'csi1', slotId: 'slot1', productId: 'p1', surcharge: 0, sortOrder: 0, tenantId: 'default' }]);

    const { GET } = await import('../../app/api/catalog/route');
    const res = await GET(req());
    const body = await res.json();
    expect(body.combos).toHaveLength(1);
    expect(body.combos[0].slots).toHaveLength(1);
    expect(body.combos[0].slots[0].items).toHaveLength(1);
  });

  it('returns catalog with meal menus', async () => {
    seed(mealMenus, [{ id: 'mm1', name: 'Lunch Menu', description: '', price: 20, image: null, active: true, includesPan: true, includesBebida: false, includesCafe: false, extras: [], createdAt: 1000, discountPct: 0, tenantId: 'default' }]);
    seed(mealMenuCourses, [{ id: 'mc1', menuId: 'mm1', name: 'First', sortOrder: 0, tenantId: 'default' }]);
    seed(mealMenuCourseItems, [{ id: 'mci1', courseId: 'mc1', productId: 'p1', surcharge: 0, sortOrder: 0, tenantId: 'default' }]);
    seed(mealMenuSchedules, [{ id: 'ms1', menuId: 'mm1', dayOfWeek: 1, startTime: '12:00', endTime: '16:00', tenantId: 'default' }]);

    const { GET } = await import('../../app/api/catalog/route');
    const res = await GET(req());
    const body = await res.json();
    expect(body.mealMenus).toHaveLength(1);
    expect(body.mealMenus[0].courses).toHaveLength(1);
    expect(body.mealMenus[0].courses[0].items).toHaveLength(1);
    expect(body.mealMenus[0].schedules).toHaveLength(1);
  });

  it('returns catalog with price rules', async () => {
    seed(productPriceRules, [{ id: 'pr1', productId: 'p1', name: 'Happy Hour', active: true, days: '1,2,3', startTime: '18:00', endTime: '20:00', type: 'discount', value: 20, createdAt: 1000, tenantId: 'default' }]);

    const { GET } = await import('../../app/api/catalog/route');
    const res = await GET(req());
    const body = await res.json();
    expect(body.priceRules).toHaveLength(1);
    expect(body.priceRules[0].name).toBe('Happy Hour');
    expect(body.priceRules[0].active).toBe(true);
  });
});

describe('PUT /api/catalog', () => {
  it('requires admin', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { PUT } = await import('../../app/api/catalog/route');
    const res = await PUT(req('http://localhost', { method: 'PUT', body: {} }));
    expect(res.status).toBe(401);
  });

  it('stores catalog data inside transaction', async () => {
    const { PUT } = await import('../../app/api/catalog/route');
    const res = await PUT(req('http://localhost', {
      method: 'PUT',
      body: {
        categories: [{ id: 'cat1', name: 'Main' }],
        products: [{ id: 'p1', name: 'Burger', category: 'cat1', price: 10 }],
        combos: [],
      },
    }));
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/catalog', () => {
  it('requires admin', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { PATCH } = await import('../../app/api/catalog/route');
    const res = await PATCH(req('http://localhost', { method: 'PATCH', body: {} }));
    expect(res.status).toBe(401);
  });

  it('handles reorder-categories', async () => {
    const { PATCH } = await import('../../app/api/catalog/route');
    const res = await PATCH(req('http://localhost', {
      method: 'PATCH',
      body: { action: 'reorder-categories', data: [{ id: 'cat1', sortOrder: 1 }] },
    }));
    expect(res.status).toBe(200);
  });

  it('handles toggle-product', async () => {
    const { PATCH } = await import('../../app/api/catalog/route');
    const res = await PATCH(req('http://localhost', {
      method: 'PATCH',
      body: { action: 'toggle-product', data: { id: 'p1', field: 'agotado', value: true } },
    }));
    expect(res.status).toBe(200);
  });

  it('rejects unknown field in toggle-product', async () => {
    const { PATCH } = await import('../../app/api/catalog/route');
    const res = await PATCH(req('http://localhost', {
      method: 'PATCH',
      body: { action: 'toggle-product', data: { id: 'p1', field: 'nonexistent', value: true } },
    }));
    expect(res.status).toBe(400);
  });

  it('handles toggle-category', async () => {
    const { PATCH } = await import('../../app/api/catalog/route');
    const res = await PATCH(req('http://localhost', {
      method: 'PATCH',
      body: { action: 'toggle-category', data: { id: 'cat1', field: 'showQr', value: false } },
    }));
    expect(res.status).toBe(200);
  });

  it('handles delete-product', async () => {
    const { PATCH } = await import('../../app/api/catalog/route');
    const res = await PATCH(req('http://localhost', {
      method: 'PATCH',
      body: { action: 'delete-product', data: { id: 'p1' } },
    }));
    expect(res.status).toBe(200);
  });

  it('handles reorder-carousel', async () => {
    const { PATCH } = await import('../../app/api/catalog/route');
    const res = await PATCH(req('http://localhost', {
      method: 'PATCH',
      body: { action: 'reorder-carousel', data: [{ id: 'p1', carouselSort: 1 }] },
    }));
    expect(res.status).toBe(200);
  });

  it('returns 400 for unknown action', async () => {
    const { PATCH } = await import('../../app/api/catalog/route');
    const res = await PATCH(req('http://localhost', {
      method: 'PATCH',
      body: { action: 'unknown', data: {} },
    }));
    expect(res.status).toBe(400);
  });
});
