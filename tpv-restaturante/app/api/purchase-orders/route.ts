import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    let query = sql`SELECT * FROM purchase_orders WHERE tenant_id = ${tenantId}`;
    const conds = [];
    if (supplierId) conds.push(sql`supplier_id = ${supplierId}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a: any, c: any) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY created_at DESC LIMIT 200`;

    const orders = await db.execute(query).then(r => r.rows as any[]);
    const result = [];

    for (const o of orders) {
      const lines = await db.execute(sql`
        SELECT * FROM purchase_order_lines WHERE order_id = ${o.id} AND tenant_id = ${tenantId} ORDER BY id
      `).then(r => r.rows as any[]);
      result.push({
        id: o.id, supplierId: o.supplier_id, supplierName: o.supplier_name,
        status: o.status, expectedDate: o.expected_date, notes: o.notes,
        createdBy: o.created_by, createdAt: Number(o.created_at), updatedAt: o.updated_at ? Number(o.updated_at) : null,
        lines: lines.map((l: any) => ({
          id: l.id, productId: l.product_id, productName: l.product_name,
          quantity: parseFloat(l.quantity), pricePerUnit: parseFloat(l.price_per_unit),
          supplierSku: l.supplier_sku, receivedQty: parseFloat(l.received_qty),
        })),
      });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
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
      return NextResponse.json({ ok: true, id });
    }

    if (action === 'update-status') {
      const { id, status } = body;
      await db.execute(sql`UPDATE purchase_orders SET status=${status}, updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`);
      return NextResponse.json({ ok: true });
    }

    if (action === 'update-lines') {
      const { id, lines } = body;
      await db.execute(sql`DELETE FROM purchase_order_lines WHERE order_id=${id} AND tenant_id = ${tenantId}`);
      for (const line of lines || []) {
        await db.execute(sql`INSERT INTO purchase_order_lines (order_id, product_id, product_name, quantity, price_per_unit, supplier_sku, received_qty, tenant_id)
          VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.pricePerUnit || 0}, ${line.supplierSku || ''}, ${line.receivedQty || 0}, ${tenantId})`);
      }
      await db.execute(sql`UPDATE purchase_orders SET updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`);
      return NextResponse.json({ ok: true });
    }

    if (action === 'receive') {
      const { id, lines } = body;
      for (const l of lines || []) {
        await db.execute(sql`UPDATE purchase_order_lines SET received_qty=${l.receivedQty || 0} WHERE id=${l.lineId} AND order_id=${id} AND tenant_id = ${tenantId}`);
      }
      const [order] = await db.execute(sql`SELECT * FROM purchase_orders WHERE id=${id} AND tenant_id = ${tenantId}`).then(r => r.rows as any[]);
      for (const l of lines || []) {
        const [line] = await db.execute(sql`SELECT * FROM purchase_order_lines WHERE id=${l.lineId} AND order_id=${id} AND tenant_id = ${tenantId}`).then(r => r.rows as any[]);
        if (line && l.receivedQty > 0) {
          const [cat] = await db.execute(sql`
            SELECT sc.id FROM supplier_catalog sc
            WHERE sc.supplier_id = ${order.supplier_id} AND sc.product_id = ${line.product_id} AND sc.tenant_id = ${tenantId} LIMIT 1
          `).then(r => r.rows as any[]);
          if (cat) {
            const ppu = parseFloat(line.price_per_unit);
            await db.execute(sql`INSERT INTO supplier_price_history (catalog_id, supplier_id, product_id, pack_price, pack_size, price_per_unit, source, created_at, tenant_id)
              VALUES (${cat.id}, ${order.supplier_id}, ${line.product_id}, ${ppu}, 1, ${ppu}, 'receipt', ${Date.now()}, ${tenantId})`);
          }
        }
      }
      const allLines = await db.execute(sql`SELECT quantity, received_qty FROM purchase_order_lines WHERE order_id=${id} AND tenant_id = ${tenantId}`).then(r => r.rows as any[]);
      const allReceived = allLines.every((l: any) => parseFloat(l.received_qty) >= parseFloat(l.quantity));
      const anyReceived = allLines.some((l: any) => parseFloat(l.received_qty) > 0);
      const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'draft';
      await db.execute(sql`UPDATE purchase_orders SET status=${newStatus}, updated_at=${Date.now()} WHERE id=${id} AND tenant_id = ${tenantId}`);
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
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

async function getAutoSettings(tenantId: string) {
  const db = getDb();
  const rows = await db.execute(sql`SELECT * FROM auto_order_settings WHERE tenant_id = ${tenantId}`).then(r => r.rows as any[]);
  return Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
}

async function handleAutoPreview(body: any) {
  const db = getDb();
  const tenantId = body.tenantId || 'default';
  const settings = await getAutoSettings(tenantId);
  const leadTimeDays = parseInt(body.leadTimeDays || settings.leadTimeDays || '2');
  const safetyStockDays = parseInt(body.safetyStockDays || settings.safetyStockDays || '3');
  const minOrderValue = parseFloat(body.minOrderValue || settings.minOrderValue || '50');
  const consolidateBySupplier = (body.consolidateBySupplier ?? settings.consolidateBySupplier) === 'true';

  const products = await db.execute(sql`
    SELECT p.id, p.name, p.type,
      COALESCE((SELECT SUM(ps.stock) FROM product_stock ps WHERE ps.product_id = p.id AND ps.tenant_id = ${tenantId}), 0) AS total_stock
    FROM products p WHERE p.active = true AND p.tenant_id = ${tenantId}
  `).then(r => r.rows as any[]);

  const toReplenish: any[] = [];
  for (const p of products) {
    if (p.type === 'elaborado') continue;
    const stock = parseInt(p.total_stock);
    const estimatedDailyConsumption = await estimateDailyConsumption(p.id, tenantId);
    const neededForLeadTime = estimatedDailyConsumption * leadTimeDays;
    const safetyStock = estimatedDailyConsumption * safetyStockDays;
    if (stock < (neededForLeadTime + safetyStock)) toReplenish.push(p);
  }

  const needSupplier = [];
  const noOfferProducts = [];

  for (const prod of toReplenish) {
    const stock = parseInt(prod.total_stock);
    const dailyConsumption = await estimateDailyConsumption(prod.id, tenantId);
    const neededQty = Math.max(0, (dailyConsumption * (leadTimeDays + safetyStockDays)) - stock);

    let offers = await db.execute(sql`
      SELECT sc.*, s.name AS supplier_name FROM supplier_catalog sc
      JOIN suppliers s ON s.id = sc.supplier_id
      WHERE sc.product_id = ${prod.id} AND sc.active = true AND sc.is_preferred = true AND sc.tenant_id = ${tenantId}
      ORDER BY sc.price LIMIT 1
    `).then(r => r.rows as any[]);
    if (offers.length === 0) {
      offers = await db.execute(sql`
        SELECT sc.*, s.name AS supplier_name FROM supplier_catalog sc
        JOIN suppliers s ON s.id = sc.supplier_id
        WHERE sc.product_id = ${prod.id} AND sc.active = true AND sc.tenant_id = ${tenantId}
        ORDER BY sc.price LIMIT 1
      `).then(r => r.rows as any[]);
    }

    if (offers.length === 0) {
      noOfferProducts.push(prod);
      continue;
    }

    needSupplier.push({ product: prod, offer: offers[0], neededQty });
  }

  const bySupplier: Record<string, any> = {};
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

  const validSuppliers = consolidateBySupplier
    ? Object.values(bySupplier).filter((s: any) => s.total >= minOrderValue)
    : Object.values(bySupplier);

  return NextResponse.json({
    preview: validSuppliers,
    noOfferProducts: noOfferProducts.map((p: any) => ({ id: p.id, name: p.name })),
    skippedByMin: consolidateBySupplier
      ? Object.values(bySupplier).filter((s: any) => s.total < minOrderValue).map((s: any) => ({ supplierName: s.supplierName, total: s.total, minOrderValue }))
      : [],
    settings,
  });
}

async function handleAutoGenerate(body: any) {
  const db = getDb();
  const previewRes = await handleAutoPreview(body);
  const preview = await previewRes.json();

  const tenantId = body.tenantId || 'default';
  const created = [];
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

  return NextResponse.json({
    ok: true, created,
    noOfferProducts: preview.noOfferProducts,
    skippedByMin: preview.skippedByMin,
  });
}

async function estimateDailyConsumption(productId: string, tenantId: string): Promise<number> {
  try {
    const db = getDb();
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const [log] = await db.execute(sql`
      SELECT SUM(ABS(change_amount)) AS total FROM stock_log
      WHERE product_id = ${productId} AND reason = 'venta' AND created_at >= ${thirtyDaysAgo} AND tenant_id = ${tenantId}
    `).then(r => r.rows as any[]);
    const total = parseInt(log?.total || 0);
    return Math.max(0.5, total / 30);
  } catch {
    return 1;
  }
}
