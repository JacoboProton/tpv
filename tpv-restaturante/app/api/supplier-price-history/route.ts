import { NextRequest } from 'next/server';
import { eq, sql, SQL } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { supplierPriceHistory, suppliers, products } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { SupplierPriceHistoryBody } from '@/lib/schemas/api-schemas';

type Row = Record<string, unknown>;

async function qr(query: SQL): Promise<Row[]> {
  const db = getDb();
  return db.execute(query).then((r: { rows: Row[] }) => r.rows);
}

function num(v: unknown, fallback = 0): number {
  return Number(v) || fallback;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const catalogId = searchParams.get('catalogId');
    const productId = searchParams.get('productId');
    const supplierId = searchParams.get('supplierId');

    let query = sql`
      SELECT sph.*, s.name AS supplier_name, p.name AS product_name
      FROM supplier_price_history sph
      JOIN suppliers s ON s.id = sph.supplier_id
      JOIN products p ON p.id = sph.product_id
      WHERE sph.tenant_id = ${tenantId}
    `;
    const conds: SQL[] = [];
    if (catalogId) conds.push(sql`sph.catalog_id = ${catalogId}`);
    if (productId) conds.push(sql`sph.product_id = ${productId}`);
    if (supplierId) conds.push(sql`sph.supplier_id = ${supplierId}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY sph.created_at DESC LIMIT 50`;

    const rows = await qr(query);

    return apiOk(rows.map((r) => ({
      id: r.id, catalogId: r.catalog_id, supplierId: r.supplier_id, supplierName: r.supplier_name,
      productId: r.product_id, productName: r.product_name,
      packPrice: num(r.pack_price), packSize: num(r.pack_size),
      pricePerUnit: num(r.price_per_unit),
      source: r.source, createdAt: Number(r.created_at),
    })));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = SupplierPriceHistoryBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { catalogId, supplierId, productId, packPrice, packSize, source } = body;
    const ppu = (packPrice || 0) / (packSize || 1);
    await db.execute(sql`
      INSERT INTO supplier_price_history (catalog_id, supplier_id, product_id, pack_price, pack_size, price_per_unit, source, created_at, tenant_id)
      VALUES (${catalogId}, ${supplierId}, ${productId}, ${packPrice}, ${packSize || 1}, ${ppu}, ${source || 'manual'}, ${Date.now()}, ${tenantId})
    `);
    return apiOk();
  } catch (err) { return apiError(err); }
}
