import { randomUUID } from 'crypto';
import { sql } from './db';

const BASE_URL = process.env.FISKALY_ENVIRONMENT === 'LIVE'
  ? 'https://live.es.sign.fiskaly.com/api/v1'
  : 'https://test.es.sign.fiskaly.com/api/v1';

const API_KEY = process.env.FISKALY_API_KEY;
const API_SECRET = process.env.FISKALY_API_SECRET;
const TAXPAYER_NIF = process.env.FISKALY_TAXPAYER_NIF;
const TERRITORY = process.env.FISKALY_TERRITORY || 'CANARY_ISLANDS';

let tokenCache = { bearer: null, expiresAt: 0 };

async function getAccessToken() {
  if (tokenCache.bearer && Date.now() < tokenCache.expiresAt) {
    return tokenCache.bearer;
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
  const data = await res.json();
  const t = data.content.access_token;
  tokenCache = { bearer: t.bearer, expiresAt: t.expires_at * 1000 };
  return t.bearer;
}

async function fiskalyFetch(path, options = {}) {
  const token = await getAccessToken();
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fiskaly error ${res.status} on ${path}: ${err}`);
  }
  return res.json();
}

export async function createOrUpdateTaxpayer(legalName) {
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

export async function listSigners() {
  const data = await fiskalyFetch('/signers', { method: 'GET' });
  return data.results || data.content?.results || [];
}

export async function createSigner() {
  const id = randomUUID();
  return fiskalyFetch(`/signers/${id}`, {
    method: 'PUT',
    body: '{}',
  });
}

export async function generateTaxpayerAgreement() {
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

export async function uploadTaxpayerAgreement(base64Pdf) {
  return fiskalyFetch('/taxpayer/agreement', {
    method: 'PUT',
    body: JSON.stringify({ content: { signed_agreement: base64Pdf } }),
  });
}

export async function createClient() {
  const id = randomUUID();
  return fiskalyFetch(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      content: {},
    }),
  });
}

export async function createInvoice({ clientId, invoiceContent }) {
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

export async function getFiskalyConfig() {
  const rows = await sql`SELECT key, value FROM fiskaly_config`;
  const cfg = {};
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

export async function setupFiskaly(legalName) {
  const existing = await getFiskalyConfig();
  if (existing.client_id) {
    return { status: 'already_setup', config: existing };
  }

  await createOrUpdateTaxpayer(legalName);

  const c = await createClient();
  const clientId = c.content?.id || c.id;
  if (!clientId) throw new Error('No client ID in response: ' + JSON.stringify(c));
  await sql`INSERT INTO fiskaly_config (key, value, updated_at) VALUES ('client_id', ${clientId}, ${Date.now()})
    ON CONFLICT (key) DO UPDATE SET value = ${clientId}, updated_at = ${Date.now()}`;

  const signerId = c.content?.signer?.id || null;
  if (signerId) {
    await sql`INSERT INTO fiskaly_config (key, value, updated_at) VALUES ('signer_id', ${signerId}, ${Date.now()})
      ON CONFLICT (key) DO UPDATE SET value = ${signerId}, updated_at = ${Date.now()}`;
  }

  return {
    status: 'created',
    config: { client_id: clientId, signer_id: signerId },
  };
}

export async function registerSaleInFiskaly(sale, numSerie) {
  const cfg = await getFiskalyConfig();
  if (!cfg.client_id) {
    throw new Error('Fiskaly no configurado. Ejecuta /api/verifactu/setup primero.');
  }
  const totalAmount = Number(sale.totalWithTip ?? sale.total ?? 0);
  if (totalAmount <= 0) {
    throw new Error('Importe total inválido');
  }
  const items = (sale.items || [])
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

  const fmtDate = (dt) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}-${pad(dt.getMonth() + 1)}-${dt.getFullYear()}`;
  };
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

  const invRes = await createInvoice({ clientId: cfg.client_id, invoiceContent });
  const inv = invRes.content || invRes;

  return {
    fiskalyInvoiceId: inv.id || invRes.id,
    verificationUrl: inv.compliance?.url || null,
    qrUrl: inv.compliance?.url || null,
    signedInvoice: inv,
  };
}
