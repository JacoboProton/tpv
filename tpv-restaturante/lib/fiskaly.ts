import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from './drizzle';
import { fiskalyConfig } from '../db/schema';

const BASE_URL = process.env.FISKALY_ENVIRONMENT === 'LIVE'
  ? 'https://live.es.sign.fiskaly.com/api/v1'
  : 'https://test.es.sign.fiskaly.com/api/v1';

const API_KEY = process.env.FISKALY_API_KEY;
const API_SECRET = process.env.FISKALY_API_SECRET;
const TAXPAYER_NIF = process.env.FISKALY_TAXPAYER_NIF;
const TERRITORY = process.env.FISKALY_TERRITORY || 'CANARY_ISLANDS';

interface TokenCache {
  bearer: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
const TOKEN_CONFIG_KEY = 'fiskaly_saved_token';

async function loadTokenFromDb(): Promise<TokenCache | null> {
  try {
    const db = getDb();
    const rows = await db.select({ value: fiskalyConfig.value })
      .from(fiskalyConfig)
      .where(eq(fiskalyConfig.key, TOKEN_CONFIG_KEY));
    if (rows.length > 0) return JSON.parse(rows[0].value);
  } catch { /* ignore */ }
  return null;
}

async function saveTokenToDb(token: TokenCache): Promise<void> {
  try {
    const db = getDb();
    await db.insert(fiskalyConfig).values({
      key: TOKEN_CONFIG_KEY,
      value: JSON.stringify(token),
      updatedAt: Date.now(),
    }).onConflictDoUpdate({
      target: fiskalyConfig.key,
      set: { value: JSON.stringify(token), updatedAt: Date.now() },
    });
  } catch { /* ignore */ }
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.bearer;
  }

  if (!tokenCache) {
    const saved = await loadTokenFromDb();
    if (saved && Date.now() < saved.expiresAt) {
      tokenCache = saved;
      return saved.bearer;
    }
  }

  const res = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { api_key: API_KEY, api_secret: API_SECRET },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fiskaly auth failed: ${res.status} ${err}`);
  }
  const data = await res.json() as { content: { access_token: { bearer: string; expires_at: number } } };
  const t = data.content.access_token;
  const newCache: TokenCache = { bearer: t.bearer, expiresAt: t.expires_at * 1000 };
  tokenCache = newCache;
  saveTokenToDb(newCache);
  return t.bearer;
}

async function fiskalyFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = await getAccessToken();
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Fiskaly error ${res.status} on ${path}:`, err);
    throw new Error(`Fiskaly error ${res.status} on ${path}: ${err}`);
  }
  return res.json();
}

export async function createOrUpdateTaxpayer(legalName?: string): Promise<unknown> {
  return fiskalyFetch('/taxpayer', {
    method: 'PUT',
    body: JSON.stringify({
      content: {
        issuer: {
          legal_name: legalName || 'TPV Restaurante',
          tax_number: TAXPAYER_NIF,
        },
        address: { street: 'Calle Ejemplo', number: '1', city: 'Las Palmas', postal_code: '35001', country_code: 'ES', municipality: 'Las Palmas' },
        email: 'test@tpv.com',
        territory: TERRITORY,
      },
    }),
  });
}

export async function listSigners(): Promise<unknown[]> {
  const data = await fiskalyFetch('/signers', { method: 'GET' }) as { results?: unknown[]; content?: { results?: unknown[] } };
  return data.results || data.content?.results || [];
}

export async function createSigner(): Promise<unknown> {
  const id = randomUUID();
  return fiskalyFetch(`/signers/${id}`, {
    method: 'PUT',
    body: '{}',
  });
}

export async function generateTaxpayerAgreement(): Promise<Buffer> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/taxpayer/agreement`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: {} }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fiskaly error ${res.status} on /taxpayer/agreement: ${text}`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

export async function uploadTaxpayerAgreement(base64Pdf: string): Promise<unknown> {
  return fiskalyFetch('/taxpayer/agreement', {
    method: 'PUT',
    body: JSON.stringify({ content: { signed_agreement: base64Pdf } }),
  });
}

export async function createClient(): Promise<unknown> {
  const id = randomUUID();
  return fiskalyFetch(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content: {} }),
  });
}

interface CreateInvoiceParams {
  clientId: string;
  invoiceContent: Record<string, unknown>;
}

