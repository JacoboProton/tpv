import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sales, ticketCounters, verifactuRegistros } from '../../db/schema';
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
    return p;
  }
  function from(table: any) {
    const data = dbData.get(table) || [];
    const p = thenable(data);
    p.where = () => thenable(data.filter((r: any) => !r.revoked));
    p.leftJoin = () => ({ where: () => thenable(data) });
    return p;
  }
  const db: any = {
    select: () => ({ from }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.resolve([{ counter: 42 }]),
        }),
        onConflictDoNothing: () => Promise.resolve([]),
      }),
    }),
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

describe('GET /api/sales', () => {
  it('returns empty array when no sales', async () => {
    const { GET } = await import('../../app/api/sales/route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns sales with verifactu enrichment', async () => {
    seed(sales, [{
      id: 's1', tableId: 't1', tableName: 'Mesa 1', items: [{ name: 'Burger', qty: 2, price: 10 }],
      subtotal: '20', discount: '0', discountAmount: '0', total: '20', tip: '0', totalWithTip: '20',
      payments: [{ method: 'cash', amount: 20 }], paymentMethod: 'cash', tipMethod: '',
      isFiado: false, isDebtPayment: false, employeeId: 'e1', employeeName: 'Alice',
      closedAt: Date.now(), refunds: [], paymentIntentId: '', stripeConfirmed: false,
      disputeStatus: '', disputeData: {}, ticketNumber: 1, tenantId: 'default',
      invoiceNif: '', invoiceName: '', invoiceAddress: '', invoiceEmail: '',
      invoiceNumber: '', invoiceCreated: false, invoiceCreatedAt: null,
    }]);
    seed(verifactuRegistros, [{
      id: 1, saleId: 's1', numSerie: 'ABC123', fechaExpedicion: '2025-01-01',
      importeTotal: '20', baseImponible: '16.53', cuotaIva: '3.47',
      huellaAnterior: '0', huella: 'xyz', xmlRegistro: '<xml/>',
      qrUrl: 'https://qr.url', estado: 'enviado', createdAt: Date.now(),
      tenantId: 'default', fiskalyInvoiceId: null, verificationUrl: null,
      fechaHoraFirma: null, paymentIntentId: null,
    }]);
    const { GET } = await import('../../app/api/sales/route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('s1');
    expect(body[0].verifactuStatus).toBe('enviado');
    expect(body[0].verifactuNumSerie).toBe('ABC123');
  });
});

describe('POST /api/sales', () => {
  it('creates a sale with ticket number', async () => {
    const { POST } = await import('../../app/api/sales/route');
    const res = await POST(req('http://localhost', {
      method: 'POST',
      body: {
        id: 's1', tableId: 't1', tableName: 'Mesa 1',
        items: [{ name: 'Burger', qty: 2, price: 10 }],
        subtotal: 20, total: 20, totalWithTip: 20, payments: [],
        closedAt: Date.now(),
      },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ticketNumber).toBe(42);
  });

  it('requires auth', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'no autorizado';
    (mockRbac as any).status = 401;
    const { POST } = await import('../../app/api/sales/route');
    const res = await POST(req('http://localhost', { method: 'POST', body: {} }));
    expect(res.status).toBe(401);
  });
});
