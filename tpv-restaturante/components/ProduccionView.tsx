'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Check, X, ChevronDown, ChevronUp, Loader2, Search, Ban, AlertTriangle, Package, BookOpen } from 'lucide-react';
import type { Theme } from './constants';

interface ProductionIngredient {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
}

interface Production {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
  location: string;
  batchNumber: string;
  expiryDate: string;
  notes: string;
  status: string;
  producedAt: number;
  createdAt: number;
  anuladoAt: number | null;
  anuladoReason: string;
  anuladoBy: string;
  ingredients: ProductionIngredient[];
  recipeYield: number;
}

interface RecipeIngredient {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

interface Recipe {
  id: string;
  productId: string;
  productName: string;
  costPerUnit: number;
  yieldQty: number;
  updatedAt: number;
  ingredients: RecipeIngredient[];
}

interface CatalogProduct {
  id: string;
  name: string;
  type: string;
  inventariable: boolean;
  price?: number;
}

interface Catalog {
  products: CatalogProduct[];
}

interface ProduccionViewProps {
  catalog: Catalog;
  colors: Theme;
}

export default function ProduccionView({ catalog, colors: C }: ProduccionViewProps) {
  const [productions, setProductions] = useState<Production[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const elaborados = (catalog?.products || []).filter(
    (p: CatalogProduct) => p.type === 'elaborado' && p.inventariable
  );

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        fetch('/api/production'),
        fetch('/api/recipes'),
      ]);
      if (pRes.ok) setProductions(await pRes.json());
      if (rRes.ok) setRecipes(await rRes.json());
    } catch {}
    setLoading(false);
  }

  const filtered = productions.filter(p =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (!searchQuery ||
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const recipeMap: Record<string, Recipe> = {};
  for (const r of recipes) recipeMap[r.productId] = r;

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>;
  }

  if (showRecipes) {
    return (
      <RecipeManager
        catalog={catalog}
        recipes={recipes}
        elaborados={elaborados}
        C={C}
        onBack={() => setShowRecipes(false)}
        onSaved={() => { setShowRecipes(false); loadAll(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>PRODUCCIÓN</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowRecipes(true)}
            style={{ background: C.surface, color: C.muted }}
            className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all">
            <BookOpen className="w-4 h-4" /> Recetas
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ background: C.sage, color: '#fff' }}
            className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> Nueva producción
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por producto o lote..."
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm flex-1"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
          <option value="all">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="anulado">Anulada</option>
        </select>
      </div>

      {showForm && (
        <ProduccionForm
          elaborados={elaborados}
          recipes={recipes}
          recipeMap={recipeMap}
          C={C}
          onClose={() => setShowForm(false)}
          onSaved={() => { loadAll(); setShowForm(false); }}
          onManageRecipes={() => { setShowForm(false); setShowRecipes(true); }}
        />
      )}

      {elaborados.length === 0 && productions.length === 0 && !showForm && (
        <div className="rounded-xl p-6 text-center" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" style={{ color: C.wineLight }} />
          <p className="text-sm font-medium" style={{ color: C.cream }}>No hay elaborados inventariables</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>
            Ve a <strong>Carta</strong>, edita un producto, asígnale tipo <strong>elaborado</strong> y marca <strong>inventariable</strong>.
          </p>
        </div>
      )}

      {filtered.length === 0 && productions.length > 0 ? (
        <p className="text-sm text-center py-8" style={{ color: C.muted }}>Sin resultados</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <ProduccionCard
              key={p.id}
              prod={p}
              C={C}
              onVoid={() => handleVoid(p)}
              processing={processingId === p.id}
            />
          ))}
        </div>
      )}
    </div>
  );

  async function handleVoid(prod: Production) {
    const reason = prompt('Motivo de la anulación (opcional):');
    if (reason === null) return;
    setProcessingId(prod.id);
    try {
      const r = await fetch('/api/production', {
        method: 'POST',
        body: JSON.stringify({ action: 'void', id: prod.id, reason, anuladoBy: 'Usuario' }),
      });
      if (r.ok) {
        loadAll();
      } else {
        const err = await r.json();
        alert('Error al anular: ' + (err.error || 'Error desconocido'));
      }
    } catch (err: unknown) {
      alert('Error al anular: ' + (err as Error).message);
    }
    setProcessingId(null);
  }
}

