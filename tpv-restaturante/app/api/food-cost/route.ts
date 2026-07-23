import { NextRequest } from 'next/server';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized, apiForbidden, apiTooManyRequests, apiCreated, apiServerError } from '../../../lib/infrastructure/response';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const recipeStatus = searchParams.get('recipeStatus');
    const costThreshold = searchParams.get('costThreshold');
    const sortBy = searchParams.get('sortBy') || 'name';

    let productsQuery = sql`
      SELECT p.id, p.name, p.category, p.price::float AS price, p.type, p.active
      FROM products p
      WHERE p.active = true AND p.tenant_id = ${tenantId}
    `;
    if (category) productsQuery = sql`${productsQuery} AND p.category = ${category}`;
    productsQuery = sql`${productsQuery} ORDER BY p.category, p.name`;
    const productRows = await db.execute(productsQuery).then((r: any) => r.rows as any[]);

    const recipeRows = await db.execute(sql`
      SELECT r.product_id, r.cost_per_unit::float AS cost_per_unit
      FROM recipes r WHERE r.tenant_id = ${tenantId}
    `).then((r: any) => r.rows as any[]);
    const recipeCostMap: Record<string, any> = {};
    for (const r of recipeRows) recipeCostMap[r.product_id] = r.cost_per_unit;

    const ingredientCountRows = await db.execute(sql`
      SELECT r.product_id, COUNT(ri.id) AS ingredient_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE r.tenant_id = ${tenantId}
      GROUP BY r.product_id
    `).then((r: any) => r.rows as any[]);
    const ingredientCountMap: Record<string, any> = {};
    for (const ic of ingredientCountRows) ingredientCountMap[ic.product_id] = parseInt(ic.ingredient_count) || 0;

    const foodCostData = productRows.map((p: any) => {
      const recipeCost = recipeCostMap[p.id] || 0;
      const hasRecipe = recipeCost > 0;
      const ingredientCount = ingredientCountMap[p.id] || 0;
      const price = p.price || 0;
      const costPct = price > 0 ? (recipeCost / price) * 100 : 0;
      const margin = price > 0 ? price - recipeCost : 0;
      const marginPct = price > 0 ? (margin / price) * 100 : 0;
      return { id: p.id, name: p.name, category: p.category, price, type: p.type, recipeCost, hasRecipe, ingredientCount, costPct, margin, marginPct };
    });

    let filtered = foodCostData;
    if (recipeStatus === 'with') filtered = filtered.filter((item: any) => item.hasRecipe);
    else if (recipeStatus === 'without') filtered = filtered.filter((item: any) => !item.hasRecipe);
    if (costThreshold === 'above35') filtered = filtered.filter((item: any) => item.costPct > 35);
    if (sortBy === 'cost') filtered.sort((a: any, b: any) => b.costPct - a.costPct);
    else if (sortBy === 'margin') filtered.sort((a: any, b: any) => b.marginPct - a.marginPct);
    else if (sortBy === 'price') filtered.sort((a: any, b: any) => b.price - a.price);
    else filtered.sort((a: any, b: any) => a.name.localeCompare(b.name));

    const totalItems = foodCostData.length;
    const itemsWithRecipe = foodCostData.filter((item: any) => item.hasRecipe).length;
    const itemsAbove35 = foodCostData.filter((item: any) => item.costPct > 35).length;
    const avgFoodCost = itemsWithRecipe > 0
      ? foodCostData.filter((item: any) => item.hasRecipe).reduce((sum: number, item: any) => sum + item.costPct, 0) / itemsWithRecipe
      : 0;

    return apiOk({
      summary: { totalItems, avgFoodCost: Math.round(avgFoodCost * 100) / 100, itemsAbove35, itemsWithRecipe },
      items: filtered,
    });
  } catch (err) { return apiError(err); }
}
