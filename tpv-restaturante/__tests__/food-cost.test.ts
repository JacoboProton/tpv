import { describe, expect, it } from 'vitest';
import { computeFoodCostReport } from '@/lib/food-cost';

const sales = [
  {
    items: [
      { productId: 'a', name: 'Vino', price: 10, cost: 4, qty: 2, voided: false },
      { productId: 'b', name: 'Cerveza', price: 5, cost: 2, qty: 3, voided: false },
      { productId: 'b', name: 'Cerveza', price: 5, cost: 2, qty: 1, voided: true },
    ],
  },
  {
    items: [{ productId: 'a', name: 'Vino', price: 10, qty: 1, voided: false }],
  },
];

describe('computeFoodCostReport', () => {
  it('sums revenue/cost/margin ignoring voided', () => {
    const r = computeFoodCostReport(sales);
    expect(r.totalRevenue).toBe(10 * 2 + 5 * 3 + 10 * 1);
    expect(r.totalCost).toBe(4 * 2 + 2 * 3);
    expect(r.totalMargin).toBe(r.totalRevenue - r.totalCost);
  });

  it('computes food cost percentage', () => {
    const r = computeFoodCostReport(sales);
    expect(r.foodCostPct).toBeCloseTo((r.totalCost / r.totalRevenue) * 100, 2);
  });

  it('falls back to catalog cost when item has no cost', () => {
    const fallback = new Map<string, number>([['a', 3]]);
    const r = computeFoodCostReport(sales, fallback);
    const vino = r.rows.find(x => x.productId === 'a')!;
    expect(vino.cost).toBeCloseTo(4 * 2 + 3 * 1, 5);
  });

  it('returns zeros for empty sales', () => {
    const r = computeFoodCostReport([]);
    expect(r.totalRevenue).toBe(0);
    expect(r.foodCostPct).toBe(0);
    expect(r.rows).toHaveLength(0);
  });
});
