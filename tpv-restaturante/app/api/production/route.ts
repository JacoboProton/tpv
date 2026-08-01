import { NextRequest } from 'next/server';
import { eq, sql, SQL } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { productionIngredients, recipeIngredients, productBatches, productStock, stockLog, productions, recipes, products } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { ProductionBody } from '@/lib/schemas/api-schemas';

type Row = Record<string, unknown>;

async function qr(query: SQL): Promise<Row[]> {
  const db = getDb();
  return db.execute(query).then((r: { rows: Row[] }) => r.rows);
}

function n(v: unknown, fallback = 0): number {
  return Number(v) || fallback;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    let query = sql`SELECT * FROM productions WHERE tenant_id = ${tenantId}`;
    const conds: SQL[] = [];
    if (productId) conds.push(sql`product_id = ${productId}`);
    if (status) conds.push(sql`status = ${status}`);
    if (conds.length > 0) query = sql`${query} AND ${conds.reduce((a, c) => sql`${a} AND ${c}`)}`;
    query = sql`${query} ORDER BY produced_at DESC, created_at DESC LIMIT 100`;

    const rows = await qr(query);

    const result: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      const ingRows = await qr(sql`
        SELECT * FROM production_ingredients WHERE production_id = ${r.id} AND tenant_id = ${tenantId} ORDER BY id
      `);
      const [recipe] = await qr(sql`
        SELECT * FROM recipes WHERE product_id = ${r.product_id} AND tenant_id = ${tenantId} LIMIT 1
      `);
      result.push({
        id: r.id,
        productId: r.product_id,
        productName: r.product_name,
        quantity: n(r.quantity),
        costPerUnit: n(r.cost_per_unit),
        totalCost: n(r.total_cost),
        location: r.location,
        batchNumber: r.batch_number,
        expiryDate: r.expiry_date,
        notes: r.notes,
        status: r.status,
        producedAt: n(r.produced_at),
        createdAt: n(r.created_at),
        anuladoAt: r.anulado_at ? n(r.anulado_at) : null,
        anuladoReason: r.anulado_reason,
        anuladoBy: r.anulado_by,
        ingredients: ingRows.map((ing) => ({
          id: ing.id,
          ingredientId: ing.ingredient_id,
          ingredientName: ing.ingredient_name,
          quantity: n(ing.quantity),
          costPerUnit: n(ing.cost_per_unit),
          totalCost: n(ing.total_cost),
        })),
        recipeYield: recipe ? n(recipe.yield_qty, 1) : 1,
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
    const parsed = ProductionBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action } = body;

    if (action === 'create') {
      const { productId, productName, quantity, costPerUnit, location, batchNumber, expiryDate, notes, producedAt } = body;

      if (!productId || !quantity || quantity <= 0) {
        return apiBadRequest('Producto y cantidad son requeridos');
      }

      const [recipe] = await db.select().from(recipes)
        .where(sql`${eq(recipes.productId, productId)} AND ${eq(recipes.tenantId, tenantId)}`)
        .limit(1);
      if (!recipe) {
        return apiBadRequest('El producto no tiene una receta asignada');
      }

      const qty = quantity || 0;
      const yieldQty = n(recipe.yieldQty, 1);
      const scaleFactor = qty / yieldQty;
      const prodLocation = location || 'Cocina';

      const recipeIngs = await db.select().from(recipeIngredients)
        .where(sql`${eq(recipeIngredients.recipeId, recipe.id)} AND ${eq(recipeIngredients.tenantId, tenantId)}`)
        .orderBy(recipeIngredients.id);

      const consumed: Array<Record<string, unknown>> = [];
      let suggestedCost = 0;
      const errors: string[] = [];

      for (const ing of recipeIngs) {
        const scaledQty = n(ing.quantity) * scaleFactor;

        const [latestBatch] = await qr(sql`
          SELECT cost_per_unit FROM product_batches
          WHERE product_id = ${ing.ingredientId} AND status = 'active' AND tenant_id = ${tenantId}
          ORDER BY received_at DESC LIMIT 1
        `);
        const currentCostPerUnit = latestBatch
          ? n(latestBatch.cost_per_unit)
          : n(ing.costPerUnit);

        const ingTotal = scaledQty * currentCostPerUnit;
        suggestedCost += ingTotal;

        const stockRows = await qr(sql`
          SELECT * FROM product_stock WHERE product_id = ${ing.ingredientId} AND tenant_id = ${tenantId} ORDER BY location
        `);
        let remaining = scaledQty;
        for (const sr of stockRows) {
          if (remaining <= 0) break;
          const available = n(sr.stock);
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
        return apiBadRequest(errors.join('; '));
      }

      const finalCostPerUnit = costPerUnit || (suggestedCost / qty);
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

      const [existingStock] = await qr(sql`
        SELECT * FROM product_stock WHERE product_id = ${productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}
      `);
      if (existingStock) {
        const newStock = n(existingStock.stock) + qty;
        await db.execute(sql`UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}`);
      } else {
        await db.execute(sql`INSERT INTO product_stock (product_id, location, stock, low_stock, tenant_id) VALUES (${productId}, ${prodLocation}, ${qty}, 5, ${tenantId})`);
      }

      const oldStockVal = existingStock ? n(existingStock.stock) : 0;
      await db.execute(sql`
        INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
        VALUES (${productId}, ${productName}, ${oldStockVal}, ${oldStockVal + qty}, ${qty}, 'producción', ${'Prod:' + productName}, ${body.createdBy || 'sistema'}, ${Date.now()}, ${tenantId})
      `);

      return apiOk({ id, suggestedCost: suggestedCost / qty });
    }

    if (action === 'void') {
      const { id, reason, anuladoBy } = body;
      if (typeof id !== 'string') return apiBadRequest('id required');
      const [prod] = await db.select().from(productions)
        .where(sql`${eq(productions.id, id)} AND ${eq(productions.tenantId, tenantId)}`)
        .limit(1);
      if (!prod) {
        return apiNotFound('Producción no encontrada');
      }
      if (prod.status === 'anulado') {
        return apiBadRequest('La producción ya está anulada');
      }

      const qty = n(prod.quantity);
      const prodLocation = prod.location || 'Cocina';

      const ingredients = await db.select().from(productionIngredients)
        .where(sql`${eq(productionIngredients.productionId, id)} AND ${eq(productionIngredients.tenantId, tenantId)}`)
        .orderBy(productionIngredients.id);

      for (const ing of ingredients) {
        const ingQty = n(ing.quantity);
        const [existingStock] = await qr(sql`
          SELECT * FROM product_stock WHERE product_id = ${ing.ingredientId} AND location = 'Almacén' AND tenant_id = ${tenantId}
        `);
        if (existingStock) {
          const newStock = n(existingStock.stock) + ingQty;
          await db.execute(sql`
            UPDATE product_stock SET stock = ${newStock} WHERE product_id = ${ing.ingredientId} AND location = 'Almacén' AND tenant_id = ${tenantId}
          `);
        } else {
          await db.execute(sql`INSERT INTO product_stock (product_id, location, stock, low_stock, tenant_id) VALUES (${ing.ingredientId}, 'Almacén', ${ingQty}, 5, ${tenantId})`);
        }

        const oldIngStock = existingStock ? n(existingStock.stock) : 0;
        await db.execute(sql`
          INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
          VALUES (${ing.ingredientId}, ${ing.ingredientName}, ${oldIngStock}, ${oldIngStock + ingQty}, ${ingQty}, 'producción_anulada', ${'Reverse:Prod:' + prod.productName}, ${anuladoBy || 'sistema'}, ${Date.now()}, ${tenantId})
        `);
      }

      const [prodStock] = await qr(sql`
        SELECT * FROM product_stock WHERE product_id = ${prod.productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}
      `);
      if (prodStock) {
        const remaining = Math.max(0, n(prodStock.stock) - qty);
        await db.execute(sql`
          UPDATE product_stock SET stock = ${remaining} WHERE product_id = ${prod.productId} AND location = ${prodLocation} AND tenant_id = ${tenantId}
        `);
      }

      const oldProdStock = prodStock ? n(prodStock.stock) : 0;
      await db.execute(sql`
        INSERT INTO stock_log (product_id, product_name, old_stock, new_stock, change_amount, reason, reference, employee_name, created_at, tenant_id)
        VALUES (${prod.productId}, ${prod.productName}, ${oldProdStock}, ${Math.max(0, oldProdStock - qty)}, ${-qty}, 'producción_anulada', ${'Reverse:Prod:' + prod.productName}, ${anuladoBy || 'sistema'}, ${Date.now()}, ${tenantId})
      `);

      await db.execute(sql`
        UPDATE product_batches SET status = 'depleted', remaining_quantity = 0
        WHERE product_id = ${prod.productId} AND batch_number = ${prod.batchNumber || id} AND status = 'active' AND tenant_id = ${tenantId}
      `);

      await db.execute(sql`
        UPDATE productions SET status = 'anulado', anulado_reason = ${reason || ''}, anulado_by = ${anuladoBy || ''}, anulado_at = ${Date.now()}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `);

      return apiOk();
    }

    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}
