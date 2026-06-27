"use client";

import { useState, useRef, useEffect } from 'react';
import { Plus, AlertTriangle, Trash2, Package, Filter, FolderTree, List, Camera, Star, Truck, ChevronDown, ChevronUp, Euro, Check, X } from 'lucide-react';
import { euros, ALLERGENS, ALLERGEN_COLORS } from './constants';

function totalStock(p) {
  const sbl = p.stockByLocation || {};
  return Object.values(sbl).reduce((s, e) => s + (e.stock || 0), 0);
}

function isLow(p) {
  const sbl = p.stockByLocation || {};
  return Object.values(sbl).some(e => (e.stock || 0) <= (e.lowStock || 0));
}

const LOCATIONS = ['Bar', 'Cocina', 'Almacén'];

export default function InventarioView({
  catalog, colors: C, onUpdateField,
  newProductOpen, setNewProductOpen, onAddProduct,
  confirmDeleteId, setConfirmDeleteId, onDelete,
  suppliers, onSupplierRefresh,
}) {
  const fileInputRef = useRef(null);
  const [uploadingProduct, setUploadingProduct] = useState(null);
  const [showProductSuppliers, setShowProductSuppliers] = useState(null);

  async function handleUploadImage(productId, file) {
    if (!file) return;
    setUploadingProduct(productId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) onUpdateField(productId, 'image', data.url);
    } catch {}
    setUploadingProduct(null);
  }
  const [form, setForm] = useState({
    name: '', category: catalog.categories[0] || '', price: '', stock: '', lowStock: '', ubicacion: 'Bar',
  });
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterLowOnly, setFilterLowOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByCat, setGroupByCat] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!form.name || !form.price) return;
    onAddProduct(form);
    setForm({ name: '', category: catalog.categories[0] || '', price: '', stock: '', lowStock: '', ubicacion: 'Bar' });
  }

  const filteredProducts = catalog.products.filter(p => {
    const byCategory = filterCategory === 'Todos' || p.category === filterCategory;
    const byLowStock = !filterLowOnly || isLow(p);
    const bySearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return byCategory && byLowStock && bySearch;
  });

  const porCategoria = {};
  for (const p of filteredProducts) {
    if (!porCategoria[p.category]) porCategoria[p.category] = [];
    porCategoria[p.category].push(p);
  }
  const categorias = Object.keys(porCategoria).sort();

  const totalValor = filteredProducts.reduce((s, p) => s + totalStock(p) * p.price, 0);
  const totalBajo = filteredProducts.filter(isLow).length;

  const inputStyle = {
    background: C.surfaceLight,
    color: C.cream,
    border: `1px solid transparent`,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  function updateStock(pId, loc, val) {
    const nv = parseInt(val) || 0;
    const p = catalog.products.find(p => p.id === pId);
    const sbl = { ...(p?.stockByLocation || {}) };
    sbl[loc] = { stock: nv, lowStock: sbl[loc]?.lowStock ?? 5 };
    onUpdateField(pId, 'stockByLocation', sbl);
  }

  function stockBar(p) {
    const sbl = p.stockByLocation || {};
    const all = LOCATIONS.map(loc => ({ loc, entry: sbl[loc] }));
    const hasStock = all.some(({ entry }) => entry);
    if (!hasStock) {
      const total = Object.values(sbl).reduce((s, e) => s + (e.stock || 0), 0);
      const low = Object.values(sbl).reduce((s, e) => s + (e.lowStock || 5), 0);
      const pct = Math.min(100, low ? Math.round((total / low) * 50) : 0);
      return { total, low: total <= low / LOCATIONS.length, pct, multi: false };
    }
    const total = all.reduce((s, { entry }) => s + (entry?.stock || 0), 0);
    const minLow = Math.min(...all.filter(({ entry }) => entry).map(({ entry }) => entry.lowStock || 5));
    return { total, low: total <= minLow, pct: Math.min(100, minLow ? Math.round((total / minLow) * 50) : 0), multi: true };
  }

  function renderProduct(p) {
    const sb = stockBar(p);
    return (
      <div
        key={p.id}
        style={{ background: C.surface, border: `1px solid ${sb.low ? C.wine : C.line}` }}
        className={`rounded-lg p-3 flex flex-wrap items-center gap-3 transition-all ${sb.low ? 'shadow-md shadow-red-500/10' : ''}`}
      >
          <div className="flex items-start gap-3 flex-1 min-w-[8rem]">
            <div className="relative shrink-0">
              {p.image ? (
                <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <div style={{ background: sb.low ? 'rgba(176,94,94,0.2)' : 'rgba(122,154,124,0.2)', width: 36, height: 36 }} className="rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4" style={{ color: sb.low ? C.wineLight : C.sageLight }} />
                </div>
              )}
              <button
                onClick={() => { setUploadingProduct(p.id); setTimeout(() => fileInputRef.current?.click(), 0); }}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center hover:opacity-80"
                title="Cambiar imagen"
              >
                <Camera className="w-2.5 h-2.5" style={{ color: C.muted }} />
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{p.name}</p>
                <button
                  onClick={() => onUpdateField(p.id, 'featured', !p.featured)}
                  style={{ color: p.featured ? C.brassLight : C.muted }}
                  className="p-0.5 hover:opacity-80 transition-colors"
                  title={p.featured ? 'Quitar destacado' : 'Marcar como destacado'}
                >
                  <Star className="w-3.5 h-3.5" fill={p.featured ? C.brassLight : 'transparent'} />
                </button>
              </div>
              <p style={{ color: C.muted }} className="text-xs">{p.category} · {p.ubicacion}</p>
            <div className="flex gap-0.5 mt-0.5 flex-wrap">
              {ALLERGENS.map(a => {
                const active = p.allergens?.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      const current = p.allergens || [];
                      const next = active ? current.filter(x => x !== a.id) : [...current, a.id];
                      onUpdateField(p.id, 'allergens', next);
                    }}
                    className="text-[9px] font-bold px-1 rounded-sm leading-tight border-0 cursor-pointer"
                    style={{
                      background: active ? ALLERGEN_COLORS[a.id] + '40' : 'transparent',
                      color: active ? ALLERGEN_COLORS[a.id] : C.muted,
                      opacity: active ? 1 : 0.4,
                    }}
                    title={a.label}
                  >
                    {a.abbr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stock por ubicación */}
          <div className="flex gap-1.5">
            {LOCATIONS.map(loc => {
              const entry = (p.stockByLocation || {})[loc];
              if (!entry && !sb.multi) return null;
              const stk = entry?.stock ?? (sb.multi ? null : 0);
              const low = entry?.lowStock ?? 5;
              const isLowLoc = stk !== null && stk <= low;
              if (stk === null) return null;
              return (
                <div key={loc} className="flex flex-col items-center">
                  <span style={{ color: C.muted }} className="text-[10px] uppercase">{loc.slice(0, 3)}</span>
                  <div className="relative">
                    <input
                      type="number" defaultValue={stk}
                      onBlur={e => updateStock(p.id, loc, e.target.value)}
                      style={{ ...inputStyle, color: isLowLoc ? C.wineLight : C.cream, width: 52 }}
                      className="rounded-lg px-1.5 py-1 text-xs text-center font-mono hover:border-gray-500 focus:border-gray-300 focus:outline-none"
                      onMouseEnter={e => { if (!e.target.matches(':focus')) e.target.style.borderColor = C.line; }}
                      onMouseLeave={e => { if (!e.target.matches(':focus')) e.target.style.borderColor = 'transparent'; }}
                      onFocus={e => e.target.style.borderColor = C.brass}
                      onBlurCapture={e => e.target.style.borderColor = 'transparent'}
                    />
                    {isLowLoc && <AlertTriangle className="w-2.5 h-2.5 absolute -top-1 -right-1" style={{ color: C.wineLight }} />}
                  </div>
                </div>
              );
            })}
          </div>

          <input
            type="number" step="0.1" defaultValue={p.price}
            onBlur={e => onUpdateField(p.id, 'price', e.target.value)}
            style={{ ...inputStyle, color: C.cream, width: 72 }}
            className="font-mono rounded-lg px-2.5 py-1.5 text-sm text-center hover:border-gray-500 focus:border-gray-300 focus:outline-none"
            onMouseEnter={e => { if (!e.target.matches(':focus')) e.target.style.borderColor = C.line; }}
            onMouseLeave={e => { if (!e.target.matches(':focus')) e.target.style.borderColor = 'transparent'; }}
            onFocus={e => e.target.style.borderColor = C.brass}
            onBlurCapture={e => e.target.style.borderColor = 'transparent'}
          />

          <div className="relative" style={{ width: 80, height: 36 }}>
            <button
              onClick={() => onDelete(p.id)}
              style={{
                background: C.wine, color: C.cream,
                opacity: confirmDeleteId === p.id ? 1 : 0,
                pointerEvents: confirmDeleteId === p.id ? 'auto' : 'none',
                transition: 'opacity 0.2s',
              }}
              className="absolute inset-0 rounded-lg text-xs font-medium"
            >
              ¿Eliminar?
            </button>
            <button
              onClick={() => setConfirmDeleteId(p.id)}
              style={{
                color: C.muted,
                opacity: confirmDeleteId === p.id ? 0 : 1,
                pointerEvents: confirmDeleteId === p.id ? 'none' : 'auto',
                transition: 'opacity 0.2s',
              }}
              className="absolute inset-0 p-1.5 rounded-lg hover:opacity-80 flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {showProductSuppliers === p.id && (
          <ProductSuppliers product={p} suppliers={suppliers} C={C} onSupplierRefresh={onSupplierRefresh} />
        )}
        <button
          onClick={() => setShowProductSuppliers(showProductSuppliers === p.id ? null : p.id)}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg hover:opacity-80"
          style={{ background: C.surfaceLight, color: C.brassLight }}>
          <Truck className="w-3 h-3" />
          Proveedores
          {showProductSuppliers === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>INVENTARIO</h2>
        <button
          onClick={() => setNewProductOpen(!newProductOpen)}
          style={{ background: C.brass, color: C.base }}
          className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Producto
        </button>
      </div>

      <div className="flex items-center gap-2 mb-1 text-xs font-mono" style={{ color: C.muted }}>
        <span>{filteredProducts.length} productos</span>
        <span>·</span>
        <span style={{ color: totalBajo > 0 ? C.wineLight : C.muted }}>{totalBajo} stock bajo</span>
        <span>·</span>
        <span style={{ color: C.brassLight }}>{euros(totalValor)}</span>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <input
          type="text" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar producto..."
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm min-w-[140px]"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm"
        >
          <option value="Todos">Todas categorías</option>
          {catalog.categories.map(cat => {
            const label = typeof cat === 'string' ? cat : cat.name;
            const key = typeof cat === 'string' ? cat : cat.id;
            return <option key={key} value={label}>{label}</option>;
          })}
        </select>
        <button
          onClick={() => setFilterLowOnly(!filterLowOnly)}
          style={{
            background: filterLowOnly ? C.wine : C.surfaceLight,
            color: filterLowOnly ? C.cream : C.muted,
            border: `1px solid ${filterLowOnly ? C.wineLight : C.line}`
          }}
          className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5"
        >
          <Filter className="w-3.5 h-3.5" /> Stock bajo
        </button>
        <button
          onClick={() => setGroupByCat(!groupByCat)}
          style={{
            background: groupByCat ? C.sage : C.surfaceLight,
            color: groupByCat ? '#fff' : C.muted,
            border: `1px solid ${groupByCat ? C.sageLight : C.line}`
          }}
          className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5"
          title="Agrupar por categoría"
        >
          {groupByCat ? <FolderTree className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
          {groupByCat ? 'Agrupado' : 'Lista'}
        </button>
      </div>

      {newProductOpen && (
        <form
          onSubmit={submit}
          style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          <input
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre" style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm col-span-2 sm:col-span-1"
            autoFocus
          />
          <input
            list="categories"
            value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            placeholder="Categoría" style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm"
          />
          <datalist id="categories">
            {catalog.categories.map(cat => {
              const label = typeof cat === 'string' ? cat : cat.name;
              const key = typeof cat === 'string' ? cat : cat.id;
              return <option key={key} value={label} />;
            })}
          </datalist>
          <input
            value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
            type="number" step="0.1" placeholder="Precio €"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm font-mono"
          />
          <input
            value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
            type="number" placeholder="Stock inicial"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            value={form.lowStock} onChange={e => setForm({ ...form, lowStock: e.target.value })}
            type="number" placeholder="Stock mínimo"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm"
          />
          <select
            value={form.ubicacion}
            onChange={e => setForm({ ...form, ubicacion: e.target.value })}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="Bar">Bar</option>
            <option value="Cocina">Cocina</option>
            <option value="Almacén">Almacén</option>
          </select>
          <button
            type="submit"
            style={{ background: C.sage, color: '#fff' }}
            className="rounded-lg py-2.5 text-sm font-medium col-span-2 sm:col-span-3"
          >
            Añadir producto
          </button>
        </form>
      )}

      {groupByCat ? (
        <div className="flex flex-col gap-4">
          {categorias.map(cat => {
            const items = porCategoria[cat];
            const catBajo = items.filter(isLow).length;
            const catValor = items.reduce((s, p) => s + totalStock(p) * p.price, 0);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg" style={{ color: C.brassLight }}>{cat}</p>
                    <span className="text-xs font-mono" style={{ color: C.muted }}>{items.length} uds.</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    {catBajo > 0 && <span style={{ color: C.wineLight }}>{catBajo} bajo{catBajo > 1 ? 's' : ''}</span>}
                    <span style={{ color: C.brassLight }}>{euros(catValor)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map(renderProduct)}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <p style={{ color: C.muted }} className="text-center py-8 text-sm">
              No hay productos que coincidan con el filtro
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredProducts.length === 0 && (
            <p style={{ color: C.muted }} className="text-center py-8 text-sm">
              No hay productos que coincidan con el filtro
            </p>
          )}
          {filteredProducts.map(renderProduct)}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && uploadingProduct) handleUploadImage(uploadingProduct, file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ===== Product Supplier Offers (inline edit per product) =====
function ProductSuppliers({ product, suppliers: externalSuppliers, C, onSupplierRefresh }) {
  const [offers, setOffers] = useState([]);
  const [suppliers, setSuppliers] = useState(externalSuppliers || []);
  const [loading, setLoading] = useState(true);
  const [newOffer, setNewOffer] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { loadOffers(); if (!externalSuppliers || externalSuppliers.length === 0) loadSuppliers(); }, [product.id]);

  async function loadSuppliers() {
    try { const r = await fetch('/api/suppliers'); if (r.ok) setSuppliers(await r.json()); } catch {}
  }

  async function loadOffers() {
    try {
      const r = await fetch(`/api/supplier-catalog?productId=${product.id}`);
      if (r.ok) setOffers(await r.json());
    } catch {}
    setLoading(false);
  }

  async function saveOffer(data) {
    try {
      await fetch('/api/supplier-catalog', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', ...data, productId: product.id }),
      });
      loadOffers();
    } catch {}
  }

  async function deleteOffer(id) {
    try {
      await fetch('/api/supplier-catalog', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id }),
      });
      loadOffers();
    } catch {}
  }

  function startNew() {
    setNewOffer({ supplierId: '', sku: '', price: '', packSize: 1, minOrder: 0, deliveryDays: 0, isPreferred: false });
  }

  const bestOffer = offers.filter(o => o.active).sort((a, b) => a.pricePerUnit - b.pricePerUnit)[0];

  return (
    <div className="w-full pt-2 mt-2" style={{ borderTop: `1px solid ${C.line}` }}>
      <p className="text-[10px] font-medium mb-2 flex items-center gap-2" style={{ color: C.cream }}>
        <Truck className="w-3 h-3" /> Ofertas de proveedores
        {bestOffer && <span className="text-[9px] font-normal" style={{ color: C.sage }}>Mejor: {bestOffer.supplierName} · {bestOffer.pricePerUnit.toFixed(4)}€/ud</span>}
      </p>

      {loading ? (
        <p className="text-[10px]" style={{ color: C.muted }}>Cargando…</p>
      ) : (
        <div className="space-y-1">
          {offers.map(o => (
            <OfferItem key={o.id} offer={o} C={C}
              editing={editingId === o.id}
              onEdit={() => setEditingId(editingId === o.id ? null : o.id)}
              onSave={(data) => { saveOffer(data); setEditingId(null); }}
              onDelete={() => deleteOffer(o.id)}
              suppliers={suppliers} />
          ))}

          {newOffer && (
            <NewOfferForm suppliers={suppliers} C={C}
              onSave={(data) => { saveOffer(data); setNewOffer(null); }}
              onCancel={() => setNewOffer(null)} />
          )}

          {offers.length === 0 && !newOffer && (
            <p className="text-[10px]" style={{ color: C.muted }}>Sin ofertas registradas.</p>
          )}

          {!newOffer && (
            <button onClick={startNew}
              className="flex items-center gap-1 text-[10px] mt-1 hover:opacity-80"
              style={{ color: C.brassLight }}>
              <Plus className="w-3 h-3" /> Añadir proveedor
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OfferItem({ offer, editing, C, onEdit, onSave, onDelete, suppliers }) {
  const [form, setForm] = useState({
    id: offer.id, supplierId: offer.supplierId, sku: offer.sku,
    price: offer.price, packSize: offer.packSize, minOrder: offer.minOrder,
    deliveryDays: offer.deliveryDays, isPreferred: offer.isPreferred,
  });

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] p-2 rounded-lg" style={{ background: C.surface }}>
        <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded px-2 py-1 text-[10px] w-28">
          <option value="">Proveedor</option>
          {suppliers.filter(s => s.active).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
          placeholder="SKU" className="w-16 rounded px-2 py-1 text-[10px] text-center"
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="number" step="0.001" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          placeholder="Precio pack" className="w-20 rounded px-2 py-1 text-[10px] text-center"
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
        <span className="text-[9px]" style={{ color: C.muted }}>Pack:</span>
        <input type="number" step="0.01" value={form.packSize} onChange={e => setForm(f => ({ ...f, packSize: e.target.value }))}
          className="w-12 rounded px-2 py-1 text-[10px] text-center"
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
        <label className="flex items-center gap-1 text-[9px]" style={{ color: C.muted }}>
          <input type="checkbox" checked={form.isPreferred}
            onChange={e => setForm(f => ({ ...f, isPreferred: e.target.checked }))} />
          Preferido
        </label>
        {offer.isPreferred && !form.isPreferred && (
          <span className="text-[9px]" style={{ color: C.wineLight }}>No puedes desactivar el preferido sin marcar otro</span>
        )}
        <button onClick={() => onSave(form)} style={{ color: C.sage }}><Check className="w-3 h-3" /></button>
        <button onClick={onEdit} style={{ color: C.muted }}><X className="w-3 h-3" /></button>
        <button onClick={onDelete} style={{ color: C.wineLight }}><Trash2 className="w-3 h-3" /></button>
      </div>
    );
  }

  const ppu = offer.pricePerUnit || (offer.price / (offer.packSize || 1));

  return (
    <div className="flex items-center justify-between text-[10px] py-1 px-2 rounded" style={{ background: C.surface + '80' }}>
      <div className="flex items-center gap-2">
        <span className="font-medium" style={{ color: C.cream }}>{offer.supplierName}</span>
        {offer.isPreferred && (
          <span className="text-[8px] px-1 py-px rounded font-bold" style={{ background: C.sage + '30', color: C.sage }}>★ Preferido</span>
        )}
        <span className="text-[9px]" style={{ color: C.muted }}>SKU: {offer.sku || '—'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: C.brassLight }}>{ppu.toFixed(4)}€/ud</span>
        <span className="text-[9px]" style={{ color: C.muted }}>({offer.price.toFixed(2)}€ × pack {offer.packSize})</span>
        {offer.trend !== null && (
          <span className="text-[9px] font-medium" style={{ color: offer.trend >= 0 ? C.wineLight : C.sage }}>
            {offer.trend >= 0 ? '▲' : '▼'} {Math.abs(offer.trend).toFixed(1)}%
          </span>
        )}
        <button onClick={onEdit} style={{ color: C.muted }} className="hover:opacity-80">✎</button>
      </div>
    </div>
  );
}

function NewOfferForm({ suppliers, C, onSave, onCancel }) {
  const [form, setForm] = useState({ supplierId: '', sku: '', price: '', packSize: 1, minOrder: 0, deliveryDays: 0, isPreferred: false });

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] p-2 rounded-lg" style={{ background: C.surface }}>
      <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
        className="rounded px-2 py-1 text-[10px] w-28">
        <option value="">Proveedor</option>
        {suppliers.filter(s => s.active).map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
        placeholder="SKU" className="w-16 rounded px-2 py-1 text-[10px] text-center"
        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
      <input type="number" step="0.001" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
        placeholder="Precio pack" className="w-20 rounded px-2 py-1 text-[10px] text-center"
        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
      <span style={{ color: C.muted }}>Pack:</span>
      <input type="number" step="0.01" value={form.packSize} onChange={e => setForm(f => ({ ...f, packSize: e.target.value }))}
        className="w-12 rounded px-2 py-1 text-[10px] text-center"
        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
      <label className="flex items-center gap-1 text-[9px]" style={{ color: C.muted }}>
        <input type="checkbox" checked={form.isPreferred}
          onChange={e => setForm(f => ({ ...f, isPreferred: e.target.checked }))} />
        Preferido
      </label>
      <button onClick={() => onSave(form)} disabled={!form.supplierId || !form.price}
        style={{ color: C.sage, opacity: (!form.supplierId || !form.price) ? 0.4 : 1 }}>
        <Check className="w-3 h-3" />
      </button>
      <button onClick={onCancel} style={{ color: C.wineLight }}><X className="w-3 h-3" /></button>
    </div>
  );
}