export async function createInvoice({ clientId, invoiceContent }: CreateInvoiceParams): Promise<unknown> {
  const id = randomUUID();
  return fiskalyFetch(`/clients/${clientId}/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      content: {
        type: 'SIMPLIFIED',
        ...invoiceContent,
      },
    }),
  });
}

interface FiskalyConfig {
  [key: string]: string;
}

export async function getFiskalyConfig(): Promise<FiskalyConfig> {
  const db = getDb();
  const rows = await db.select({ key: fiskalyConfig.key, value: fiskalyConfig.value })
    .from(fiskalyConfig);
  const cfg: FiskalyConfig = {};
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

export async function setupFiskaly(legalName?: string): Promise<unknown> {
  const existing = await getFiskalyConfig();
  if (existing.client_id) {
    return { status: 'already_setup', config: existing };
  }

  const db = getDb();
  await createOrUpdateTaxpayer(legalName);

  const c = await createClient() as { content?: { id?: string; signer?: { id?: string } }; id?: string };
  const clientId = c.content?.id || c.id;
  if (!clientId) throw new Error('No client ID in response: ' + JSON.stringify(c));
  await db.insert(fiskalyConfig).values({ key: 'client_id', value: clientId, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: fiskalyConfig.key, set: { value: clientId, updatedAt: Date.now() } });

  const signerId = c.content?.signer?.id || null;
  if (signerId) {
    await db.insert(fiskalyConfig).values({ key: 'signer_id', value: signerId, updatedAt: Date.now() })
      .onConflictDoUpdate({ target: fiskalyConfig.key, set: { value: signerId, updatedAt: Date.now() } });
  }

  return {
    status: 'created',
    config: { client_id: clientId, signer_id: signerId },
  };
}

interface SaleItem {
  productId?: string;
  name?: string;
  qty?: number;
  price?: number;
}

interface Sale {
  totalWithTip?: number;
  total?: number;
  items?: SaleItem[];
  closedAt?: number;
  tableName?: string;
  id?: string;
  saleId?: string;
}

export async function registerSaleInFiskaly(sale: Sale, numSerie?: string): Promise<unknown> {
  const cfg = await getFiskalyConfig();
  if (!cfg.client_id) {
    throw new Error('Fiskaly no configurado. Ejecuta /api/verifactu/setup primero.');
  }
  const totalAmount = Number(sale.totalWithTip ?? sale.total ?? 0);
  if (totalAmount <= 0) {
    throw new Error('Importe total inválido');
  }
  let items = (sale.items || [])
    .filter(i => i.productId)
    .map(item => {
      const qty = Number(item.qty) || 1;
      const unitPrice = Number(item.price) || 0;
      const fullAmount = qty * unitPrice;
      const base = fullAmount / 1.07;
      return {
        description: item.name || 'Producto',
        quantity: qty,
        unit_amount: Number(unitPrice.toFixed(2)),
        full_amount: Number(fullAmount.toFixed(2)),
        vat_category: {
          rate: 7.0,
          amount: Number((fullAmount - base).toFixed(2)),
        },
      };
    });

  const d = new Date(sale.closedAt ?? Date.now());
  const numStr = numSerie || String(Date.now()).slice(-6);
  const descripcion = sale.tableName
    ? `Venta mesa ${sale.tableName}`
    : `Venta TPV ${sale.id || sale.saleId || ''}`;

  const fmtDate = (dt: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}-${pad(dt.getMonth() + 1)}-${dt.getFullYear()}`;
  };

  if (items.length === 0) {
    const base = totalAmount / 1.07;
    items = [{
      description: descripcion,
      quantity: 1,
      unit_amount: Number(totalAmount.toFixed(2)),
      full_amount: Number(totalAmount.toFixed(2)),
      vat_category: {
        rate: 7.0,
        amount: Number((totalAmount - base).toFixed(2)),
      },
    }];
  }

  const invoiceContent = {
    number: numStr,
    text: descripcion,
    issued_at: d.toISOString(),
    transaction_date: fmtDate(d),
    full_amount: totalAmount.toFixed(2),
    items: items.map(i => ({
      text: i.description,
      quantity: String(i.quantity),
      unit_amount: i.unit_amount.toFixed(2),
      full_amount: i.full_amount.toFixed(2),
      system: {
        type: 'REGULAR',
        category: {
          type: 'VAT',
          rate: '7.00',
        },
      },
    })),
  };

  const invRes = await createInvoice({ clientId: cfg.client_id, invoiceContent }) as Record<string, unknown>;
  const inv = (invRes.content as Record<string, unknown> | undefined) || invRes;

  return {
    fiskalyInvoiceId: (inv.id || invRes.id) as string | undefined,
    verificationUrl: ((inv as Record<string, unknown>).compliance as Record<string, unknown> | undefined)?.url as string | null || null,
    qrUrl: ((inv as Record<string, unknown>).compliance as Record<string, unknown> | undefined)?.url as string | null || null,
    signedInvoice: inv,
  };
}
