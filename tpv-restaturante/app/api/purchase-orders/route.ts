import { NextRequest } from 'next/server';
import { sql, SQL } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { PurchaseOrderBody } from '@/lib/schemas/api-schemas';
import { z } from 'zod';

type Row = Record<string, unknown>;

interface PurchaseOrderRow extends Row {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  status: string | null;
  expected_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: number | string;
  updated_at: number | string | null;
  min_order?: number | string | null;
  pack_size?: number | string | null;
  price?: number | string | null;
  sku?: string | null;
  supplier_price?: number | string | null;
}

interface PurchaseOrderLineRow extends Row {
  id: number | string;
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number | string;
  price_per_unit: number | string;
  received_qty: number | string | null;
  supplier_sku: string | null;
}

interface SupplierCatalogRow extends Row {
  id: string;
  supplier_id: string;
  product_id: string | null;
  pack_size: number | string | null;
  price: number | string | null;
  min_order: number | string | null;
  sku: string | null;
  supplier_name?: string | null;
}

async function qr<T extends object = Row>(query: SQL): Promise<T[]> {
  const db = getDb();
  const r = await db.execute(query);
  const rows: unknown[] = r.rows;
  return rows.filter((x): x is T => typeof x === 'object' && x !== null && !Array.isArray(x));
}

interface AutoOrderSettingsRow extends Row {
  key: string;
  value: string | null;
}

interface StockLogRow extends Row {
  total: number | string | null;
}

interface ProductRow extends Row {
  id: string;
  name: string | null;
  type: string | null;
  total_stock: number | string | null;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    let query = sql`SELECT * FROM purchase_orders WHERE tenant_id = ${tenantId}`;
    const conds: SQL[] = [];
    if (supplierId) conds.push(sql`supplier_id = ${supplierId}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a: SQL, c: SQL) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY created_at DESC LIMIT 200`;

    const orders = await qr<PurchaseOrderRow>(query);
    const result: Array<Record<string, unknown>> = [];

    for (const o of orders) {
      const lines = await qr<PurchaseOrderLineRow>(sql`
        SELECT * FROM purchase_order_lines WHERE order_id = ${o.id} AND tenant_id = ${tenantId} ORDER BY id
      `);
      result.push({
        id: o.id, supplierId: o.supplier_id, supplierName: o.supplier_name,
        status: o.status, expectedDate: o.expected_date, notes: o.notes,
        createdBy: o.created_by, createdAt: Number(o.created_at), updatedAt: o.updated_at ? Number(o.updated_at) : null,
        lines: lines.map((l) => ({
          id: l.id, productId: l.product_id, productName: l.product_name,
          quantity: Number(l.quantity), pricePerUnit: Number(l.price_per_unit),
          supplierSku: l.supplier_sku, receivedQty: Number(l.received_qty),
        })),
      });
    }
    return apiOk(result);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = PurchaseOrderBody.extend({ action: z.string().min(1) }).safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action } = body;

