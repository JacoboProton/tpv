import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    let query = sql`SELECT * FROM purchase_orders WHERE tenant_id = ${tenantId}`;
    const conds = [];
    if (supplierId) conds.push(sql`supplier_id = ${supplierId}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY created_at DESC LIMIT 200`;

    const orders = await query;
    const result = [];

    for (const o of orders) {
      const lines = await sql`SELECT * FROM purchase_order_lines WHERE order_id = ${o.id} AND tenant_id = ${tenantId} ORDER BY id`;
      result.push({
        id: o.id, supplierId: o.supplier_id, supplierName: o.supplier_name,
        status: o.status, expectedDate: o.expected_date, notes: o.notes,
        createdBy: o.created_by, createdAt: Number(o.created_at), updatedAt: o.updated_at ? Number(o.updated_at) : null,
        lines: lines.map(l => ({
          id: l.id, productId: l.product_id, productName: l.product_name,
          quantity: parseFloat(l.quantity), pricePerUnit: parseFloat(l.price_per_unit),
          supplierSku: l.supplier_sku, receivedQty: parseFloat(l.received_qty),
        })),
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { supplierId, supplierName, expectedDate, notes, lines, createdBy } = body;
      const id = 'po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await sql`INSERT INTO purchase_orders (id, supplier_id, supplier_name, status, expected_date, notes, created_by, created_at, tenant_id)
        VALUES (${id}, ${supplierId}, ${supplierName}, 'draft', ${expectedDate || ''}, ${notes || ''}, ${createdBy || ''}, ${Date.now()}, ${tenantId})`;
      for (const line of lines || []) {
        await sql`INSERT INTO purchase_order_lines (order_id, product_id, product_name, quantity, price_per_unit, supplier_sku, tenant_id)
          VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.pricePerUnit || 0}, ${line.supplierSku || ''}, ${tenantId})`;
      }
      return NextResponse.json({ ok: true, id });
    }

    if (action === 'update-status') {
      const { id, status } = body;
      await sql`UPDATE purchase_orders SET status=${status}, updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update-lines') {
      const { id, lines } = body;
      await sql`DELETE FROM purchase_order_lines WHERE order_id=${id} AND tenant_id = ${tenantId}`;
      for (const line of lines || []) {
        await sql`INSERT INTO purchase_order_lines (order_id, product_id, product_name, quantity, price_per_unit, supplier_sku, received_qty, tenant_id)
          VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.pricePerUnit || 0}, ${line.supplierSku || ''}, ${line.receivedQty || 0}, ${tenantId})`;
      }
      await sql`UPDATE purchase_orders SET updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'receive') {
      const { id, lines } = body;
      for (const l of lines || []) {
        await sql`UPDATE purchase_order_lines SET received_qty=${l.receivedQty || 0} WHERE id=${l.lineId} AND order_id=${id} AND tenant_id = ${tenantId}`;
      }
      // Record price history from received items
      const order = (await sql`SELECT * FROM purchase_orders WHERE id=${id} AND tenant_id = ${tenantId}`)[0];
      for (const l of lines || []) {
        const line = (await sql`SELECT * FROM purchase_order_lines WHERE id=${l.lineId} AND order_id=${id} AND tenant_id = ${tenantId}`)[0];
        if (line && l.receivedQty > 0) {
          const cat = await sql`
            SELECT sc.id FROM supplier_catalog sc
            WHERE sc.supplier_id = ${order.supplier_id} AND sc.product_id = ${line.product_id} AND sc.tenant_id = ${tenantId} LIMIT 1
          `;
          if (cat.length > 0) {
            const ppu = parseFloat(line.price_per_unit);
            await sql`INSERT INTO supplier_price_history (catalog_id, supplier_id, product_id, pack_price, pack_size, price_per_unit, source, created_at, tenant_id)
              VALUES (${cat[0].id}, ${order.supplier_id}, ${line.product_id}, ${ppu}, 1, ${ppu}, 'receipt', ${Date.now()}, ${tenantId})`;
          }
        }
      }
      const allLines = await sql`SELECT quantity, received_qty FROM purchase_order_lines WHERE order_id=${id} AND tenant_id = ${tenantId}`;
      const allReceived = allLines.every(l => parseFloat(l.received_qty) >= parseFloat(l.quantity));
      const anyReceived = allLines.some(l => parseFloat(l.received_qty) > 0);
      const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'draft';
      await sql`UPDATE purchase_orders SET status=${newStatus}, updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true, newStatus });
    }

    if (action === 'auto-preview') {
      body.tenantId = tenantId;
      return handleAutoPreview(body);
    }

    if (action === 'auto-generate') {
      body.tenantId = tenantId;
      return handleAutoGenerate(body);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- Auto-order logic ---

async function getAutoSettings(tenantId) {
  const rows = await sql`SELECT * FROM auto_order_settings WHERE tenant_id = ${tenantId}`;
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function handleAutoPreview(body) {
  const tenantId = body.tenantId || 'default';
  const settings = await getAutoSettings(tenantId);
  const leadTimeDays = parseInt(body.leadTimeDays || settings.leadTimeDays || '2');
  const safetyStockDays = parseInt(body.safetyStockDays || settings.safetyStockDays || '3');
  const minOrderValue = parseFloat(body.minOrderValue || settings.minOrderValue || '50');
  const consolidateBySupplier = (body.consolidateBySupplier ?? settings.consolidateBySupplier) === 'true';

  // 1. Get all products with stock info, excluding elaborados
  const products = await sql`
    SELECT p.id, p.name, p.type,
      COALESCE((SELECT SUM(ps.stock) FROM product_stock ps WHERE ps.product_id = p.id AND ps.tenant_id = ${tenantId}), 0) AS total_stock
    FROM products p WHERE p.active = true AND p.tenant_id = ${tenantId}
  `;

  // 2. Calculate which products need replenishment
  const toReplenish = products.filter(p => {
    if (p.type === 'elaborado') return false;
    const stock = parseInt(p.total_stock);
    const estimatedDailyConsumption = estimateDailyConsumption(p.id, tenantId);
    const neededForLeadTime = estimatedDailyConsumption * leadTimeDays;
    const safetyStock = estimatedDailyConsumption * safetyStockDays;
    return stock < (neededForLeadTime + safetyStock);
  });

  // 3. For each product, find supplier offer
  const needSupplier = [];
  const noOfferProducts = [];

  for (const prod of toReplenish) {
    const stock = parseInt(prod.total_stock);
    const dailyConsumption = estimateDailyConsumption(prod.id, tenantId);
    const neededQty = Math.max(0, (dailyConsumption * (leadTimeDays + safetyStockDays)) - stock);

    // Find offers: preferred supplier first, then cheapest active
    let offers = await sql`
      SELECT sc.*, s.name AS supplier_name FROM supplier_catalog sc
      JOIN suppliers s ON s.id = sc.supplier_id
      WHERE sc.product_id = ${prod.id} AND sc.active = true AND sc.is_preferred = true AND sc.tenant_id = ${tenantId}
      ORDER BY sc.price LIMIT 1
    `;
    if (offers.length === 0) {
      offers = await sql`
        SELECT sc.*, s.name AS supplier_name FROM supplier_catalog sc
        JOIN suppliers s ON s.id = sc.supplier_id
        WHERE sc.product_id = ${prod.id} AND sc.active = true AND sc.tenant_id = ${tenantId}
        ORDER BY sc.price LIMIT 1
      `;
    }

    if (offers.length === 0) {
      noOfferProducts.push(prod);
      continue;
    }

    needSupplier.push({ product: prod, offer: offers[0], neededQty });
  }

  // 4. Group by supplier
  const bySupplier = {};
  for (const item of needSupplier) {
    const sid = item.offer.supplier_id;
    if (!bySupplier[sid]) bySupplier[sid] = { supplierId: sid, supplierName: item.offer.supplier_name, lines: [], total: 0 };
    const qty = Math.ceil(item.neededQty / parseFloat(item.offer.pack_size || 1)) * parseFloat(item.offer.pack_size || 1);
    const finalQty = Math.max(qty, parseFloat(item.offer.min_order || 0));
    const lineTotal = finalQty * parseFloat(item.offer.price);
    bySupplier[sid].lines.push({
      productId: item.product.id, productName: item.product.name,
      quantity: finalQty, pricePerUnit: parseFloat(item.offer.price),
      supplierSku: item.offer.sku || '',
    });
    bySupplier[sid].total += lineTotal;
  }

  // 5. Filter out suppliers below min order value
  const validSuppliers = consolidateBySupplier
    ? Object.values(bySupplier).filter(s => s.total >= minOrderValue)
    : Object.values(bySupplier);

  return NextResponse.json({
    preview: validSuppliers,
    noOfferProducts: noOfferProducts.map(p => ({ id: p.id, name: p.name })),
    skippedByMin: consolidateBySupplier
      ? Object.values(bySupplier).filter(s => s.total < minOrderValue).map(s => ({ supplierName: s.supplierName, total: s.total, minOrderValue }))
      : [],
    settings,
  });
}

async function handleAutoGenerate(body) {
  const previewRes = await handleAutoPreview(body);
  const preview = await previewRes.json();

  const tenantId = body.tenantId || 'default';
  const created = [];
  for (const group of preview.preview) {
    const id = 'po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    await sql`INSERT INTO purchase_orders (id, supplier_id, supplier_name, status, created_by, notes, created_at, tenant_id)
      VALUES (${id}, ${group.supplierId}, ${group.supplierName}, 'draft', ${body.createdBy || 'auto'}, 'Pedido automático', ${Date.now()}, ${tenantId})`;
    for (const line of group.lines) {
      await sql`INSERT INTO purchase_order_lines (order_id, product_id, product_name, quantity, price_per_unit, supplier_sku, tenant_id)
        VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.pricePerUnit}, ${line.supplierSku}, ${tenantId})`;
    }
    created.push({ id, supplierName: group.supplierName, lineCount: group.lines.length });
  }

  return NextResponse.json({
    ok: true, created,
    noOfferProducts: preview.noOfferProducts,
    skippedByMin: preview.skippedByMin,
  });
}

// Simple daily consumption estimation based on stock_log (last 30 days of sales)
async function estimateDailyConsumption(productId, tenantId) {
  try {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const logs = await sql`
      SELECT SUM(ABS(change_amount)) AS total FROM stock_log
      WHERE product_id = ${productId} AND reason = 'venta' AND created_at >= ${thirtyDaysAgo} AND tenant_id = ${tenantId}
    `;
    const total = parseInt(logs[0]?.total || 0);
    return Math.max(0.5, total / 30); // at least 0.5/day to avoid divide-by-zero
  } catch {
    return 1;
  }
}
