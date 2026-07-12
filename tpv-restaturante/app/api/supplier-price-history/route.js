import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const catalogId = searchParams.get('catalogId');
    const productId = searchParams.get('productId');
    const supplierId = searchParams.get('supplierId');

    let query = sql`SELECT sph.*, s.name AS supplier_name, p.name AS product_name
      FROM supplier_price_history sph
      JOIN suppliers s ON s.id = sph.supplier_id
      JOIN products p ON p.id = sph.product_id
      WHERE sph.tenant_id = ${tenantId}`;
    const conds = [];
    if (catalogId) conds.push(sql`sph.catalog_id = ${catalogId}`);
    if (productId) conds.push(sql`sph.product_id = ${productId}`);
    if (supplierId) conds.push(sql`sph.supplier_id = ${supplierId}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY sph.created_at DESC LIMIT 50`;
    const rows = await query;

    return NextResponse.json(rows.map(r => ({
      id: r.id, catalogId: r.catalog_id, supplierId: r.supplier_id, supplierName: r.supplier_name,
      productId: r.product_id, productName: r.product_name,
      packPrice: parseFloat(r.pack_price), packSize: parseFloat(r.pack_size),
      pricePerUnit: parseFloat(r.price_per_unit),
      source: r.source, createdAt: Number(r.created_at),
    })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    const { catalogId, supplierId, productId, packPrice, packSize, source } = body;
    const ppu = parseFloat(packPrice) / parseFloat(packSize || 1);
    await sql`INSERT INTO supplier_price_history (catalog_id, supplier_id, product_id, pack_price, pack_size, price_per_unit, source, created_at, tenant_id)
      VALUES (${catalogId}, ${supplierId}, ${productId}, ${packPrice}, ${packSize || 1}, ${ppu}, ${source || 'manual'}, ${Date.now()}, ${tenantId})`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
