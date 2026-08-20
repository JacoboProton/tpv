import { NextRequest } from 'next/server';
import { eq, sql, SQL } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { recipes, recipeIngredients } from '../../../db/schema';
import { apiOk, apiError, apiBadRequest } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { RecipeBody } from '@/lib/schemas/api-schemas';

type Row = Record<string, unknown>;

async function qr(query: SQL): Promise<Row[]> {
  const db = getDb();
  return db.execute(query).then((r: { rows: Row[] }) => r.rows);
}

function num(v: unknown, fallback = 0): number {
  return Number(v) || fallback;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const recipeRows = await db.select().from(recipes)
      .where(eq(recipes.tenantId, tenantId))
      .orderBy(recipes.productName);
    const result: Array<Record<string, unknown>> = [];
    for (const r of recipeRows) {
      const ingredients = await db.select().from(recipeIngredients)
        .where(sql`${eq(recipeIngredients.recipeId, r.id)} AND ${eq(recipeIngredients.tenantId, tenantId)}`)
        .orderBy(recipeIngredients.id);
      result.push({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        costPerUnit: num(r.costPerUnit),
        yieldQty: num(r.yieldQty, 1),
        updatedAt: Number(r.updatedAt),
        ingredients: ingredients.map((ing) => ({
          id: ing.id,
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredientName,
          quantity: num(ing.quantity),
          unit: ing.unit,
          costPerUnit: num(ing.costPerUnit),
          totalCost: num(ing.totalCost),
        })),
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
    const parsed = RecipeBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    const { action } = body;

    if (action === 'save') {
      const { productId, productName, yieldQty, ingredients } = body;

      if (!productId || !ingredients || ingredients.length === 0) {
        return apiBadRequest('Producto e ingredientes son requeridos');
      }

      const [recipe] = await db.select().from(recipes)
        .where(sql`${eq(recipes.productId, productId)} AND ${eq(recipes.tenantId, tenantId)}`)
        .limit(1);
      const recipeId = recipe?.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const yieldQtyVal = yieldQty || 1;

      const processedIngredients: Array<{ ingredientId: string; ingredientName: string; quantity: number; unit: string; costPerUnit: number; totalCost: number }> = [];
      for (const ing of ingredients) {
        const iQty = num(ing.quantity);
        const iCostPerUnit = num(ing.costPerUnit);
        const iTotal = iQty * iCostPerUnit;

        const [latestBatch] = await qr(sql`
          SELECT cost_per_unit FROM product_batches
          WHERE product_id = ${ing.ingredientId} AND status = 'active' AND tenant_id = ${tenantId}
          ORDER BY received_at DESC LIMIT 1
        `);
        const currentCost = latestBatch ? num(latestBatch.cost_per_unit) : iCostPerUnit;

        processedIngredients.push({
          ingredientId: ing.ingredientId || '',
          ingredientName: ing.ingredientName || '',
          quantity: iQty,
          unit: ing.unit || 'kg',
          costPerUnit: currentCost,
          totalCost: iQty * currentCost,
        });
      }

      const totalRecipeCost = processedIngredients.reduce((s: number, i) => s + i.totalCost, 0);
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

      return apiOk({ id: recipe?.id || recipeId, costPerUnit });
    }

    if (action === 'delete') {
      const { id } = body;
      await db.execute(sql`DELETE FROM recipes WHERE id = ${id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }

    return apiBadRequest('Unknown action');
  } catch (err) { return apiError(err); }
}
