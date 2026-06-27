import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const productId = searchParams.get('productId');
    let query = sql`SELECT sc.*, s.name AS supplier_name, p.name AS product_name
      FROM supplier_catalog sc
      JOIN suppliers s ON s.id = sc.supplier_id
      JOIN products p ON p.id = sc.product_id`;
    const conds = [];
    if (supplierId) conds.push(sql`sc.supplier_id = ${supplierId}`);
    if (productId) conds.push(sql`sc.product_id = ${productId}`);
    if (conds.length > 0) query = sql`${query} WHERE ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY s.name, p.name`;
    const rows = await query;

    // Fetch latest price history for each catalog entry
    const result = [];
    for (const r of rows) {
      const history = await sql`
        SELECT price_per_unit, pack_price, pack_size, source, created_at
        FROM supplier_price_history
        WHERE catalog_id = ${r.id}
        ORDER BY created_at DESC LIMIT 2
      `;
      const prevPrice = history.length >= 2 ? parseFloat(history[1].price_per_unit) : null;
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
        pricePerUnit: currPrice,
        trend, prevPrice,
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'save') {
      const { id, supplierId, productId, sku, price, packSize, minOrder, deliveryDays, isPreferred, active } = body;

      // If marking as preferred, unset any existing preferred for this product
      if (isPreferred) {
        await sql`UPDATE supplier_catalog SET is_preferred = false WHERE product_id = ${productId} AND is_preferred = true`;
      }

      if (id) {
        await sql`UPDATE supplier_catalog SET sku=${sku || ''}, price=${price}, pack_size=${packSize || 1},
          min_order=${minOrder || 0}, delivery_days=${deliveryDays || 0}, is_preferred=${!!isPreferred},
          active=${active !== false} WHERE id=${id}`;
      } else {
        await sql`INSERT INTO supplier_catalog (supplier_id, product_id, sku, price, pack_size, min_order, delivery_days, is_preferred, active)
          VALUES (${supplierId}, ${productId}, ${sku || ''}, ${price}, ${packSize || 1}, ${minOrder || 0},
          ${deliveryDays || 0}, ${!!isPreferred}, ${active !== false})
          ON CONFLICT (supplier_id, product_id) DO UPDATE SET
          sku=EXCLUDED.sku, price=EXCLUDED.price, pack_size=EXCLUDED.pack_size, min_order=EXCLUDED.min_order,
          delivery_days=EXCLUDED.delivery_days, is_preferred=EXCLUDED.is_preferred, active=EXCLUDED.active`;
      }

      // Save price history (manual edit)
      if (id || !id) {
        const catId = id || (await sql`SELECT id FROM supplier_catalog WHERE supplier_id=${supplierId} AND product_id=${productId} LIMIT 1`)[0]?.id;
        if (catId) {
          const ppu = parseFloat(price) / parseFloat(packSize || 1);
          await sql`INSERT INTO supplier_price_history (catalog_id, supplier_id, product_id, pack_price, pack_size, price_per_unit, source, created_at)
            VALUES (${catId}, ${supplierId}, ${productId}, ${price}, ${packSize || 1}, ${ppu}, 'manual', ${Date.now()})`;
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete') {
      const cat = await sql`SELECT supplier_id, product_id, is_preferred FROM supplier_catalog WHERE id=${body.id}`;
      await sql`DELETE FROM supplier_catalog WHERE id=${body.id}`;

      if (cat.length > 0 && cat[0].is_preferred) {
        // Auto-promote another active offer
        const next = await sql`
          SELECT id FROM supplier_catalog WHERE product_id = ${cat[0].product_id} AND active = true
          ORDER BY price LIMIT 1
        `;
        if (next.length > 0) {
          await sql`UPDATE supplier_catalog SET is_preferred = true WHERE id = ${next[0].id}`;
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
