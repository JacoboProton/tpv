import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { supplierCatalog, suppliers, products, supplierPriceHistory } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiServerError } from '../../../lib/infrastructure/response';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const productId = searchParams.get('productId');

    let query = sql`
      SELECT sc.*, s.name AS supplier_name, p.name AS product_name
      FROM supplier_catalog sc
      JOIN suppliers s ON s.id = sc.supplier_id
      JOIN products p ON p.id = sc.product_id
      WHERE sc.tenant_id = ${tenantId}
    `;
    const conds = [];
    if (supplierId) conds.push(sql`sc.supplier_id = ${supplierId}`);
    if (productId) conds.push(sql`sc.product_id = ${productId}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a: any, c: any) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY s.name, p.name`;

    const rows = await db.execute(query).then(r => r.rows as any[]);

    const result = [];
    for (const r of rows) {
      const [history] = await db.execute(sql`
        SELECT price_per_unit, pack_price, pack_size, source, created_at
        FROM supplier_price_history
        WHERE catalog_id = ${r.id} AND tenant_id = ${tenantId}
        ORDER BY created_at DESC LIMIT 2
      `).then(r => r.rows as any[]);

      const prevPrice = history ? parseFloat(history.price_per_unit) : null;
      const currPrice = parseFloat(r.price) / parseFloat(r.pack_size || 1);
      const trend = prevPrice !== null && prevPrice > 0
        ? ((currPrice - prevPrice) / prevPrice) * 100
        : null;

      result.push({
        id: r.id, supplierId: r.supplier_id, supplierName: r.supplier_name,
        productId: r.product_id, productName: r.product_name,
        sku: r.sku, price: parseFloat(r.price), packSize: parseFloat(r.pack_size),
        minOrder: parseFloat(r.min_order), deliveryDays: r.delivery_days || 0,
        isPreferred: !!r.is_preferred, active: r.active,
        pricePerUnit: currPrice, trend, prevPrice,
      });
    }
    return apiOk(result);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action } = body;

    if (action === 'save') {
      const { id, supplierId, productId, sku, price, packSize, minOrder, deliveryDays, isPreferred, active } = body;

      if (isPreferred) {
        await db.execute(sql`
          UPDATE supplier_catalog SET is_preferred = false WHERE product_id = ${productId} AND tenant_id = ${tenantId} AND is_preferred = true
        `);
      }

      if (id) {
        await db.execute(sql`
          UPDATE supplier_catalog SET sku=${sku || ''}, price=${price}, pack_size=${packSize || 1},
            min_order=${minOrder || 0}, delivery_days=${deliveryDays || 0}, is_preferred=${!!isPreferred},
            active=${active !== false} WHERE id=${id} AND tenant_id = ${tenantId}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO supplier_catalog (supplier_id, product_id, sku, price, pack_size, min_order, delivery_days, is_preferred, active, tenant_id)
          VALUES (${supplierId}, ${productId}, ${sku || ''}, ${price}, ${packSize || 1}, ${minOrder || 0},
          ${deliveryDays || 0}, ${!!isPreferred}, ${active !== false}, ${tenantId})
          ON CONFLICT (supplier_id, product_id) DO UPDATE SET
          sku=EXCLUDED.sku, price=EXCLUDED.price, pack_size=EXCLUDED.pack_size, min_order=EXCLUDED.min_order,
          delivery_days=EXCLUDED.delivery_days, is_preferred=EXCLUDED.is_preferred, active=EXCLUDED.active
        `);
      }

      if (id || !id) {
        const [catRow] = id
          ? [{ id }]
          : await db.execute(sql`
              SELECT id FROM supplier_catalog WHERE supplier_id=${supplierId} AND product_id=${productId} AND tenant_id = ${tenantId} LIMIT 1
            `).then(r => r.rows as any[]);
        if (catRow?.id) {
          const ppu = parseFloat(price) / parseFloat(packSize || 1);
          await db.execute(sql`
            INSERT INTO supplier_price_history (catalog_id, supplier_id, product_id, pack_price, pack_size, price_per_unit, source, created_at, tenant_id)
            VALUES (${catRow.id}, ${supplierId}, ${productId}, ${price}, ${packSize || 1}, ${ppu}, 'manual', ${Date.now()}, ${tenantId})
          `);
        }
      }
      return apiOk();
    }

    if (action === 'delete') {
      const [cat] = await db.execute(sql`
        SELECT supplier_id, product_id, is_preferred FROM supplier_catalog WHERE id=${body.id} AND tenant_id = ${tenantId}
      `).then(r => r.rows as any[]);
      await db.execute(sql`DELETE FROM supplier_catalog WHERE id=${body.id} AND tenant_id = ${tenantId}`);

      if (cat?.is_preferred) {
        const [next] = await db.execute(sql`
          SELECT id FROM supplier_catalog WHERE product_id = ${cat.product_id} AND active = true AND tenant_id = ${tenantId}
          ORDER BY price LIMIT 1
        `).then(r => r.rows as any[]);
        if (next?.id) {
          await db.execute(sql`UPDATE supplier_catalog SET is_preferred = true WHERE id = ${next.id} AND tenant_id = ${tenantId}`);
        }
      }
      return apiOk();
    }

    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}
