import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { recipes, recipeIngredients } from '../../../db/schema';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const recipeRows = await db.select().from(recipes)
      .where(eq(recipes.tenantId, tenantId))
      .orderBy(recipes.productName);
    const result = [];
    for (const r of recipeRows) {
      const ingredients = await db.select().from(recipeIngredients)
        .where(sql`${eq(recipeIngredients.recipeId, r.id)} AND ${eq(recipeIngredients.tenantId, tenantId)}`)
        .orderBy(recipeIngredients.id);
      result.push({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        costPerUnit: parseFloat(r.costPerUnit as any || 0),
        yieldQty: parseFloat(r.yieldQty as any || 1),
        updatedAt: Number(r.updatedAt),
        ingredients: ingredients.map(ing => ({
          id: ing.id,
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredientName,
          quantity: parseFloat(ing.quantity as any),
          unit: ing.unit,
          costPerUnit: parseFloat(ing.costPerUnit as any || 0),
          totalCost: parseFloat(ing.totalCost as any || 0),
        })),
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

    if (action === 'save') {
      const { productId, productName, yieldQty, ingredients } = body;

      if (!productId || !ingredients || ingredients.length === 0) {
        return NextResponse.json({ error: 'Producto e ingredientes son requeridos' }, { status: 400 });
      }

      let [recipe] = await db.select().from(recipes)
        .where(sql`${eq(recipes.productId, productId)} AND ${eq(recipes.tenantId, tenantId)}`)
        .limit(1);
      const recipeId = recipe?.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const yieldQtyVal = parseFloat(yieldQty || 1);

      const processedIngredients: any[] = [];
      for (const ing of ingredients) {
        const iQty = parseFloat(ing.quantity || 0);
        const iCostPerUnit = parseFloat(ing.costPerUnit || 0);
        const iTotal = iQty * iCostPerUnit;

        const [latestBatch] = await db.execute(sql`
          SELECT cost_per_unit FROM product_batches
          WHERE product_id = ${ing.ingredientId} AND status = 'active' AND tenant_id = ${tenantId}
          ORDER BY received_at DESC LIMIT 1
        `).then(r => r.rows as any[]);
        const currentCost = latestBatch ? parseFloat(latestBatch.cost_per_unit) : iCostPerUnit;

        processedIngredients.push({
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredientName,
          quantity: iQty,
          unit: ing.unit || 'kg',
          costPerUnit: currentCost,
          totalCost: iQty * currentCost,
        });
      }

      const totalRecipeCost = processedIngredients.reduce((s: number, i: any) => s + i.totalCost, 0);
      const costPerUnit = totalRecipeCost / yieldQtyVal;

      if (recipe) {
        await db.execute(sql`
          UPDATE recipes SET product_name = ${productName}, cost_per_unit = ${costPerUnit}, yield_qty = ${yieldQtyVal}, updated_at = ${Date.now()}
          WHERE id = ${recipe.id} AND tenant_id = ${tenantId}
        `);
        await db.execute(sql`DELETE FROM recipe_ingredients WHERE recipe_id = ${recipe.id} AND tenant_id = ${tenantId}`);
      } else {
        await db.execute(sql`
          INSERT INTO recipes (id, product_id, product_name, cost_per_unit, yield_qty, updated_at, tenant_id)
          VALUES (${recipeId}, ${productId}, ${productName}, ${costPerUnit}, ${yieldQtyVal}, ${Date.now()}, ${tenantId})
        `);
      }

      for (const ing of processedIngredients) {
        await db.execute(sql`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, quantity, unit, cost_per_unit, total_cost, tenant_id)
          VALUES (${recipe?.id || recipeId}, ${ing.ingredientId}, ${ing.ingredientName}, ${ing.quantity}, ${ing.unit}, ${ing.costPerUnit}, ${ing.totalCost}, ${tenantId})
        `);
      }

      return NextResponse.json({ ok: true, id: recipe?.id || recipeId, costPerUnit });
    }

    if (action === 'delete') {
      const { id } = body;
      await db.execute(sql`DELETE FROM recipes WHERE id = ${id} AND tenant_id = ${tenantId}`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
