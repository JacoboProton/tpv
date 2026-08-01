import { NextRequest } from 'next/server';
import { apiOk, apiError } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { sql, SQL } from 'drizzle-orm';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';

type Row = Record<string, unknown>;
type NumMap = Record<string, number>;

async function qr(query: SQL): Promise<Row[]> {
  const db = getDb();
  return db.execute(query).then((r: { rows: Row[] }) => r.rows);
}

function num(v: unknown, fallback = 0): number {
  return Number(v) || fallback;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
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
    const productRows = await qr(productsQuery);

    const recipeRows = await qr(sql`
      SELECT r.product_id, r.cost_per_unit::float AS cost_per_unit
      FROM recipes r WHERE r.tenant_id = ${tenantId}
    `);
    const recipeCostMap: NumMap = {};
    for (const r of recipeRows) recipeCostMap[r.product_id as string] = num(r.cost_per_unit);

    const ingredientCountRows = await qr(sql`
      SELECT r.product_id, COUNT(ri.id) AS ingredient_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE r.tenant_id = ${tenantId}
      GROUP BY r.product_id
    `);
    const ingredientCountMap: NumMap = {};
    for (const ic of ingredientCountRows) ingredientCountMap[ic.product_id as string] = num(ic.ingredient_count);

    const foodCostData = productRows.map((p) => {
      const recipeCost = recipeCostMap[p.id as string] || 0;
      const hasRecipe = recipeCost > 0;
      const ingredientCount = ingredientCountMap[p.id as string] || 0;
      const price = num(p.price);
      const costPct = price > 0 ? (recipeCost / price) * 100 : 0;
      const margin = price > 0 ? price - recipeCost : 0;
      const marginPct = price > 0 ? (margin / price) * 100 : 0;
      return { id: p.id, name: p.name as string, category: p.category as string, price, type: p.type as string, recipeCost, hasRecipe, ingredientCount, costPct, margin, marginPct };
    });

    let filtered = foodCostData;
    if (recipeStatus === 'with') filtered = filtered.filter((item) => item.hasRecipe);
    else if (recipeStatus === 'without') filtered = filtered.filter((item) => !item.hasRecipe);
    if (costThreshold === 'above35') filtered = filtered.filter((item) => item.costPct > 35);
    if (sortBy === 'cost') filtered.sort((a, b) => b.costPct - a.costPct);
    else if (sortBy === 'margin') filtered.sort((a, b) => b.marginPct - a.marginPct);
    else if (sortBy === 'price') filtered.sort((a, b) => b.price - a.price);
    else filtered.sort((a, b) => a.name.localeCompare(b.name));

    const totalItems = foodCostData.length;
    const itemsWithRecipe = foodCostData.filter((item) => item.hasRecipe).length;
    const itemsAbove35 = foodCostData.filter((item) => item.costPct > 35).length;
    const avgFoodCost = itemsWithRecipe > 0
      ? foodCostData.filter((item) => item.hasRecipe).reduce((sum, item) => sum + item.costPct, 0) / itemsWithRecipe
      : 0;

    return apiOk({
      summary: { totalItems, avgFoodCost: Math.round(avgFoodCost * 100) / 100, itemsAbove35, itemsWithRecipe },
      items: filtered,
    });
  } catch (err) { return apiError(err); }
}
