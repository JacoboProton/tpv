'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Filter, ArrowUpDown, Download, Edit, Loader2 } from 'lucide-react';
import type { Theme } from '../constants';
import { computeFoodCostReport, DEFAULT_FOOD_COST_THRESHOLD, type FoodCostSale } from '@/lib/food-cost';
import { apiFetch } from '@/lib/api';

interface FoodCostItem {
  id: string;
  name: string;
  category: string;
  price: number;
  recipeCost: number;
  costPct: number;
  margin: number;
  marginPct: number;
  ingredientCount: number;
  hasRecipe: boolean;
}

interface FoodCostSummary {
  totalItems: number;
  avgFoodCost: number;
  itemsAbove35: number;
  itemsAboveThreshold: number;
  itemsWithRecipe: number;
}

interface FoodCostData {
  summary: FoodCostSummary;
  items: FoodCostItem[];
}

interface FoodCostViewProps {
  colors: Theme;
  sales?: FoodCostSale[];
  onNavigate?: (view: string, productId?: string) => void;
}

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  C: Theme;
  warning?: boolean;
}


function SummaryCard({ label, value, icon, C, warning }: SummaryCardProps) {
  return (
    <div className="rounded-xl p-4" style={{ background: C.surfaceLight, border: `1px solid ${warning ? C.wine : C.line}` }}>
      <div className="flex items-center justify-between">
        <div style={{ color: warning ? C.wine : C.brassLight }}>{icon}</div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono" style={{ color: C.cream }}>{value}</div>
          <div className="text-[10px]" style={{ color: C.muted }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function AlertBanner({ C, children }: { C: Theme; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
      style={{ background: C.wine + '1A', color: C.wineLight, border: `1px solid ${C.wine}` }}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function FoodCostView({ colors: C, sales, onNavigate }: FoodCostViewProps) {
  const [data, setData] = useState<FoodCostData | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; cost?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recipeStatusFilter, setRecipeStatusFilter] = useState('all');
  const [costThresholdFilter, setCostThresholdFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [threshold, setThreshold] = useState<number>(DEFAULT_FOOD_COST_THRESHOLD);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadData();
  }, [categoryFilter, recipeStatusFilter, costThresholdFilter, sortBy, threshold]);

  async function loadSettings() {
    try {
      const json = await apiFetch('/api/settings') as Record<string, unknown>;
      const raw = json?.foodCostThreshold;
      const n = raw !== undefined ? Number(raw) : NaN;
      if (Number.isFinite(n) && n >= 0 && n <= 100) setThreshold(n);
    } catch (err) {
      console.error('Error loading food cost threshold:', err);
    }
  }

  async function persistThreshold(value: number) {
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodCostThreshold: String(value) }),
      });
    } catch (err) {
      console.error('Error saving food cost threshold:', err);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (recipeStatusFilter !== 'all') params.append('recipeStatus', recipeStatusFilter);
      if (costThresholdFilter !== 'all') params.append('costThreshold', costThresholdFilter);
      params.append('threshold', String(threshold));
      params.append('sortBy', sortBy);

      const [res, catRes] = await Promise.all([
        fetch(`/api/food-cost?${params.toString()}`),
        fetch('/api/catalog'),
      ]);

      if (res.ok) {
        const json = await res.json() as FoodCostData;
        setData(json);
      }
      if (catRes.ok) {
        const catJson = await catRes.json() as { categories?: { id: string; name: string }[]; products?: { id: string; cost?: number }[] };
        setCategories(catJson.categories || []);
        setProducts(catJson.products || []);
      }
    } catch (err) {
      console.error('Error loading food cost:', err);
    }
    setLoading(false);
  }

  const fallback = new Map<string, number>();
  for (const p of products) fallback.set(p.id, typeof p.cost === 'number' ? p.cost : 0);
  const actual = sales && sales.length > 0 ? computeFoodCostReport(sales, fallback) : null;
  const actualOver = actual ? actual.foodCostPct > threshold : false;

  function handleExportCSV() {
    if (!data?.items) return;

    const headers = ['Nombre', 'Categoría', 'Precio', 'Coste receta', '% Coste', 'Margen', '% Margen', 'Ingredientes', 'Tiene receta'];
    const rows = data.items.map(item => [
      item.name,
      item.category,
      item.price.toFixed(2),
      item.recipeCost.toFixed(4),
      item.costPct.toFixed(2),
      item.margin.toFixed(2),
      item.marginPct.toFixed(2),
      item.ingredientCount,
      item.hasRecipe ? 'Sí' : 'No',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `food-cost-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  function handleEditProduct(productId: string) {
    if (onNavigate) onNavigate('inventario', productId);
  }

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>;
  }

  const summary = data?.summary ?? { totalItems: 0, avgFoodCost: 0, itemsAbove35: 0, itemsAboveThreshold: 0, itemsWithRecipe: 0 };
  const items = data?.items ?? [];
  const recipeOverCount = items.filter(i => i.costPct > threshold).length;
  const showAlert = actualOver || recipeOverCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>INFORME DE COSTES</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
            Umbral alerta
            <input
              type="number" min={0} max={100} step={1} value={threshold}
              onChange={e => {
                const n = Number(e.target.value);
                const next = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : DEFAULT_FOOD_COST_THRESHOLD;
                setThreshold(next);
                persistThreshold(next);
              }}
              className="rounded-lg px-2 py-1.5 w-16 font-mono text-sm text-center"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            />
            <span>%</span>
          </label>
          <button onClick={handleExportCSV}
            style={{ background: C.sage + '30', color: C.sage }}
            className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {showAlert && (
        <AlertBanner C={C}>
          Food cost por encima del umbral ({threshold}%):
          {actual && <> real <b className="font-mono">{actual.foodCostPct}%</b></>} coste de receta en <b>{recipeOverCount}</b> {recipeOverCount === 1 ? 'artículo' : 'artículos'}.
        </AlertBanner>
      )}

      {actual && (
        <div className="space-y-3">
          <h3 className="font-display text-lg" style={{ color: C.brassLight }}>Food cost real (ventas)</h3>
          <div className="grid grid-cols-4 gap-3">
            <SummaryCard label="Ingresos" value={`${actual.totalRevenue.toFixed(2)}€`} icon={<TrendingUp className="w-5 h-5" />} C={C} />
            <SummaryCard label="Coste" value={`${actual.totalCost.toFixed(2)}€`} icon={<TrendingDown className="w-5 h-5" />} C={C} warning />
            <SummaryCard label="Margen" value={`${actual.totalMargin.toFixed(2)}€`} icon={<CheckCircle className="w-5 h-5" />} C={C} />
            <SummaryCard label="Food cost real" value={`${actual.foodCostPct}%`} icon={<AlertTriangle className="w-5 h-5" />} C={C} warning={actualOver} />
          </div>
          {actual.rows.length === 0 ? (
            <p className="text-sm" style={{ color: C.muted }}>Sin ventas con coste registrado.</p>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: C.surface }}>
                    <th className="px-3 py-2 text-left" style={{ color: C.muted }}>Producto</th>
                    <th className="px-3 py-2 text-right" style={{ color: C.muted }}>Uds</th>
                    <th className="px-3 py-2 text-right" style={{ color: C.muted }}>Ingreso</th>
                    <th className="px-3 py-2 text-right" style={{ color: C.muted }}>Coste</th>
                    <th className="px-3 py-2 text-right" style={{ color: C.muted }}>Margen</th>
                    <th className="px-3 py-2 text-right" style={{ color: C.muted }}>% Coste</th>
                  </tr>
                </thead>
                <tbody>
                  {actual.rows.map(r => (
                    <tr key={r.productId} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td className="px-3 py-2 font-medium" style={{ color: C.cream }}>{r.name}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: C.cream }}>{r.qty}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: C.cream }}>{r.revenue.toFixed(2)}€</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: C.wine }}>{r.cost.toFixed(2)}€</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: C.sage }}>{r.margin.toFixed(2)}€</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-mono ${r.costPct > threshold ? 'font-bold' : ''}`}
                          style={{ color: r.costPct > threshold ? C.wine : C.cream }}>{r.costPct}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-display text-lg" style={{ color: C.brassLight }}>Food cost teórico (recetas)</h3>
        <div className="grid grid-cols-4 gap-3">
          <SummaryCard label="Total artículos" value={summary.totalItems} icon={<CheckCircle className="w-5 h-5" />} C={C} />
          <SummaryCard
            label="Food cost medio"
            value={`${summary.avgFoodCost.toFixed(1)}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            C={C}
            warning={summary.avgFoodCost > threshold}
          />
          <SummaryCard
            label={`Coste > ${threshold}%`}
            value={summary.itemsAboveThreshold}
            icon={<AlertTriangle className="w-5 h-5" />}
            C={C}
            warning={summary.itemsAboveThreshold > 0}
          />
          <SummaryCard label="Con receta" value={summary.itemsWithRecipe} icon={<CheckCircle className="w-5 h-5" />} C={C} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1" style={{ color: C.muted }}>
            <Filter className="w-4 h-4" />
            <span className="text-xs">Filtros:</span>
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
            <option value="all">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <select value={recipeStatusFilter} onChange={e => setRecipeStatusFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
            <option value="all">Todos los estados</option>
            <option value="with">Con receta</option>
            <option value="without">Sin receta</option>
          </select>
          <select value={costThresholdFilter} onChange={e => setCostThresholdFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
            <option value="all">Todos los costes</option>
            <option value="above">Coste &gt; {threshold}%</option>
          </select>
          <div className="flex-1" />
          <div className="flex items-center gap-1" style={{ color: C.muted }}>
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-xs">Ordenar:</span>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
            <option value="name">Nombre</option>
            <option value="cost">% Coste</option>
            <option value="margin">% Margen</option>
            <option value="price">Precio</option>
          </select>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: C.muted }}>No hay artículos con los filtros seleccionados</p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: C.surface }}>
                  <th className="px-3 py-2 text-left" style={{ color: C.muted }}>Artículo</th>
                  <th className="px-3 py-2 text-right" style={{ color: C.muted }}>Precio</th>
                  <th className="px-3 py-2 text-right" style={{ color: C.muted }}>% Coste</th>
                  <th className="px-3 py-2 text-right" style={{ color: C.muted }}>Margen</th>
                  <th className="px-3 py-2 text-center" style={{ color: C.muted }}>Ingredientes</th>
                  <th className="px-3 py-2 text-center" style={{ color: C.muted }}>Receta</th>
                  <th className="px-3 py-2 text-center" style={{ color: C.muted }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2">
                      <div>
                        <div className="font-medium" style={{ color: C.cream }}>{item.name}</div>
                        <div className="text-[10px]" style={{ color: C.muted }}>{item.category}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: C.cream }}>{item.price.toFixed(2)}€</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-mono ${item.costPct > threshold ? 'font-bold' : ''}`}
                        style={{ color: item.costPct > threshold ? C.wine : item.costPct > threshold * 0.8 ? C.brassLight : C.cream }}>
                        {item.costPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: C.sage }}>{item.marginPct.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-center" style={{ color: C.muted }}>{item.ingredientCount}</td>
                    <td className="px-3 py-2 text-center">
                      {item.hasRecipe ? (
                        <CheckCircle className="w-4 h-4 mx-auto" style={{ color: C.sage }} />
                      ) : (
                        <AlertTriangle className="w-4 h-4 mx-auto" style={{ color: C.wine }} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleEditProduct(item.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:opacity-80"
                        style={{ background: C.surface, color: C.muted }}>
                        <Edit className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