    if (action === 'create') {
      const { supplierId, supplierName, expectedDate, notes, lines, createdBy } = body;
      const id = 'po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await db.execute(sql`INSERT INTO purchase_orders (id, supplier_id, supplier_name, status, expected_date, notes, created_by, created_at, tenant_id)
        VALUES (${id}, ${supplierId}, ${supplierName}, 'draft', ${expectedDate || ''}, ${notes || ''}, ${createdBy || ''}, ${Date.now()}, ${tenantId})`);
      for (const line of lines || []) {
        await db.execute(sql`INSERT INTO purchase_order_lines (order_id, product_id, product_name, quantity, price_per_unit, supplier_sku, tenant_id)
          VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.pricePerUnit || 0}, ${line.supplierSku || ''}, ${tenantId})`);
      }
      return apiOk({ id });
    }

    if (action === 'update-status') {
      const { id, status } = body;
      await db.execute(sql`UPDATE purchase_orders SET status=${status}, updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }

    if (action === 'update-lines') {
      const { id, lines } = body;
      await db.execute(sql`DELETE FROM purchase_order_lines WHERE order_id=${id} AND tenant_id = ${tenantId}`);
      for (const line of lines || []) {
        await db.execute(sql`INSERT INTO purchase_order_lines (order_id, product_id, product_name, quantity, price_per_unit, supplier_sku, received_qty, tenant_id)
          VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.pricePerUnit || 0}, ${line.supplierSku || ''}, ${line.receivedQty || 0}, ${tenantId})`);
      }
      await db.execute(sql`UPDATE purchase_orders SET updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }

    if (action === 'receive') {
      const { id, lines } = body;
      for (const l of lines || []) {
        await db.execute(sql`UPDATE purchase_order_lines SET received_qty=${l.receivedQty || 0} WHERE id=${l.lineId} AND order_id=${id} AND tenant_id = ${tenantId}`);
      }
      const [order] = await qr<PurchaseOrderRow>(sql`SELECT * FROM purchase_orders WHERE id=${id} AND tenant_id = ${tenantId}`);
      for (const l of lines || []) {
        const [line] = await qr<PurchaseOrderLineRow>(sql`SELECT * FROM purchase_order_lines WHERE id=${l.lineId} AND order_id=${id} AND tenant_id = ${tenantId}`);
        if (order && line && Number(l.receivedQty) > 0) {
          const [cat] = await qr<SupplierCatalogRow>(sql`
            SELECT sc.* FROM supplier_catalog sc
            WHERE sc.supplier_id = ${order.supplier_id} AND sc.product_id = ${line.product_id} AND sc.tenant_id = ${tenantId} LIMIT 1
          `);
          if (cat) {
            const ppu = Number(line.price_per_unit);
            await db.execute(sql`INSERT INTO supplier_price_history (catalog_id, supplier_id, product_id, pack_price, pack_size, price_per_unit, source, created_at, tenant_id)
              VALUES (${cat.id}, ${order.supplier_id}, ${line.product_id}, ${ppu}, 1, ${ppu}, 'receipt', ${Date.now()}, ${tenantId})`);
          }
        }
      }
      const allLines = await qr<PurchaseOrderLineRow>(sql`SELECT quantity, received_qty FROM purchase_order_lines WHERE order_id=${id} AND tenant_id = ${tenantId}`);
      const allReceived = allLines.every((l) => Number(l.received_qty) >= Number(l.quantity));
      const anyReceived = allLines.some((l) => Number(l.received_qty) > 0);
      const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'draft';
      await db.execute(sql`UPDATE purchase_orders SET status=${newStatus}, updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`);
      return apiOk({ newStatus });
    }

    if (action === 'auto-preview') {
      body.tenantId = tenantId;
      return handleAutoPreview(body);
    }

    if (action === 'auto-generate') {
      body.tenantId = tenantId;
      return handleAutoGenerate(body);
    }

    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}

async function getAutoSettings(tenantId: string) {
  const rows = await qr<AutoOrderSettingsRow>(sql`SELECT * FROM auto_order_settings WHERE tenant_id = ${tenantId}`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function num(v: unknown, fallback = 0): number {
  return Number(v) || fallback;
}

async function handleAutoPreview(body: Record<string, unknown>) {
  const tenantId = typeof body.tenantId === 'string' ? body.tenantId : 'default';
  const settings = await getAutoSettings(tenantId);
  const leadTimeDays = num(body.leadTimeDays) || num(settings.leadTimeDays) || 2;
  const safetyStockDays = num(body.safetyStockDays) || num(settings.safetyStockDays) || 3;
  const minOrderValue = num(body.minOrderValue) || num(settings.minOrderValue) || 50;
  const consolidateBySupplier = String(body.consolidateBySupplier ?? settings.consolidateBySupplier) === 'true';

  const products = await qr<ProductRow>(sql`
    SELECT p.id, p.name, p.type,
      COALESCE((SELECT SUM(ps.stock) FROM product_stock ps WHERE ps.product_id = p.id AND ps.tenant_id = ${tenantId}), 0) AS total_stock
    FROM products p WHERE p.active = true AND p.tenant_id = ${tenantId}
  `);

  const toReplenish: ProductRow[] = [];
  for (const p of products) {
    if (p.type === 'elaborado') continue;
    const stock = num(p.total_stock);
    const dailyConsumption = await estimateDailyConsumption(p.id, tenantId);
    const neededForLeadTime = dailyConsumption * leadTimeDays;
    const safetyStock = dailyConsumption * safetyStockDays;
    if (stock < (neededForLeadTime + safetyStock)) toReplenish.push(p);
  }

  const needSupplier: Array<{ product: ProductRow; offer: SupplierCatalogRow; neededQty: number }> = [];
  const noOfferProducts: ProductRow[] = [];

  for (const prod of toReplenish) {
    const stock = num(prod.total_stock);
    const dailyConsumption = await estimateDailyConsumption(prod.id, tenantId);
    const neededQty = Math.max(0, (dailyConsumption * (leadTimeDays + safetyStockDays)) - stock);

    let offers = await qr<SupplierCatalogRow>(sql`
      SELECT sc.*, s.name AS supplier_name FROM supplier_catalog sc
      JOIN suppliers s ON s.id = sc.supplier_id
      WHERE sc.product_id = ${prod.id} AND sc.active = true AND sc.is_preferred = true AND sc.tenant_id = ${tenantId}
      ORDER BY sc.price LIMIT 1
    `);
    if (offers.length === 0) {
      offers = await qr<SupplierCatalogRow>(sql`
        SELECT sc.*, s.name AS supplier_name FROM supplier_catalog sc
        JOIN suppliers s ON s.id = sc.supplier_id
        WHERE sc.product_id = ${prod.id} AND sc.active = true AND sc.tenant_id = ${tenantId}
        ORDER BY sc.price LIMIT 1
      `);
    }

    if (offers.length === 0) {
      noOfferProducts.push(prod);
      continue;
    }

    needSupplier.push({ product: prod, offer: offers[0], neededQty });
  }

  const bySupplier: Record<string, { supplierId: string; supplierName: string; lines: Array<Record<string, unknown>>; total: number }> = {};
  for (const item of needSupplier) {
    const sid = item.offer.supplier_id;
    if (!bySupplier[sid]) bySupplier[sid] = { supplierId: sid, supplierName: item.offer.supplier_name || '', lines: [], total: 0 };
    const packSize = num(item.offer.pack_size, 1);
    const qty = Math.ceil(item.neededQty / packSize) * packSize;
    const finalQty = Math.max(qty, num(item.offer.min_order, 0));
    const lineTotal = finalQty * num(item.offer.price);
    bySupplier[sid].lines.push({
      productId: item.product.id, productName: item.product.name,
      quantity: finalQty, pricePerUnit: num(item.offer.price),
      supplierSku: item.offer.sku || '',
    });
    bySupplier[sid].total += lineTotal;
  }

  const validSuppliers = consolidateBySupplier
    ? Object.values(bySupplier).filter((s) => s.total >= minOrderValue)
    : Object.values(bySupplier);

  return apiOk({
    preview: validSuppliers,
    noOfferProducts: noOfferProducts.map((p) => ({ id: p.id, name: p.name })),
    skippedByMin: consolidateBySupplier
      ? Object.values(bySupplier).filter((s) => s.total < minOrderValue).map((s) => ({ supplierName: s.supplierName, total: s.total, minOrderValue }))
      : [],
    settings,
  });
}

interface PreviewGroup {
  supplierId: string;
  supplierName: string;
  lines: Array<Record<string, unknown>>;
  total: number;
  minOrderValue?: number;
}

interface AutoPreviewResult {
  preview: PreviewGroup[];
  noOfferProducts: Array<{ id: string; name: string }>;
  skippedByMin: Array<{ supplierName: string; total: number; minOrderValue: number }>;
  settings: Record<string, string>;
}

async function handleAutoGenerate(body: Record<string, unknown>) {
  const db = getDb();
  const previewRes = await handleAutoPreview(body);
  const preview = await previewRes.json() as AutoPreviewResult;

  const tenantId = typeof body.tenantId === 'string' ? body.tenantId : 'default';
  const created: Array<Record<string, unknown>> = [];
  for (const group of preview.preview) {
    const id = 'po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    await db.execute(sql`INSERT INTO purchase_orders (id, supplier_id, supplier_name, status, created_by, notes, created_at, tenant_id)
      VALUES (${id}, ${group.supplierId}, ${group.supplierName}, 'draft', ${body.createdBy || 'auto'}, 'Pedido automático', ${Date.now()}, ${tenantId})`);
    for (const line of group.lines) {
      await db.execute(sql`INSERT INTO purchase_order_lines (order_id, product_id, product_name, quantity, price_per_unit, supplier_sku, tenant_id)
        VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.pricePerUnit}, ${line.supplierSku}, ${tenantId})`);
    }
    created.push({ id, supplierName: group.supplierName, lineCount: group.lines.length });
  }

  return apiOk({
    created,
    noOfferProducts: preview.noOfferProducts,
    skippedByMin: preview.skippedByMin,
  });
}

async function estimateDailyConsumption(productId: string, tenantId: string): Promise<number> {
  try {
    const db = getDb();
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const [log] = await qr<StockLogRow>(sql`
      SELECT SUM(ABS(change_amount)) AS total FROM stock_log
      WHERE product_id = ${productId} AND reason = 'venta' AND created_at >= ${thirtyDaysAgo} AND tenant_id = ${tenantId}
    `);
    const total = num(log?.total);
    return Math.max(0.5, total / 30);
  } catch {
    return 1;
  }
}
