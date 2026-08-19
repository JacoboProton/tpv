import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sales, verifactuRegistros, settings } from '../../db/schema';
import { req } from '../helpers/request';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

const mockRbac = vi.hoisted(() => ({ authorized: true, employee: { id: 'e1', role: 'admin', tenantId: 'default' } }));
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/rbac', () => ({ requireRole: () => async () => mockRbac }));
vi.mock('@/lib/tenant', () => ({ getTenantId: () => 'default' }));
vi.mock('@/lib/qr', () => ({ qrDataUrl: async (text: string) => `data:image/png;base64,QR(${text})` }));

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
    p.where = () => thenable(data);
    p.leftJoin = () => ({ where: () => thenable(data) });
    return p;
  }
  const db: any = {
    select: () => ({ from }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: () => Promise.resolve([{ counter: 42 }]) }),
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

const BASE_SALE = {
  id: 'sale1', tableName: 'Mesa 1', employeeName: 'Ana', items: [],
  total: '10.00', discount: '0', discountAmount: '0', tip: '0', tipMethod: '',
  totalWithTip: '10.00', closedAt: 1750000000000, ticketNumber: 5, invoiceEmail: 'x@y.es',
  tenantId: 'default',
};
const BASE_REG = {
  id: 1, saleId: 'sale1', numSerie: 'VERI-1', fechaExpedicion: '2026-01-01',
  importeTotal: '10.00', baseImponible: '9.35', cuotaIva: '0.65',
  huellaAnterior: '0', huella: 'abc', xmlRegistro: '<x/>', qrUrl: 'https://aeat/QR123',
  estado: 'registrado', createdAt: 1750000000000, tenantId: 'default',
};

beforeEach(() => {
  dbData.clear();
  mockRbac.authorized = true;
  mockRbac.employee = { id: 'e1', role: 'admin', tenantId: 'default' };
  (mockRbac as any).error = undefined;
  (mockRbac as any).status = undefined;
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function POST(body: unknown) {
  const { POST } = await import('../../app/api/tickets/deliver/route');
  return POST(req('http://localhost', { method: 'POST', body }));
}

describe('POST /api/tickets/deliver', () => {
  it('requires auth', async () => {
    mockRbac.authorized = false;
    (mockRbac as any).error = 'Forbidden';
    (mockRbac as any).status = 401;
    const res = await POST({ saleId: 'sale1', to: { email: 'x@y.es' } });
    expect(res.status).toBe(401);
  });

  it('validates body', async () => {
    const res = await POST({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when sale not found', async () => {
    const res = await POST({ saleId: 'nope', to: { email: 'x@y.es' } });
    expect(res.status).toBe(404);
  });

  it('reports no_smtp when SMTP missing and no twilio when phone missing', async () => {
    vi.stubEnv('SMTP_HOST', '');
    vi.stubEnv('SMTP_USER', '');
    seed(sales, [{ ...BASE_SALE }]);
    seed(verifactuRegistros, [{ ...BASE_REG }]);
    const res = await POST({ saleId: 'sale1', to: { email: 'x@y.es' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.email).toBe('no_smtp');
  });

  it('sends via SMTP when configured and includes QR AEAT in html', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.test');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_USER', 'u');
    vi.stubEnv('SMTP_PASS', 'p');
    const sendMail = vi.fn().mockResolvedValue(undefined);
    vi.doMock('nodemailer', () => ({ createTransport: () => ({ sendMail }) }));
    seed(sales, [{ ...BASE_SALE }]);
    seed(verifactuRegistros, [{ ...BASE_REG }]);
    seed(settings, [
      { key: 'restaurantName', value: 'LA COMANDA', tenantId: 'default' },
      { key: 'companyCif', value: '78406450W', tenantId: 'default' },
    ]);
    const res = await POST({ saleId: 'sale1', to: { email: 'x@y.es' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.email).toBe('sent');
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mailArgs = sendMail.mock.calls[0][0];
    expect(mailArgs.subject).toContain('Ticket #5');
    expect(mailArgs.html).toContain('data:image/png;base64,QR(https://aeat/QR123)');
    expect(mailArgs.html).toContain('app AEAT / Verifactu');
  });

  it('sends WhatsApp via Twilio when phone provided', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    seed(sales, [{ ...BASE_SALE }]);
    seed(verifactuRegistros, [{ ...BASE_REG }]);
    seed(settings, [
      { key: 'waitlistTwilioSid', value: 'SID', tenantId: 'default' },
      { key: 'waitlistTwilioToken', value: 'TOK', tenantId: 'default' },
      { key: 'waitlistTwilioWhatsApp', value: '+15550001', tenantId: 'default' },
    ]);
    const res = await POST({ saleId: 'sale1', to: { phone: '+34600111222' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.whatsapp).toBe('sent');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('api.twilio.com');
    expect(String(init.body)).toContain('To=whatsapp%3A%2B34600111222');
    expect(String(init.body)).toContain('https%3A%2F%2Faeat%2FQR123');
  });

  it('reports no_twilio when settings missing', async () => {
    seed(sales, [{ ...BASE_SALE }]);
    seed(verifactuRegistros, [{ ...BASE_REG }]);
    const res = await POST({ saleId: 'sale1', to: { phone: '+34600111222' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.whatsapp).toBe('no_twilio');
  });
});