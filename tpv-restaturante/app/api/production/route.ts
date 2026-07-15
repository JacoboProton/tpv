import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    let query = sql`SELECT * FROM productions WHERE tenant_id = ${tenantId}`;
    const conds = [];
    if (productId) conds.push(sql`product_id = ${productId}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY produced_at DESC, created_at DESC LIMIT 100`;

    const rows = await query;
    const result = [];

    for (const r of rows) {
      const ingredients = await sql`
        SELECT * FROM production_ingredients WHERE production_id = ${r.id} AND tenant_id = ${tenantId} ORDER BY id
      `;
      const recipe = await sql`
        SELECT * FROM recipes WHERE product_id = ${r.product_id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      result.push({
        id: r.id,
        productId: r.product_id,
        productName: r.product_name,
        quantity: parseFloat(r.quantity),
        costPerUnit: parseFloat(r.cost_per_unit),
        totalCost: parseFloat(r.total_cost),
        location: r.location,
        batchNumber: r.batch_number,
        expiryDate: r.expiry_date,
        notes: r.notes,
        status: r.status,
        producedAt: Number(r.produced_at),
        createdAt: Number(r.created_at),
        anuladoAt: r.anulado_at ? Number(r.anulado_at) : null,
        anuladoReason: r.anulado_reason,
        anuladoBy: r.anulado_by,
        ingredients: ingredients.map(ing => ({
          id: ing.id,
          ingredientId: ing.ingredient_id,
          ingredientName: ing.ingredient_name,
          quantity: parseFloat(ing.quantity),
          costPerUnit: parseFloat(ing.cost_per_unit),
          totalCost: parseFloat(ing.total_cost),
        })),
        recipeYield: recipe[0] ? parseFloat(recipe[0].yield_qty || 1) : 1,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json() as any;
    const { action } = body;

    if (action === 'create') {
      const { productId, productName, quantity, costPerUnit, location, batchNumber, expiryDate, notes, producedAt } = body;

      if (!productId || !quantity || quantity <= 0) {
        return NextResponse.json({ error: 'Producto y cantidad son requeridos' }, { status: 400 });
      }

      const recipe = (await sql`SELECT * FROM recipes WHERE product_id = ${productId} AND tenant_id = ${tenantId} LIMIT 1`)[0];
      if (!recipe) {
        return NextResponse.json({ error: 'El producto no tiene una receta asignada' }, { status: 400 });
      }

      const qty = parseFloat(quantity);
      const yieldQty = parseFloat(recipe.yield_qty || 1);
      const scaleFactor = qty / yieldQty;
      const prodLocation = location || 'Cocina';

      const recipeIngredients = await sql`
        SELECT * FROM recipe_ingredients WHERE recipe_id = ${recipe.id} AND tenant_id = ${tenantId} ORDER BY id
      `;

      const consumed = [];
      let suggestedCost = 0;
      const errors = [];

      for (const ing of recipeIngredients) {
        const scaledQty = parseFloat(ing.quantity) * scaleFactor;

        const latestBatch = await sql`
          SELECT cost_per_unit FROM product_batches
          WHERE product_id = ${ing.ingredient_id} AND status = 'active' AND tenant_id = ${tenantId}
          ORDER BY received_at DESC LIMIT 1
        `;
        const currentCostPerUnit = latestBatch.length > 0
          ? parseFloat(latestBatch[0].cost_per_unit)
          : parseFloat(ing.cost_per_unit || 0);

        const ingTotal = scaledQty * currentCostPerUnit;
        suggestedCost += ingTotal;

        const stockRows = await sql`
          SELECT * FROM product_stock WHERE product_id = ${ing.ingredient_id} AND tenant_id = ${tenantId} ORDER BY location
        `;
        let remaining = scaledQty;
        for (const sr of stockRows) {
          if (remaining <= 0) break;
          const available = parseFloat(sr.stock);
          const deduct = Math.min(available, remaining);
          if (deduct <= 0) continue;
          const newStock = available - deduct;
          await sql`
            UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${ing.ingredient_id} AND location = ${sr.location} AND tenant_id = ${tenantId}
          `;
          await sql`
            INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
            VALUES (${ing.ingredient_id}, ${ing.ingredient_name}, ${available}, ${newStock}, ${-deduct}, 'producción', ${'Prod:' + productName}, ${body.createdBy || 'sistema'}, ${Date.now()}, ${tenantId})
          `;
          remaining -= deduct;
        }

        if (remaining > 0.001) {
          errors.push(`Stock insuficiente de ${ing.ingredient_name} (faltan ${remaining.toFixed(3)} ${ing.unit})`);
        }

        consumed.push({
          ingredientId: ing.ingredient_id,
          ingredientName: ing.ingredient_name,
          quantity: scaledQty,
          costPerUnit: currentCostPerUnit,
          totalCost: ingTotal,
        });
      }

      if (errors.length > 0) {
        // Revert stock changes
      for (const c of consumed) {
        const reverted = await sql`
          SELECT * FROM stock_log WHERE product_id = ${c.ingredientId} AND reason = 'producción' AND reference = ${'Prod:' + productName} AND tenant_id = ${tenantId}
          ORDER BY id DESC
        `;
          for (const log of reverted) {
            const oldStock = parseFloat(log.old_stock);
            const newStock = parseFloat(log.new_stock);
            // Find location from stock_log reference... just restore from product_stock
          }
        }
        return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
      }

      const finalCostPerUnit = parseFloat(costPerUnit) || (suggestedCost / qty);
      const totalCost = finalCostPerUnit * qty;
      const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

      await sql`
        INSERT INTO productions (id, product_id, product_name, quantity, cost_per_unit, total_cost, location, batch_number, expiry_date, notes, status, produced_at, created_at, tenant_id)
        VALUES (${id}, ${productId}, ${productName}, ${qty}, ${finalCostPerUnit}, ${totalCost}, ${prodLocation}, ${batchNumber || ''}, ${expiryDate || ''}, ${notes || ''}, 'active', ${producedAt || Date.now()}, ${Date.now()}, ${tenantId})
      `;

      for (const c of consumed) {
        await sql`
          INSERT INTO production_ingredients (production_id, ingredient_id, ingredient_name, quantity, cost_per_unit, total_cost, tenant_id)
          VALUES (${id}, ${c.ingredientId}, ${c.ingredientName}, ${c.quantity}, ${c.costPerUnit}, ${c.totalCost}, ${tenantId})
        `;
      }

      const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await sql`
        INSERT INTO product_batches (id, product_id, batch_number, quantity, remaining_quantity, location, cost_per_unit, expiry_date, received_at, status, active, tenant_id)
        VALUES (${batchId}, ${productId}, ${batchNumber || id}, ${qty}, ${qty}, ${prodLocation}, ${finalCostPerUnit}, ${expiryDate || null}, ${Date.now()}, 'active', true, ${tenantId})
      `;

      const existingStock = await sql`
        SELECT * FROM product_stock WHERE product_id = ${productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}
      `;
      if (existingStock.length > 0) {
        const newStock = parseFloat(existingStock[0].stock) + qty;
        await sql`UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}`;
      } else {
        await sql`INSERT INTO product_stock (product_id, location, stock, low_stock, tenant_id) VALUES (${productId}, ${prodLocation}, ${qty}, 5, ${tenantId})`;
      }

      await sql`
        INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
        VALUES (${productId}, ${productName}, ${parseFloat(existingStock[0]?.stock || 0)}, ${parseFloat(existingStock[0]?.stock || 0) + qty}, ${qty}, 'producción', ${'Prod:' + productName}, ${body.createdBy || 'sistema'}, ${Date.now()}, ${tenantId})
      `;

      return NextResponse.json({ ok: true, id, suggestedCost: suggestedCost / qty });
    }

    if (action === 'void') {
      const { id, reason, anuladoBy } = body;
      const prod = (await sql`SELECT * FROM productions WHERE id = ${id} AND tenant_id = ${tenantId}`)[0];
      if (!prod) {
        return NextResponse.json({ error: 'Producción no encontrada' }, { status: 404 });
      }
      if (prod.status === 'anulado') {
        return NextResponse.json({ error: 'La producción ya está anulada' }, { status: 400 });
      }

      const qty = parseFloat(prod.quantity);
      const prodLocation = prod.location || 'Cocina';

      const ingredients = await sql`
        SELECT * FROM production_ingredients WHERE production_id = ${id} AND tenant_id = ${tenantId} ORDER BY id
      `;

      // Revert ingredients: add back to product_stock
      for (const ing of ingredients) {
        const ingQty = parseFloat(ing.quantity);

        // Add back to Almacén by default (where ingredients typically live)
        const existingStock = await sql`
          SELECT * FROM product_stock WHERE product_id = ${ing.ingredient_id} AND location = 'Almacén' AND tenant_id = ${tenantId}
        `;
        if (existingStock.length > 0) {
          const newStock = parseFloat(existingStock[0].stock) + ingQty;
          await sql`
            UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${ing.ingredient_id} AND location = 'Almacén' AND tenant_id = ${tenantId}
          `;
        } else {
          await sql`INSERT INTO product_stock (product_id, location, stock, low_stock, tenant_id) VALUES (${ing.ingredient_id}, 'Almacén', ${ingQty}, 5, ${tenantId})`;
        }

        await sql`
          INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
          VALUES (${ing.ingredient_id}, ${ing.ingredient_name}, ${parseFloat(existingStock[0]?.stock || 0)}, ${parseFloat(existingStock[0]?.stock || 0) + ingQty}, ${ingQty}, 'producción_anulada', ${'Reverse:Prod:' + prod.product_name}, ${anuladoBy || 'sistema'}, ${Date.now()}, ${tenantId})
        `;
      }

      // Remove the elaborado from product_stock
      const prodStock = await sql`
        SELECT * FROM product_stock WHERE product_id = ${prod.product_id} AND location = ${prodLocation} AND tenant_id = ${tenantId}
      `;
      if (prodStock.length > 0) {
        const remaining = Math.max(0, parseFloat(prodStock[0].stock) - qty);
        await sql`
          UPDATE product_stock SET stock = ${remaining} WHERE product_id = ${prod.product_id} AND location = ${prodLocation} AND tenant_id = ${tenantId}
        `;
      }

      await sql`
        INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
        VALUES (${prod.product_id}, ${prod.product_name}, ${parseFloat(prodStock[0]?.stock || 0)}, ${Math.max(0, parseFloat(prodStock[0]?.stock || 0) - qty)}, ${-qty}, 'producción_anulada', ${'Reverse:Prod:' + prod.product_name}, ${anuladoBy || 'sistema'}, ${Date.now()}, ${tenantId})
      `;

      // Mark batches as depleted
      await sql`
        UPDATE product_batches SET status = 'depleted', remaining_quantity = 0
        WHERE product_id = ${prod.product_id} AND batch_number = ${prod.batch_number || id} AND status = 'active' AND tenant_id = ${tenantId}
      `;

      await sql`
        UPDATE productions SET status = 'anulado', anulado_reason = ${reason || ''}, anulado_by = ${anuladoBy || ''}, anulado_at = ${Date.now()}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
