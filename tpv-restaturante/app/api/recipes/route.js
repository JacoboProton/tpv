import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const recipes = await sql`SELECT * FROM recipes WHERE tenant_id = ${tenantId} ORDER BY product_name`;
    const result = [];
    for (const r of recipes) {
      const ingredients = await sql`
        SELECT * FROM recipe_ingredients WHERE recipe_id = ${r.id} AND tenant_id = ${tenantId} ORDER BY id
      `;
      result.push({
        id: r.id,
        productId: r.product_id,
        productName: r.product_name,
        costPerUnit: parseFloat(r.cost_per_unit || 0),
        yieldQty: parseFloat(r.yield_qty || 1),
        updatedAt: Number(r.updated_at),
        ingredients: ingredients.map(ing => ({
          id: ing.id,
          ingredientId: ing.ingredient_id,
          ingredientName: ing.ingredient_name,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
          costPerUnit: parseFloat(ing.cost_per_unit || 0),
          totalCost: parseFloat(ing.total_cost || 0),
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

    if (action === 'save') {
      const { productId, productName, yieldQty, ingredients } = body;

      if (!productId || !ingredients || ingredients.length === 0) {
        return NextResponse.json({ error: 'Producto e ingredientes son requeridos' }, { status: 400 });
      }

      let recipe = (await sql`SELECT * FROM recipes WHERE product_id = ${productId} AND tenant_id = ${tenantId} LIMIT 1`)[0];
      const recipeId = recipe?.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const yieldQtyVal = parseFloat(yieldQty || 1);

      // Calculate cost per unit from ingredient costs
      let totalCost = 0;
      const processedIngredients = [];
      for (const ing of ingredients) {
        const iQty = parseFloat(ing.quantity || 0);
        const iCostPerUnit = parseFloat(ing.costPerUnit || 0);
        const iTotal = iQty * iCostPerUnit;
        totalCost += iTotal;

        const latestBatch = await sql`
          SELECT cost_per_unit FROM product_batches
          WHERE product_id = ${ing.ingredientId} AND status = 'active' AND tenant_id = ${tenantId}
          ORDER BY received_at DESC LIMIT 1
        `;
        const currentCost = latestBatch.length > 0 ? parseFloat(latestBatch[0].cost_per_unit) : iCostPerUnit;

        processedIngredients.push({
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredientName,
          quantity: iQty,
          unit: ing.unit || 'kg',
          costPerUnit: currentCost,
          totalCost: iQty * currentCost,
        });
      }

      const totalRecipeCost = processedIngredients.reduce((s, i) => s + i.totalCost, 0);
      const costPerUnit = totalRecipeCost / yieldQtyVal;

      if (recipe) {
        await sql`
          UPDATE recipes SET product_name = ${productName}, cost_per_unit = ${costPerUnit}, yield_qty = ${yieldQtyVal}, updated_at = ${Date.now()}
          WHERE id = ${recipe.id} AND tenant_id = ${tenantId}
        `;
        await sql`DELETE FROM recipe_ingredients WHERE recipe_id = ${recipe.id} AND tenant_id = ${tenantId}`;
      } else {
        await sql`
          INSERT INTO recipes (id, product_id, product_name, cost_per_unit, yield_qty, updated_at, tenant_id)
          VALUES (${recipeId}, ${productId}, ${productName}, ${costPerUnit}, ${yieldQtyVal}, ${Date.now()}, ${tenantId})
        `;
      }

      for (const ing of processedIngredients) {
        await sql`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, quantity, unit, cost_per_unit, total_cost, tenant_id)
          VALUES (${recipe.id || recipeId}, ${ing.ingredientId}, ${ing.ingredientName}, ${ing.quantity}, ${ing.unit}, ${ing.costPerUnit}, ${ing.totalCost}, ${tenantId})
        `;
      }

      return NextResponse.json({ ok: true, id: recipe.id || recipeId, costPerUnit });
    }

    if (action === 'delete') {
      const { id } = body;
      await sql`DELETE FROM recipes WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
