'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Filter, ArrowUpDown, Download, Edit, Loader2 } from 'lucide-react';

export default function FoodCostView({ colors: C, onNavigate }) {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recipeStatusFilter, setRecipeStatusFilter] = useState('all');
  const [costThresholdFilter, setCostThresholdFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    loadData();
  }, [categoryFilter, recipeStatusFilter, costThresholdFilter, sortBy]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (recipeStatusFilter !== 'all') params.append('recipeStatus', recipeStatusFilter);
      if (costThresholdFilter !== 'all') params.append('costThreshold', costThresholdFilter);
      params.append('sortBy', sortBy);

      const [res, catRes] = await Promise.all([
        fetch(`/api/food-cost?${params.toString()}`),
        fetch('/api/catalog'),
      ]);
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      if (catRes.ok) {
        const catJson = await catRes.json();
        setCategories(catJson.categories || []);
      }
    } catch (err) {
      console.error('Error loading food cost:', err);
    }
    setLoading(false);
  }

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

  function handleEditProduct(productId) {
    if (onNavigate) {
      onNavigate('catalog', productId);
    }
  }

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>;
  }

  const { summary, items } = data || { summary: {}, items: [] };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>INFORME DE COSTES</h2>
        <button onClick={handleExportCSV}
          style={{ background: C.sage + '30', color: C.sage }}
          className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard 
          label="Total artículos" 
          value={summary.totalItems} 
          icon={<CheckCircle className="w-5 h-5" />}
          C={C}
        />
        <SummaryCard 
          label="Food cost medio" 
          value={`${summary.avgFoodCost.toFixed(1)}%`} 
          icon={<TrendingUp className="w-5 h-5" />}
          C={C}
          warning={summary.avgFoodCost > 35}
        />
        <SummaryCard 
          label="Coste > 35%" 
          value={summary.itemsAbove35} 
          icon={<AlertTriangle className="w-5 h-5" />}
          C={C}
          warning={summary.itemsAbove35 > 0}
        />
        <SummaryCard 
          label="Con receta" 
          value={summary.itemsWithRecipe} 
          icon={<CheckCircle className="w-5 h-5" />}
          C={C}
        />
      </div>

      {/* Filters */}
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
          <option value="above35">Coste &gt; 35%</option>
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

      {/* Table */}
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
                    <span className={`font-mono ${item.costPct > 35 ? 'font-bold' : ''}`} 
                      style={{ color: item.costPct > 35 ? C.wine : item.costPct > 25 ? C.brassLight : C.cream }}>
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
  );
}

function SummaryCard({ label, value, icon, C, warning }) {
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
