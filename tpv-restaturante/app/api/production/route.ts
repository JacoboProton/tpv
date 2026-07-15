import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { productionIngredients, recipeIngredients, productBatches, productStock, stockLog, productions, recipes, products } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    let query = sql`SELECT * FROM productions WHERE tenant_id = ${tenantId}`;
    const conds = [];
    if (productId) conds.push(sql`product_id = ${productId}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a: any, c: any) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY produced_at DESC, created_at DESC LIMIT 100`;

    const rows = await db.execute(query).then(r => r.rows as any[]);

    const result = [];
    for (const r of rows) {
      const ingRows = await db.execute(sql`
        SELECT * FROM production_ingredients WHERE production_id = ${r.id} AND tenant_id = ${tenantId} ORDER BY id
      `).then(r => r.rows as any[]);
      const [recipe] = await db.execute(sql`
        SELECT * FROM recipes WHERE product_id = ${r.product_id} AND tenant_id = ${tenantId} LIMIT 1
      `).then(r => r.rows as any[]);
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
        ingredients: ingRows.map(ing => ({
          id: ing.id,
          ingredientId: ing.ingredient_id,
          ingredientName: ing.ingredient_name,
          quantity: parseFloat(ing.quantity),
          costPerUnit: parseFloat(ing.cost_per_unit),
          totalCost: parseFloat(ing.total_cost),
        })),
        recipeYield: recipe ? parseFloat(recipe.yield_qty || 1) : 1,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
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
      const { productId, productName, quantity, costPerUnit, location, batchNumber, expiryDate, notes, producedAt } = body;

      if (!productId || !quantity || quantity <= 0) {
        return NextResponse.json({ error: 'Producto y cantidad son requeridos' }, { status: 400 });
      }

      const [recipe] = await db.select().from(recipes)
        .where(sql`${eq(recipes.productId, productId)} AND ${eq(recipes.tenantId, tenantId)}`)
        .limit(1);
      if (!recipe) {
        return NextResponse.json({ error: 'El producto no tiene una receta asignada' }, { status: 400 });
      }

      const qty = parseFloat(quantity);
      const yieldQty = parseFloat(recipe.yieldQty as any || 1);
      const scaleFactor = qty / yieldQty;
      const prodLocation = location || 'Cocina';

      const recipeIngs = await db.select().from(recipeIngredients)
        .where(sql`${eq(recipeIngredients.recipeId, recipe.id)} AND ${eq(recipeIngredients.tenantId, tenantId)}`)
        .orderBy(recipeIngredients.id);

      const consumed: any[] = [];
      let suggestedCost = 0;
      const errors: string[] = [];

      for (const ing of recipeIngs) {
        const scaledQty = parseFloat(ing.quantity as any) * scaleFactor;

        const [latestBatch] = await db.execute(sql`
          SELECT cost_per_unit FROM product_batches
          WHERE product_id = ${ing.ingredientId} AND status = 'active' AND tenant_id = ${tenantId}
          ORDER BY received_at DESC LIMIT 1
        `).then(r => r.rows as any[]);
        const currentCostPerUnit = latestBatch
          ? parseFloat(latestBatch.cost_per_unit)
          : parseFloat(ing.costPerUnit as any || 0);

        const ingTotal = scaledQty * currentCostPerUnit;
        suggestedCost += ingTotal;

        const stockRows = await db.execute(sql`
          SELECT * FROM product_stock WHERE product_id = ${ing.ingredientId} AND tenant_id = ${tenantId} ORDER BY location
        `).then(r => r.rows as any[]);
        let remaining = scaledQty;
        for (const sr of stockRows) {
          if (remaining <= 0) break;
          const available = parseFloat(sr.stock);
          const deduct = Math.min(available, remaining);
          if (deduct <= 0) continue;
          const newStock = available - deduct;
          await db.execute(sql`
            UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${ing.ingredientId} AND location = ${sr.location} AND tenant_id = ${tenantId}
          `);
          await db.execute(sql`
            INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
            VALUES (${ing.ingredientId}, ${ing.ingredientName}, ${available}, ${newStock}, ${-deduct}, 'producción', ${'Prod:' + productName}, ${body.createdBy || 'sistema'}, ${Date.now()}, ${tenantId})
          `);
          remaining -= deduct;
        }

        if (remaining > 0.001) {
          errors.push(`Stock insuficiente de ${ing.ingredientName} (faltan ${remaining.toFixed(3)} ${ing.unit})`);
        }

        consumed.push({
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredientName,
          quantity: scaledQty,
          costPerUnit: currentCostPerUnit,
          totalCost: ingTotal,
        });
      }

      if (errors.length > 0) {
        return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
      }

      const finalCostPerUnit = parseFloat(costPerUnit) || (suggestedCost / qty);
      const totalCost = finalCostPerUnit * qty;
      const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

      await db.execute(sql`
        INSERT INTO productions (id, product_id, product_name, quantity, cost_per_unit, total_cost, location, batch_number, expiry_date, notes, status, produced_at, created_at, tenant_id)
        VALUES (${id}, ${productId}, ${productName}, ${qty}, ${finalCostPerUnit}, ${totalCost}, ${prodLocation}, ${batchNumber || ''}, ${expiryDate || ''}, ${notes || ''}, 'active', ${producedAt || Date.now()}, ${Date.now()}, ${tenantId})
      `);

      for (const c of consumed) {
        await db.execute(sql`
          INSERT INTO production_ingredients (production_id, ingredient_id, ingredient_name, quantity, cost_per_unit, total_cost, tenant_id)
          VALUES (${id}, ${c.ingredientId}, ${c.ingredientName}, ${c.quantity}, ${c.costPerUnit}, ${c.totalCost}, ${tenantId})
        `);
      }

      const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await db.execute(sql`
        INSERT INTO product_batches (id, product_id, batch_number, quantity, remaining_quantity, location, cost_per_unit, expiry_date, received_at, status, active, tenant_id)
        VALUES (${batchId}, ${productId}, ${batchNumber || id}, ${qty}, ${qty}, ${prodLocation}, ${finalCostPerUnit}, ${expiryDate || null}, ${Date.now()}, 'active', true, ${tenantId})
      `);

      const [existingStock] = await db.execute(sql`
        SELECT * FROM product_stock WHERE product_id = ${productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}
      `).then(r => r.rows as any[]);
      if (existingStock) {
        const newStock = parseFloat(existingStock.stock) + qty;
        await db.execute(sql`UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}`);
      } else {
        await db.execute(sql`INSERT INTO product_stock (product_id, location, stock, low_stock, tenant_id) VALUES (${productId}, ${prodLocation}, ${qty}, 5, ${tenantId})`);
      }

      await db.execute(sql`
        INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
        VALUES (${productId}, ${productName}, ${parseFloat(existingStock?.stock || 0)}, ${parseFloat(existingStock?.stock || 0) + qty}, ${qty}, 'producción', ${'Prod:' + productName}, ${body.createdBy || 'sistema'}, ${Date.now()}, ${tenantId})
      `);

      return NextResponse.json({ ok: true, id, suggestedCost: suggestedCost / qty });
    }

    if (action === 'void') {
      const { id, reason, anuladoBy } = body;
      const [prod] = await db.select().from(productions)
        .where(sql`${eq(productions.id, id)} AND ${eq(productions.tenantId, tenantId)}`)
        .limit(1);
      if (!prod) {
        return NextResponse.json({ error: 'Producción no encontrada' }, { status: 404 });
      }
      if (prod.status === 'anulado') {
        return NextResponse.json({ error: 'La producción ya está anulada' }, { status: 400 });
      }

      const qty = parseFloat(prod.quantity as any);
      const prodLocation = prod.location || 'Cocina';

      const ingredients = await db.select().from(productionIngredients)
        .where(sql`${eq(productionIngredients.productionId, id)} AND ${eq(productionIngredients.tenantId, tenantId)}`)
        .orderBy(productionIngredients.id);

      for (const ing of ingredients) {
        const ingQty = parseFloat(ing.quantity as any);
        const [existingStock] = await db.execute(sql`
          SELECT * FROM product_stock WHERE product_id = ${ing.ingredientId} AND location = 'Almacén' AND tenant_id = ${tenantId}
        `).then(r => r.rows as any[]);
        if (existingStock) {
          const newStock = parseFloat(existingStock.stock) + ingQty;
          await db.execute(sql`
            UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${ing.ingredientId} AND location = 'Almacén' AND tenant_id = ${tenantId}
          `);
        } else {
          await db.execute(sql`INSERT INTO product_stock (product_id, location, stock, low_stock, tenant_id) VALUES (${ing.ingredientId}, 'Almacén', ${ingQty}, 5, ${tenantId})`);
        }

        await db.execute(sql`
          INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
          VALUES (${ing.ingredientId}, ${ing.ingredientName}, ${parseFloat(existingStock?.stock || 0)}, ${parseFloat(existingStock?.stock || 0) + ingQty}, ${ingQty}, 'producción_anulada', ${'Reverse:Prod:' + prod.productName}, ${anuladoBy || 'sistema'}, ${Date.now()}, ${tenantId})
        `);
      }

      const [prodStock] = await db.execute(sql`
        SELECT * FROM product_stock WHERE product_id = ${prod.productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}
      `).then(r => r.rows as any[]);
      if (prodStock) {
        const remaining = Math.max(0, parseFloat(prodStock.stock) - qty);
        await db.execute(sql`
          UPDATE product_stock SET stock = ${remaining} WHERE product_id = ${prod.productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}
        `);
      }

      await db.execute(sql`
        INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
        VALUES (${prod.productId}, ${prod.productName}, ${parseFloat(prodStock?.stock || 0)}, ${Math.max(0, parseFloat(prodStock?.stock || 0) - qty)}, ${-qty}, 'producción_anulada', ${'Reverse:Prod:' + prod.productName}, ${anuladoBy || 'sistema'}, ${Date.now()}, ${tenantId})
      `);

      await db.execute(sql`
        UPDATE product_batches SET status = 'depleted', remaining_quantity = 0
        WHERE product_id = ${prod.productId} AND batch_number = ${prod.batchNumber || id} AND status = 'active' AND tenant_id = ${tenantId}
      `);

      await db.execute(sql`
        UPDATE productions SET status = 'anulado', anulado_reason = ${reason || ''}, anulado_by = ${anuladoBy || ''}, anulado_at = ${Date.now()}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
