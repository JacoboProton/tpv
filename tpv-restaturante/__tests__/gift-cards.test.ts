import { describe, it, expect, vi, beforeEach } from 'vitest';
import { giftCards } from '../db/schema';
import { req } from './helpers/request';
import { GET, POST } from '../app/api/gift-cards/route';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));
const mockSession = vi.hoisted(() => ({ id: 'e1', role: 'admin', tenantId: 'default' }));

vi.mock('@/lib/rbac', () => ({
  requireRole: () => async () => mockRbac,
  getSessionEmployee: async () => mockSession,
}));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));
vi.mock('@/lib/drizzle', () => {
  function thenable(data: any[]) {
    const p: any = Promise.resolve(data);
    p.orderBy = () => p; p.limit = () => p; return p;
  }
  function from(table: any) {
    const data = dbData.get(table) || [];
    const p: any = thenable(data);
    p.where = () => thenable(data);
    p.leftJoin = () => ({ where: () => thenable(data) });
    return p;
  }
  const db: any = {
    select: () => ({ from }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: () => ({ returning: () => Promise.resolve([{}]) }), onConflictDoNothing: () => Promise.resolve([]) }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
    delete: () => ({ where: () => Promise.resolve([]) }),
    execute: () => Promise.resolve({ rows: [] }),
  };
  return { getDb: () => db };
});

const CARD = { id: 'gc1', code: 'ABC123', balance: '20.00', initialBalance: '20.00', status: 'active', holderName: null, expiresAt: null, tenantId: 'default' };

beforeEach(() => { dbData.clear(); mockRbac.authorized = true; seed(giftCards, [CARD]); });

async function json(r: Response) { return r.json(); }

describe('gift-cards API', () => {
  it('consulta saldo por código', async () => {
    const r = await GET(req('http://localhost/api/gift-cards?code=ABC123'));
    expect(r.status).toBe(200);
    const b = await json(r);
    expect(b.code).toBe('ABC123');
    expect(b.balance).toBe(20);
  });

  it('redime y descuenta el saldo', async () => {
    const r = await POST(req('http://localhost/api/gift-cards', { method: 'POST', body: { action: 'redeem', code: 'ABC123', amount: 5 } }));
    expect(r.status).toBe(200);
    const b = await json(r);
    expect(b.balance).toBe(15);
  });

  it('rechaza redención si saldo insuficiente', async () => {
    const r = await POST(req('http://localhost/api/gift-cards', { method: 'POST', body: { action: 'redeem', code: 'ABC123', amount: 999 } }));
    expect(r.status).toBe(400);
  });

  it('404 si la tarjeta no existe', async () => {
    seed(giftCards, []);
    const r = await POST(req('http://localhost/api/gift-cards', { method: 'POST', body: { action: 'redeem', code: 'NOPE', amount: 1 } }));
    expect(r.status).toBe(404);
  });

  it('emite tarjeta con importe válido', async () => {
    const r = await POST(req('http://localhost/api/gift-cards', { method: 'POST', body: { action: 'issue', amount: 50 } }));
    expect(r.status).toBe(201);
    const b = await json(r);
    expect(b.code).toHaveLength(16);
    expect(b.balance).toBe(50);
  });

  it('400 si el importe de emisión es inválido', async () => {
    const r = await POST(req('http://localhost/api/gift-cards', { method: 'POST', body: { action: 'issue', amount: 0 } }));
    expect(r.status).toBe(400);
  });

  it('lista tarjetas (admin)', async () => {
    const r = await GET(req('http://localhost/api/gift-cards'));
    expect(r.status).toBe(200);
    const b = await json(r);
    expect(Array.isArray(b)).toBe(true);
    expect(b.length).toBe(1);
  });
});