interface ProduccionCardProps {
  prod: Production;
  C: Theme;
  onVoid: () => void;
  processing: boolean;
}

function ProduccionCard({ prod: p, C, onVoid, processing }: ProduccionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl p-4 space-y-2" style={{
      background: C.surfaceLight,
      border: `1px solid ${C.line}`,
      opacity: p.status === 'anulado' ? 0.6 : 1,
    }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: C.brassLight }} />
            <span className="font-medium text-sm" style={{ color: C.cream }}>{p.productName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
              background: p.status === 'active' ? C.sage + '30' : C.wine + '30',
              color: p.status === 'active' ? C.sage : C.wine,
            }}>
              {p.status === 'active' ? 'Activa' : 'Anulada'}
            </span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
            {p.quantity} uds. · {new Date(p.producedAt).toLocaleDateString()}
            {p.location && ` · ${p.location}`}
            {p.batchNumber && ` · Lote: ${p.batchNumber}`}
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-mono" style={{ color: C.brassLight }}>{p.costPerUnit.toFixed(4)}€/ud</span>
          <p className="text-[9px]" style={{ color: C.muted }}>Total: {p.totalCost.toFixed(2)}€</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {p.status === 'active' && (
          <button onClick={onVoid}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: C.wine + '30', color: C.wine }}>
            {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
            {processing ? 'Anulando...' : 'Anular'}
          </button>
        )}
        {p.status === 'anulado' && p.anuladoReason && (
          <p className="text-[10px]" style={{ color: C.wine }}>Motivo: {p.anuladoReason}</p>
        )}
        <div className="flex-1" />
        <button onClick={() => setExpanded(!expanded)} style={{ color: C.muted }}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-1 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
          <p className="text-[10px] font-medium" style={{ color: C.muted }}>Ingredientes consumidos:</p>
          {p.ingredients.map(ing => (
            <div key={ing.id} className="flex items-center justify-between text-[10px] pl-2">
              <span style={{ color: C.cream }}>{ing.ingredientName}</span>
              <span style={{ color: C.muted }}>{ing.quantity.toFixed(3)} × {ing.costPerUnit.toFixed(4)}€ = {ing.totalCost.toFixed(2)}€</span>
            </div>
          ))}
          <div className="flex justify-between text-[10px] pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
            <span style={{ color: C.muted }}>Coste total:</span>
            <span className="font-mono" style={{ color: C.brassLight }}>{p.totalCost.toFixed(2)}€</span>
          </div>
          {p.notes && (
            <p className="text-[10px] pt-1" style={{ color: C.muted }}>Notas: {p.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface ProduccionFormProps {
  elaborados: CatalogProduct[];
  recipes: Recipe[];
  recipeMap: Record<string, Recipe>;
  C: Theme;
  onClose: () => void;
  onSaved: () => void;
  onManageRecipes: () => void;
}

function ProduccionForm({ elaborados, recipes, recipeMap, C, onClose, onSaved, onManageRecipes }: ProduccionFormProps) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState('Cocina');
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [producedAt, setProducedAt] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);

  const selectedRecipe = recipeMap[productId];
  const suggestedCost = selectedRecipe ? selectedRecipe.costPerUnit : 0;

  useEffect(() => {
    if (selectedRecipe) setCostPerUnit(suggestedCost);
  }, [productId]);

  async function handleSave() {
    if (!productId || !quantity || quantity <= 0) return;
    setSaving(true);
    try {
      const product = elaborados.find(p => p.id === productId);
      const r = await fetch('/api/production', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          productId,
          productName: product?.name || '',
          quantity: Number(quantity),
          costPerUnit: Number(costPerUnit) || 0,
          location,
          batchNumber,
          expiryDate,
          notes,
          producedAt: new Date(producedAt).getTime(),
          createdBy: 'Usuario',
        }),
      });
      if (r.ok) {
        onSaved();
      } else {
        const err = await r.json();
        alert('Error: ' + (err.error || 'Error desconocido'));
      }
    } catch (err: unknown) {
      alert('Error: ' + (err as Error).message);
    }
    setSaving(false);
  }

  const totalCost = (Number(costPerUnit) || 0) * (Number(quantity) || 0);

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
      <h3 className="text-sm font-bold" style={{ color: C.cream }}>Nueva producción</h3>

      <div>
        <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Producto elaborado</label>
        <div className="flex gap-2">
          <select value={productId} onChange={e => setProductId(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2 text-xs"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}>
            <option value="">Seleccionar producto</option>
            {elaborados.map(p => {
              const r = recipeMap[p.id];
              return (
                <option key={p.id} value={p.id}>
                  {p.name}{r ? ` (rinde ${r.yieldQty} ud · ${r.costPerUnit.toFixed(4)}€/ud)` : ' (sin receta)'}
                </option>
              );
            })}
          </select>
          {productId && !selectedRecipe && (
            <button onClick={onManageRecipes}
              className="px-3 py-2 rounded-lg text-[10px] font-medium whitespace-nowrap"
              style={{ background: C.brass + '30', color: C.brassLight }}>
              + Receta
            </button>
          )}
        </div>
      </div>

      {selectedRecipe && (
        <div className="rounded-lg p-2" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <p className="text-[10px] font-medium mb-1" style={{ color: C.muted }}>
            Receta — rinde {selectedRecipe.yieldQty} ud · {selectedRecipe.ingredients.length} ingredientes
          </p>
          {selectedRecipe.ingredients.map(ing => (
            <div key={ing.id} className="flex justify-between text-[10px] pl-1">
              <span style={{ color: C.cream }}>{ing.ingredientName}</span>
              <span style={{ color: C.muted }}>{ing.quantity} {ing.unit} × {ing.costPerUnit.toFixed(4)}€</span>
            </div>
          ))}
        </div>
      )}

      {!selectedRecipe && productId && (
        <p className="text-[10px]" style={{ color: C.wineLight }}>
          Este producto no tiene receta. Pulsa "+ Receta" para crearla.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Cantidad</label>
          <input type="number" step="0.01" value={quantity} min={0.01}
            onChange={e => setQuantity(Number(e.target.value))}
            className="w-full rounded-lg px-2 py-1.5 text-[10px]"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Coste unidad (€)</label>
          <input type="number" step="0.0001" value={costPerUnit} min={0}
            onChange={e => setCostPerUnit(Number(e.target.value))}
            className="w-full rounded-lg px-2 py-1.5 text-[10px] font-mono"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Total (€)</label>
          <div className="w-full rounded-lg px-2 py-1.5 text-[10px] font-mono text-right"
            style={{ background: C.surface, color: C.brassLight, border: `1px solid ${C.line}` }}>
            {totalCost.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Ubicación</label>
          <select value={location} onChange={e => setLocation(e.target.value)}
            className="w-full rounded-lg px-2 py-1.5 text-[10px]"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}>
            <option value="Cocina">Cocina</option>
            <option value="Almacén">Almacén</option>
            <option value="Bar">Bar</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Nº Lote</label>
          <input type="text" value={batchNumber}
            onChange={e => setBatchNumber(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-lg px-2 py-1.5 text-[10px]"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Caducidad</label>
          <input type="date" value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            className="w-full rounded-lg px-2 py-1.5 text-[10px]"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        </div>
      </div>

      <div>
        <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Fecha/hora producción</label>
        <input type="datetime-local" value={producedAt}
          onChange={e => setProducedAt(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
      </div>

      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notas (opcional)"
        className="rounded-lg px-3 py-2 text-xs w-full"
        style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}`, minHeight: '60px' }} />

      <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: C.surface, color: C.muted }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !productId || !selectedRecipe || !quantity || quantity <= 0}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40"
            style={{ background: C.sage + '30', color: C.sage }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Guardar producción
          </button>
        </div>
      </div>
    </div>
  );
}

interface RecipeManagerProps {
  catalog: Catalog;
  recipes: Recipe[];
  elaborados: CatalogProduct[];
  C: Theme;
  onBack: () => void;
  onSaved: () => void;
}

function RecipeManager({ catalog, recipes, elaborados, C, onBack, onSaved }: RecipeManagerProps) {
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [yieldQty, setYieldQty] = useState(1);
  const [ingredients, setIngredients] = useState<Omit<RecipeIngredient, 'id' | 'totalCost'>[]>([]);
  const [saving, setSaving] = useState(false);

  const rawMaterials = (catalog?.products || []).filter(
    (p: CatalogProduct) => p.type === 'raw_material' || (p.type !== 'elaborado' && !p.type)
  );

  function startNewRecipe() {
    setSelectedProductId('');
    setYieldQty(1);
    setIngredients([]);
    setEditingRecipe('new');
  }

  function editRecipe(recipe: Recipe) {
    setSelectedProductId(recipe.productId);
    setYieldQty(recipe.yieldQty);
    setIngredients(recipe.ingredients.map(ing => ({
      ingredientId: ing.ingredientId,
      ingredientName: ing.ingredientName,
      quantity: ing.quantity,
      unit: ing.unit || 'kg',
      costPerUnit: ing.costPerUnit,
    })));
    setEditingRecipe(recipe.id);
  }

  function addIngredient() {
    setIngredients(i => [...i, { ingredientId: '', ingredientName: '', quantity: 0, unit: 'kg', costPerUnit: 0 }]);
  }

  function updateIngredient(idx: number, field: string, value: string) {
    setIngredients(i => {
      const n = [...i];
      n[idx] = { ...n[idx], [field]: value };
      if (field === 'ingredientId') {
        const product = rawMaterials.find((p: CatalogProduct) => p.id === value);
        if (product) {
          n[idx].ingredientName = product.name;
          n[idx].costPerUnit = product.price || 0;
        }
      }
      return n;
    });
  }

  function removeIngredient(idx: number) {
    setIngredients(i => i.filter((_, index) => index !== idx));
  }

  async function handleSaveRecipe() {
    if (!selectedProductId || ingredients.length === 0) return;
    setSaving(true);
    try {
      const product = elaborados.find(p => p.id === selectedProductId) || catalog?.products?.find((p: CatalogProduct) => p.id === selectedProductId);
      const r = await fetch('/api/recipes', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          productId: selectedProductId,
          productName: product?.name || '',
          yieldQty,
          ingredients: ingredients.map(ing => ({
            ingredientId: ing.ingredientId,
            ingredientName: ing.ingredientName,
            quantity: Number(ing.quantity) || 0,
            unit: ing.unit,
            costPerUnit: Number(ing.costPerUnit) || 0,
          })),
        }),
      });
      if (r.ok) {
        setEditingRecipe(null);
        onSaved();
      } else {
        const err = await r.json();
        alert('Error: ' + (err.error || 'Error desconocido'));
      }
    } catch (err: unknown) {
      alert('Error: ' + (err as Error).message);
    }
    setSaving(false);
  }

  async function handleDeleteRecipe(recipe: Recipe) {
    if (!confirm(`¿Eliminar receta de ${recipe.productName}?`)) return;
    try {
      await fetch('/api/recipes', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id: recipe.id }),
      });
      onSaved();
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>RECETAS</h2>
        <div className="flex gap-2">
          <button onClick={onBack}
            style={{ background: C.surface, color: C.muted }}
            className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90">
            Volver
          </button>
          <button onClick={startNewRecipe}
            style={{ background: C.sage, color: '#fff' }}
            className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90">
            <Plus className="w-4 h-4" /> Nueva receta
          </button>
        </div>
      </div>

      {editingRecipe && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold" style={{ color: C.cream }}>
            {editingRecipe === 'new' ? 'Nueva receta' : 'Editar receta'}
          </h3>

          <div>
            <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Producto</label>
            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}>
              <option value="">Seleccionar producto</option>
              {elaborados.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Rendimiento (unidades por lote)</label>
            <input type="number" step="0.01" value={yieldQty} min={0.01}
              onChange={e => setYieldQty(parseFloat(e.target.value) || 1)}
              className="w-full rounded-lg px-3 py-2 text-xs"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px]" style={{ color: C.muted }}>Ingredientes</label>
              <button onClick={addIngredient}
                className="text-[10px] font-medium flex items-center gap-1 hover:opacity-80"
                style={{ color: C.brassLight }}>
                <Plus className="w-3 h-3" /> Añadir
              </button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="rounded-lg p-2 space-y-1" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  <div className="flex gap-2">
                    <select value={ing.ingredientId} onChange={e => updateIngredient(i, 'ingredientId', e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1 text-[10px]"
                      style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
                      <option value="">Seleccionar</option>
                      {rawMaterials.map((p: CatalogProduct) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button onClick={() => removeIngredient(i)} style={{ color: C.wineLight }}><X className="w-3 h-3" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[8px] block" style={{ color: C.muted }}>Cantidad</label>
                      <input type="number" step="0.001" value={ing.quantity} min={0}
                        onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                        className="w-full rounded px-1.5 py-1 text-[10px] text-center"
                        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
                    </div>
                    <div>
                      <label className="text-[8px] block" style={{ color: C.muted }}>Unidad</label>
                      <select value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}
                        className="w-full rounded px-1.5 py-1 text-[10px]"
                        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">l</option>
                        <option value="ml">ml</option>
                        <option value="ud">ud</option>
                        <option value="lata">lata</option>
                        <option value="bote">bote</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] block" style={{ color: C.muted }}>€/ud</label>
                      <input type="number" step="0.001" value={ing.costPerUnit} min={0}
                        onChange={e => updateIngredient(i, 'costPerUnit', e.target.value)}
                        className="w-full rounded px-1.5 py-1 text-[10px] text-center font-mono"
                        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
                    </div>
                    <div className="flex items-end pb-1">
                      <span className="text-[10px] font-mono" style={{ color: C.brassLight }}>
                        {((Number(ing.quantity) || 0) * (Number(ing.costPerUnit) || 0)).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-xs pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
            <span style={{ color: C.muted }}>Coste por unidad:</span>
            <span className="font-mono" style={{ color: C.brassLight }}>
              {ingredients.length > 0 && yieldQty > 0
                ? (ingredients.reduce((s, ing) => s + ((Number(ing.quantity) || 0) * (Number(ing.costPerUnit) || 0)), 0) / yieldQty).toFixed(4)
                : '0'}€
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditingRecipe(null)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: C.surface, color: C.muted }}>
              Cancelar
            </button>
            <button onClick={handleSaveRecipe} disabled={saving || !selectedProductId || ingredients.length === 0}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40"
              style={{ background: C.sage + '30', color: C.sage }}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Guardar receta
            </button>
          </div>
        </div>
      )}

      {recipes.length === 0 && !editingRecipe && (
        <div className="rounded-xl p-6 text-center" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
          <p className="text-sm" style={{ color: C.muted }}>No hay recetas. Crea una para empezar.</p>
        </div>
      )}

      {recipes.length > 0 && !editingRecipe && (
        <div className="space-y-2">
          {recipes.map(r => (
            <div key={r.id} className="rounded-xl p-4" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: C.cream }}>{r.productName}</p>
                  <p className="text-[10px]" style={{ color: C.muted }}>
                    Rinde {r.yieldQty} ud · {r.ingredients.length} ingredientes · {r.costPerUnit.toFixed(4)}€/ud
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editRecipe(r)}
                    className="px-2 py-1 rounded-lg text-[10px]"
                    style={{ background: C.surface, color: C.muted }}>
                    Editar
                  </button>
                  <button onClick={() => handleDeleteRecipe(r)}
                    className="px-2 py-1 rounded-lg text-[10px]"
                    style={{ background: C.wine + '30', color: C.wine }}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
