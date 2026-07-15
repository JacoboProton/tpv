import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    let query = sql`SELECT * FROM albaranes WHERE tenant_id = ${tenantId}`;
    const conds = [];
    if (supplierId) conds.push(sql`supplier_id = ${supplierId}`);
    if (startDate) conds.push(sql`delivery_date >= ${startDate}`);
    if (endDate) conds.push(sql`delivery_date <= ${endDate}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a: any, c: any) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY delivery_date DESC, created_at DESC LIMIT 200`;

    const albaranes = await query;
    const result = [];

    for (const a of albaranes) {
      const lines = await sql`SELECT * FROM albaran_lines WHERE albaran_id = ${a.id} AND tenant_id = ${tenantId} ORDER BY id`;
      result.push({
        id: a.id,
        supplierId: a.supplier_id,
        supplierName: a.supplier_name,
        albaranNumber: a.albaran_number,
        deliveryDate: a.delivery_date,
        invoiceNumber: a.invoice_number,
        notes: a.notes,
        totalAmount: parseFloat(a.total_amount),
        totalNet: parseFloat(a.total_net || 0),
        totalIva: parseFloat(a.total_iva || 0),
        headerDiscountPct: parseFloat(a.header_discount_pct || 0),
        headerDiscountAmount: parseFloat(a.header_discount_amount || 0),
        recargoEquivalenciaPct: parseFloat(a.recargo_equivalencia_pct || 0),
        recargoAmount: parseFloat(a.recargo_amount || 0),
        portesAmount: parseFloat(a.portes_amount || 0),
        status: a.status || 'draft',
        receivedBy: a.received_by,
        anuladoBy: a.anulado_by,
        anuladoAt: a.anulado_at ? Number(a.anulado_at) : null,
        anuladoReason: a.anulado_reason,
        linkedPurchaseOrderId: a.linked_purchase_order_id,
        createdAt: Number(a.created_at),
        updatedAt: a.updated_at ? Number(a.updated_at) : null,
        lines: lines.map(l => ({
          id: l.id,
          productId: l.product_id,
          productName: l.product_name,
          quantity: parseFloat(l.quantity),
          packSize: parseFloat(l.pack_size || 1),
          pricePerPack: parseFloat(l.price_per_pack),
          pricePerUnit: parseFloat(l.price_per_unit),
          supplierSku: l.supplier_sku,
          ivaPct: parseFloat(l.iva_pct || 0),
          lineDiscountPct: parseFloat(l.line_discount_pct || 0),
          lineDiscountAmount: parseFloat(l.line_discount_amount || 0),
          subtotal: parseFloat(l.subtotal),
          ivaAmount: parseFloat(l.iva_amount || 0),
          totalLine: parseFloat(l.total_line),
          batchNumber: l.batch_number,
          expiryDate: l.expiry_date,
          location: l.location || 'Almacén',
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
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action } = body;

    if (action === 'create') {
      const { supplierId, supplierName, albaranNumber, deliveryDate, invoiceNumber, notes, lines, receivedBy, headerDiscountPct, recargoEquivalenciaPct, portesAmount, linkedPurchaseOrderId } = body;
      const id = 'alb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      
      // Calculate totals
      let totalNet = 0;
      let totalIva = 0;
      const processedLines = [];
      
      for (const line of lines || []) {
        const packSize = parseFloat(line.packSize || 1);
        const pricePerPack = parseFloat(line.pricePerPack || line.pricePerUnit);
        const pricePerUnit = pricePerPack / packSize;
        const quantity = parseFloat(line.quantity || 0);
        const lineDiscountPct = parseFloat(line.lineDiscountPct || 0);
        const ivaPct = parseFloat(line.ivaPct || 0);
        
        const subtotal = quantity * pricePerPack;
        const lineDiscountAmount = subtotal * (lineDiscountPct / 100);
        const afterLineDiscount = subtotal - lineDiscountAmount;
        const ivaAmount = afterLineDiscount * (ivaPct / 100);
        const totalLine = afterLineDiscount + ivaAmount;
        
        totalNet += afterLineDiscount;
        totalIva += ivaAmount;
        
        processedLines.push({
          ...line,
          packSize,
          pricePerPack,
          pricePerUnit,
          lineDiscountAmount,
          subtotal,
          ivaAmount,
          totalLine
        });
      }
      
      const headerDiscountPctVal = parseFloat(headerDiscountPct || 0);
      const headerDiscountAmount = totalNet * (headerDiscountPctVal / 100);
      const afterHeaderDiscount = totalNet - headerDiscountAmount;
      const recargoEquivalenciaPctVal = parseFloat(recargoEquivalenciaPct || 0);
      const recargoAmount = afterHeaderDiscount * (recargoEquivalenciaPctVal / 100);
      const portesAmountVal = parseFloat(portesAmount || 0);
      const totalAmount = afterHeaderDiscount + recargoAmount + portesAmountVal + totalIva;
      
      await sql`
        INSERT INTO albaranes (id, supplier_id, supplier_name, albaran_number, delivery_date, invoice_number, notes, total_amount, total_net, total_iva, header_discount_pct, header_discount_amount, recargo_equivalencia_pct, recargo_amount, portes_amount, status, received_by, linked_purchase_order_id, created_at, tenant_id)
        VALUES (${id}, ${supplierId}, ${supplierName}, ${albaranNumber}, ${deliveryDate}, ${invoiceNumber || ''}, ${notes || ''}, ${totalAmount}, ${totalNet}, ${totalIva}, ${headerDiscountPctVal}, ${headerDiscountAmount}, ${recargoEquivalenciaPctVal}, ${recargoAmount}, ${portesAmountVal}, 'draft', ${receivedBy || ''}, ${linkedPurchaseOrderId || ''}, ${Date.now()}, ${tenantId})
      `;
      
      for (const line of processedLines) {
        await sql`
          INSERT INTO albaran_lines (albaran_id, product_id, product_name, quantity, pack_size, price_per_pack, price_per_unit, supplier_sku, iva_pct, line_discount_pct, line_discount_amount, subtotal, iva_amount, total_line, batch_number, expiry_date, location, tenant_id)
          VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.packSize}, ${line.pricePerPack}, ${line.pricePerUnit}, ${line.supplierSku || ''}, ${line.ivaPct || 0}, ${line.lineDiscountPct || 0}, ${line.lineDiscountAmount}, ${line.subtotal}, ${line.ivaAmount}, ${line.totalLine}, ${line.batchNumber || ''}, ${line.expiryDate || ''}, ${line.location || 'Almacén'}, ${tenantId})
        `;
      }
      
      return NextResponse.json({ ok: true, id });
    }

    if (action === 'update') {
      const { id, supplierId, supplierName, albaranNumber, deliveryDate, invoiceNumber, notes, lines, receivedBy, headerDiscountPct, recargoEquivalenciaPct, portesAmount } = body;
      
      const existing = (await sql`SELECT status FROM albaranes WHERE id = ${id} AND tenant_id = ${tenantId}`)[0];
      if (existing?.status === 'confirmed') {
        return NextResponse.json({ error: 'No se puede editar un albarán confirmado. Anúlalo primero.' }, { status: 400 });
      }
      
      let totalNet = 0;
      let totalIva = 0;
      const processedLines = [];
      
      for (const line of lines || []) {
        const packSize = parseFloat(line.packSize || 1);
        const pricePerPack = parseFloat(line.pricePerPack || line.pricePerUnit);
        const pricePerUnit = pricePerPack / packSize;
        const quantity = parseFloat(line.quantity || 0);
        const lineDiscountPct = parseFloat(line.lineDiscountPct || 0);
        const ivaPct = parseFloat(line.ivaPct || 0);
        
        const subtotal = quantity * pricePerPack;
        const lineDiscountAmount = subtotal * (lineDiscountPct / 100);
        const afterLineDiscount = subtotal - lineDiscountAmount;
        const ivaAmount = afterLineDiscount * (ivaPct / 100);
        const totalLine = afterLineDiscount + ivaAmount;
        
        totalNet += afterLineDiscount;
        totalIva += ivaAmount;
        
        processedLines.push({
          ...line,
          packSize,
          pricePerPack,
          pricePerUnit,
          lineDiscountAmount,
          subtotal,
          ivaAmount,
          totalLine
        });
      }
      
      const headerDiscountPctVal = parseFloat(headerDiscountPct || 0);
      const headerDiscountAmount = totalNet * (headerDiscountPctVal / 100);
      const afterHeaderDiscount = totalNet - headerDiscountAmount;
      const recargoEquivalenciaPctVal = parseFloat(recargoEquivalenciaPct || 0);
      const recargoAmount = afterHeaderDiscount * (recargoEquivalenciaPctVal / 100);
      const portesAmountVal = parseFloat(portesAmount || 0);
      const totalAmount = afterHeaderDiscount + recargoAmount + portesAmountVal + totalIva;
      
      await sql`
        UPDATE albaranes 
        SET supplier_id = ${supplierId}, supplier_name = ${supplierName}, albaran_number = ${albaranNumber},
            delivery_date = ${deliveryDate}, invoice_number = ${invoiceNumber || ''}, notes = ${notes || ''},
            total_amount = ${totalAmount}, total_net = ${totalNet}, total_iva = ${totalIva},
            header_discount_pct = ${headerDiscountPctVal}, header_discount_amount = ${headerDiscountAmount},
            recargo_equivalencia_pct = ${recargoEquivalenciaPctVal}, recargo_amount = ${recargoAmount},
            portes_amount = ${portesAmountVal}, received_by = ${receivedBy || ''}, updated_at = ${Date.now()}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      
      await sql`DELETE FROM albaran_lines WHERE albaran_id = ${id} AND tenant_id = ${tenantId}`;
      for (const line of processedLines) {
        await sql`
          INSERT INTO albaran_lines (albaran_id, product_id, product_name, quantity, pack_size, price_per_pack, price_per_unit, supplier_sku, iva_pct, line_discount_pct, line_discount_amount, subtotal, iva_amount, total_line, batch_number, expiry_date, location, tenant_id)
          VALUES (${id}, ${line.productId}, ${line.productName}, ${line.quantity}, ${line.packSize}, ${line.pricePerPack}, ${line.pricePerUnit}, ${line.supplierSku || ''}, ${line.ivaPct || 0}, ${line.lineDiscountPct || 0}, ${line.lineDiscountAmount}, ${line.subtotal}, ${line.ivaAmount}, ${line.totalLine}, ${line.batchNumber || ''}, ${line.expiryDate || ''}, ${line.location || 'Almacén'}, ${tenantId})
        `;
      }
      
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete') {
      const { id } = body;
      const existing = (await sql`SELECT status FROM albaranes WHERE id = ${id} AND tenant_id = ${tenantId}`)[0];
      if (existing?.status !== 'draft') {
        return NextResponse.json({ error: 'Solo se pueden eliminar albaranes en borrador. Usa Anular para confirmados.' }, { status: 400 });
      }
      await sql`DELETE FROM albaranes WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'void') {
      const { id, reason, anuladoBy } = body;
      const albaran = (await sql`SELECT * FROM albaranes WHERE id = ${id} AND tenant_id = ${tenantId}`)[0];
      if (!albaran) {
        return NextResponse.json({ error: 'Albarán no encontrado' }, { status: 404 });
      }
      
      if (albaran.status === 'anulado') {
        return NextResponse.json({ error: 'El albarán ya está anulado' }, { status: 400 });
      }
      
      if (albaran.status === 'confirmed') {
        const lines = await sql`SELECT * FROM albaran_lines WHERE albaran_id = ${id} AND tenant_id = ${tenantId}`;
        
        for (const line of lines) {
          const quantity = parseFloat(line.quantity) * parseFloat(line.pack_size || 1);
          const existingStock = await sql`SELECT * FROM product_stock WHERE product_id = ${line.product_id} AND tenant_id = ${tenantId}`;
          
          for (const stock of existingStock) {
            const newStock = Math.max(0, parseFloat(stock.stock) - quantity);
            await sql`
              UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${line.product_id} AND location = ${stock.location} AND tenant_id = ${tenantId}
            `;
            
            await sql`
              INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
              VALUES (${line.product_id}, ${line.product_name}, ${stock.stock}, ${newStock}, ${newStock - stock.stock}, 'devolución', 'Reverse:Albarán: ' || ${albaran.albaran_number}, ${anuladoBy || 'sistema'}, ${Date.now()}, ${tenantId})
            `;
          }
          
          await sql`
            UPDATE product_batches SET status = 'depleted', remaining_quantity = 0
            WHERE albaran_id = ${id} AND product_id = ${line.product_id} AND status = 'active' AND tenant_id = ${tenantId}
          `;
        }
        
        if (albaran.linked_purchase_order_id) {
          const poLines = await sql`SELECT * FROM purchase_order_lines WHERE order_id = ${albaran.linked_purchase_order_id} AND tenant_id = ${tenantId}`;
          for (const poLine of poLines) {
            const albLine = lines.find(l => l.product_id === poLine.product_id);
            if (albLine) {
              const receivedQty = parseFloat(poLine.received_qty || 0) - (parseFloat(albLine.quantity) * parseFloat(albLine.pack_size || 1));
              await sql`
                UPDATE purchase_order_lines SET received_qty = ${Math.max(0, receivedQty)} WHERE id = ${poLine.id} AND tenant_id = ${tenantId}
              `;
            }
          }
          
          const allPoLines = await sql`SELECT * FROM purchase_order_lines WHERE order_id = ${albaran.linked_purchase_order_id} AND tenant_id = ${tenantId}`;
          const allReceived = allPoLines.every(l => parseFloat(l.received_qty) >= parseFloat(l.quantity));
          const anyReceived = allPoLines.some(l => parseFloat(l.received_qty) > 0);
          const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'sent';
          await sql`UPDATE purchase_orders SET status = ${newStatus} WHERE id = ${albaran.linked_purchase_order_id} AND tenant_id = ${tenantId}`;
        }
      }
      
      await sql`
        UPDATE albaranes SET status = 'anulado', anulado_by = ${anuladoBy || ''}, anulado_at = ${Date.now()}, anulado_reason = ${reason || ''}, updated_at = ${Date.now()}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      
      return NextResponse.json({ ok: true });
    }

    if (action === 'confirm') {
      const { id, batches } = body;
      
      const albaran = (await sql`SELECT * FROM albaranes WHERE id = ${id} AND tenant_id = ${tenantId}`)[0];
      if (!albaran) {
        return NextResponse.json({ error: 'Albarán no encontrado' }, { status: 404 });
      }
      
      if (albaran.status !== 'draft') {
        return NextResponse.json({ error: 'Solo se pueden confirmar albaranes en borrador' }, { status: 400 });
      }
      
      const lines = await sql`SELECT * FROM albaran_lines WHERE albaran_id = ${id} AND tenant_id = ${tenantId}`;
      
      for (const line of lines) {
        const batchData = batches?.find((b: any) => b.productId === line.product_id);
        const location = batchData?.location || 'Almacén';
        const expiryDate = batchData?.expiryDate || line.expiry_date || null;
        const batchNumber = batchData?.batchNumber || line.batchNumber || `${albaran.albaran_number}-${line.id}`;
        const quantity = parseFloat(line.quantity) * parseFloat(line.pack_size || 1);
        const netCostPerUnit = parseFloat(line.price_per_unit);
        
        const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        await sql`
          INSERT INTO product_batches (id, product_id, albaran_id, batch_number, quantity, remaining_quantity, location, cost_per_unit, expiry_date, received_at, status, active, tenant_id)
          VALUES (${batchId}, ${line.product_id}, ${id}, ${batchNumber}, ${quantity}, ${quantity}, ${location}, ${netCostPerUnit}, ${expiryDate}, ${Date.now()}, 'active', true, ${tenantId})
        `;
        
        const existingStock = await sql`SELECT * FROM product_stock WHERE product_id = ${line.product_id} AND location = ${location} AND tenant_id = ${tenantId}`;
        if (existingStock.length > 0) {
          const newStock = parseFloat(existingStock[0].stock) + quantity;
          await sql`UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${line.product_id} AND location = ${location} AND tenant_id = ${tenantId}`;
        } else {
          await sql`INSERT INTO product_stock (product_id, location, stock, low_stock, tenant_id) VALUES (${line.product_id}, ${location}, ${quantity}, 5, ${tenantId})`;
        }
        
        await sql`
          INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
          VALUES (${line.product_id}, ${line.product_name}, ${parseFloat(existingStock[0]?.stock || 0)}, ${parseFloat(existingStock[0]?.stock || 0) + quantity}, ${quantity}, 'compra', 'Albarán: ' || ${albaran.albaran_number}, ${albaran.received_by || 'sistema'}, ${Date.now()}, ${tenantId})
        `;
        
        const catalog = await sql`SELECT sc.id FROM supplier_catalog sc WHERE sc.supplier_id = ${albaran.supplier_id} AND sc.product_id = ${line.product_id} AND sc.tenant_id = ${tenantId} LIMIT 1`;
        if (catalog.length > 0) {
          await sql`
            INSERT INTO supplier_price_history (catalog_id, supplier_id, product_id, pack_price, pack_size, price_per_unit, source, created_at, tenant_id)
            VALUES (${catalog[0].id}, ${albaran.supplier_id}, ${line.product_id}, ${line.price_per_pack}, ${line.pack_size}, ${netCostPerUnit}, 'albaran', ${Date.now()}, ${tenantId})
          `;
        }
      }
      
      if (albaran.linked_purchase_order_id) {
        const poLines = await sql`SELECT * FROM purchase_order_lines WHERE order_id = ${albaran.linked_purchase_order_id} AND tenant_id = ${tenantId}`;
        for (const poLine of poLines) {
          const albLine = lines.find(l => l.product_id === poLine.product_id);
          if (albLine) {
            const receivedQty = parseFloat(poLine.received_qty || 0) + (parseFloat(albLine.quantity) * parseFloat(albLine.pack_size || 1));
            await sql`UPDATE purchase_order_lines SET received_qty = ${receivedQty} WHERE id = ${poLine.id} AND tenant_id = ${tenantId}`;
          }
        }
        
        const allPoLines = await sql`SELECT * FROM purchase_order_lines WHERE order_id = ${albaran.linked_purchase_order_id} AND tenant_id = ${tenantId}`;
        const allReceived = allPoLines.every(l => parseFloat(l.received_qty) >= parseFloat(l.quantity));
        const anyReceived = allPoLines.some(l => parseFloat(l.received_qty) > 0);
        const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'sent';
        await sql`UPDATE purchase_orders SET status = ${newStatus} WHERE id = ${albaran.linked_purchase_order_id} AND tenant_id = ${tenantId}`;
      }
      
      await sql`UPDATE albaranes SET status = 'confirmed', updated_at = ${Date.now()} WHERE id = ${id} AND tenant_id = ${tenantId}`;
      
      return NextResponse.json({ ok: true, message: 'Albarán confirmado correctamente' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
