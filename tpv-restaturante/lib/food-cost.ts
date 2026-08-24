export const DEFAULT_FOOD_COST_THRESHOLD = 35;

export interface FoodCostSaleItem {
  productId?: string | null;
  name: string;
  price: number;
  cost?: number;
  qty: number;
  voided?: boolean;
}

export interface FoodCostSale {
  items: FoodCostSaleItem[];
}

export interface FoodCostRow {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
  costPct: number;
  marginPct: number;
}

export interface FoodCostReport {
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  foodCostPct: number;
  rows: FoodCostRow[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeFoodCostReport(sales: FoodCostSale[], fallbackCost?: Map<string, number>): FoodCostReport {
  const byProduct = new Map<string, FoodCostRow>();
  let totalRevenue = 0;
  let totalCost = 0;

  for (const sale of sales) {
    for (const it of sale.items) {
      if (it.voided) continue;
      const qty = Number(it.qty) || 0;
      if (qty <= 0) continue;
      const revenue = round2((Number(it.price) || 0) * qty);
      const unitCost = Number(it.cost ?? fallbackCost?.get(it.productId || '') ?? 0) || 0;
      const cost = round2(unitCost * qty);
      totalRevenue += revenue;
      totalCost += cost;

      const key = it.productId || it.name;
      const cur = byProduct.get(key) || {
        productId: it.productId || it.name, name: it.name,
        qty: 0, revenue: 0, cost: 0, margin: 0, costPct: 0, marginPct: 0,
      };
      cur.qty += qty;
      cur.revenue += revenue;
      cur.cost += cost;
      byProduct.set(key, cur);
    }
  }

  const rows: FoodCostRow[] = [];
  for (const r of byProduct.values()) {
    r.margin = round2(r.revenue - r.cost);
    r.costPct = r.revenue > 0 ? round2((r.cost / r.revenue) * 100) : 0;
    r.marginPct = r.revenue > 0 ? round2((r.margin / r.revenue) * 100) : 0;
    rows.push(r);
  }
  rows.sort((a, b) => b.cost - a.cost);

  const totalMargin = round2(totalRevenue - totalCost);
  const foodCostPct = totalRevenue > 0 ? round2((totalCost / totalRevenue) * 100) : 0;
  return { totalRevenue: round2(totalRevenue), totalCost: round2(totalCost), totalMargin, foodCostPct, rows };
}
