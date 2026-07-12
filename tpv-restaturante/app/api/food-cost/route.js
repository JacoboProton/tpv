import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';

export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const recipeStatus = searchParams.get('recipeStatus'); // 'with', 'without', 'all'
    const costThreshold = searchParams.get('costThreshold'); // 'above35', 'all'
    const sortBy = searchParams.get('sortBy') || 'name'; // 'name', 'cost', 'margin', 'price'

    // Get all products with their categories
    let productsQuery = sql`
      SELECT p.id, p.name, p.category, p.price::float AS price, p.type, p.active
      FROM products p
      WHERE p.active = true AND p.tenant_id = ${tenantId}
    `;
    if (category) {
      productsQuery = sql`${productsQuery} AND p.category = ${category}`;
    }
    productsQuery = sql`${productsQuery} ORDER BY p.category, p.name`;
    const products = await productsQuery;

    // Get all recipes with their costs
    const recipes = await sql`
      SELECT r.product_id, r.cost_per_unit::float AS cost_per_unit
      FROM recipes r
      WHERE r.tenant_id = ${tenantId}
    `;
    const recipeCostMap = {};
    for (const r of recipes) {
      recipeCostMap[r.product_id] = r.cost_per_unit;
    }

    // Get ingredient counts for each recipe
    const ingredientCounts = await sql`
      SELECT r.product_id, COUNT(ri.id) AS ingredient_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE r.tenant_id = ${tenantId}
      GROUP BY r.product_id
    `;
    const ingredientCountMap = {};
    for (const ic of ingredientCounts) {
      ingredientCountMap[ic.product_id] = parseInt(ic.ingredient_count) || 0;
    }

    // Calculate food cost for each product
    const foodCostData = products.map(p => {
      const recipeCost = recipeCostMap[p.id] || 0;
      const hasRecipe = recipeCost > 0;
      const ingredientCount = ingredientCountMap[p.id] || 0;
      const price = p.price || 0;
      const costPct = price > 0 ? (recipeCost / price) * 100 : 0;
      const margin = price > 0 ? price - recipeCost : 0;
      const marginPct = price > 0 ? (margin / price) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        price,
        type: p.type,
        recipeCost,
        hasRecipe,
        ingredientCount,
        costPct,
        margin,
        marginPct,
      };
    });

    // Apply filters
    let filtered = foodCostData;
    if (recipeStatus === 'with') {
      filtered = filtered.filter(item => item.hasRecipe);
    } else if (recipeStatus === 'without') {
      filtered = filtered.filter(item => !item.hasRecipe);
    }
    if (costThreshold === 'above35') {
      filtered = filtered.filter(item => item.costPct > 35);
    }

    // Apply sorting
    if (sortBy === 'cost') {
      filtered.sort((a, b) => b.costPct - a.costPct);
    } else if (sortBy === 'margin') {
      filtered.sort((a, b) => b.marginPct - a.marginPct);
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Calculate summary stats
    const totalItems = foodCostData.length;
    const itemsWithRecipe = foodCostData.filter(item => item.hasRecipe).length;
    const itemsAbove35 = foodCostData.filter(item => item.costPct > 35).length;
    const avgFoodCost = itemsWithRecipe > 0 
      ? foodCostData.filter(item => item.hasRecipe).reduce((sum, item) => sum + item.costPct, 0) / itemsWithRecipe 
      : 0;

    const summary = {
      totalItems,
      avgFoodCost: Math.round(avgFoodCost * 100) / 100,
      itemsAbove35,
      itemsWithRecipe,
    };

    return NextResponse.json({ summary, items: filtered });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
