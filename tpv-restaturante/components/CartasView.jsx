"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Trash2, Save, Printer, Camera,
  Check, X, Upload, Download, GripVertical,
  Search, Copy, Star, Loader2,
} from 'lucide-react';
import { euros, ALLERGENS, ALLERGEN_COLORS, COURSES } from './constants';

const PRINTER_ZONES = ['', 'Cocina', 'Barra', 'Cockteleria'];

function generateId() { return 'p_' + Date.now() + Math.random().toString(16).slice(2, 6); }

function normalize(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

export default function CartasView({ catalog, onSave, colors: C }) {
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(catalog)));
  const [activeTab, setActiveTab] = useState('categorias');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showNoImage, setShowNoImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickCat, setQuickCat] = useState('');
  const fileInputRef = useRef(null);
  const importRef = useRef(null);

  const sinImagen = useMemo(() => local.products.filter(p => !p.image).length, [local]);

  const visibleProducts = useMemo(() => {
    if (!showNoImage) return local.products;
    return local.products.filter(p => !p.image);
  }, [local.products, showNoImage]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return visibleProducts;
    const q = normalize(searchQuery);
    return visibleProducts.filter(p => normalize(p.name).includes(q) || normalize(p.category).includes(q));
  }, [visibleProducts, searchQuery]);

  const duplicates = useMemo(() => {
    const groups = {};
    for (const p of local.products) {
      const key = normalize(p.name).slice(0, 8);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return Object.values(groups).filter(g => g.length > 1);
  }, [local.products]);

  function updateCategory(idx, field, value) {
    const next = { ...local };
    if (!next.categories[idx]) return;
    next.categories[idx] = { ...next.categories[idx], [field]: value };
    setLocal(next);
  }

  function updateProduct(pid, field, value) {
    const next = { ...local };
    const p = next.products.find(pr => pr.id === pid);
    if (p) p[field] = value;
    setLocal(next);
  }

  function addQuickProduct() {
    if (!quickName || !quickPrice) return;
    const cat = quickCat || local.categories[0]?.name || 'General';
    const next = { ...local };
    next.products.push({
      id: generateId(), name: quickName, category: cat,
      price: parseFloat(quickPrice), ubicacion: 'Cocina', course: '',
      image: null, allergens: [], description: '', featured: false,
      active: true, show_tpv: true, show_qr: true, agotado: false,
      type: '', inventariable: false,
    });
    setLocal(next);
    setQuickName(''); setQuickPrice(''); setQuickCat('');
  }

  function deleteProduct(pid) {
    const next = { ...local };
    next.products = next.products.filter(p => p.id !== pid);
    setLocal(next);
  }

  function addCategory() {
    const next = { ...local };
    const name = `Categoría ${next.categories.length + 1}`;
    next.categories.push({ id: 'cat_' + Date.now(), name, sort_order: next.categories.length, active: true, printer_zone: '', show_qr: true });
    setLocal(next);
  }

  function handleSave() {
    onSave(local);
  }

  function handleExportCsv() {
    const header = 'id,nombre,precio,categoria,activo,tpv,qr,agotado,descripcion';
    const rows = local.products.map(p =>
      [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        (p.price || 0).toFixed(2),
        `"${(p.category || '').replace(/"/g, '""')}"`,
        p.active !== false ? '1' : '0',
        p.show_tpv !== false ? '1' : '0',
        p.show_qr !== false ? '1' : '0',
        p.agotado ? '1' : '0',
        `"${(p.description || '').replace(/"/g, '""')}"`,
      ].join(',')
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + '\n' + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'carta.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(file) {
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    if (lines.length < 2) return;
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idIdx = header.indexOf('id');
    const nameIdx = header.indexOf('nombre');
    const priceIdx = header.indexOf('precio');
    const catIdx = header.indexOf('categoria');
    const activeIdx = header.indexOf('activo');
    const tpvIdx = header.indexOf('tpv');
    const qrIdx = header.indexOf('qr');
    const agotadoIdx = header.indexOf('agotado');

    const next = { ...local };
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const id = cols[idIdx];
      const name = cols[nameIdx];
      const price = parseFloat(cols[priceIdx]);
      const category = cols[catIdx];
      if (!id || !name || isNaN(price)) continue;
      const existing = next.products.find(p => p.id === id);
      if (existing) {
        existing.name = name; existing.price = price; existing.category = category;
        existing.active = activeIdx >= 0 ? cols[activeIdx] === '1' : true;
        existing.show_tpv = tpvIdx >= 0 ? cols[tpvIdx] === '1' : true;
        existing.show_qr = qrIdx >= 0 ? cols[qrIdx] === '1' : true;
        existing.agotado = agotadoIdx >= 0 ? cols[agotadoIdx] === '1' : false;
      } else {
        next.products.push({
          id, name, category, price, ubicacion: 'Cocina', course: '',
          image: null, allergens: [], description: '', featured: false,
          active: activeIdx >= 0 ? cols[activeIdx] === '1' : true,
          show_tpv: tpvIdx >= 0 ? cols[tpvIdx] === '1' : true,
          show_qr: qrIdx >= 0 ? cols[qrIdx] === '1' : true,
          agotado: agotadoIdx >= 0 ? cols[agotadoIdx] === '1' : false,
        });
      }
    }
    setLocal(next);
  }

  function toggleAllergen(pid, aid) {
    const p = local.products.find(pr => pr.id === pid);
    if (!p) return;
    const current = p.allergens || [];
    const next = current.includes(aid) ? current.filter(x => x !== aid) : [...current, aid];
    updateProduct(pid, 'allergens', next);
  }

  const Toggle = ({ value, onChange, label, color }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        background: value ? (color || C.sage) : C.surfaceLight,
        color: value ? '#fff' : C.muted,
        border: `1px solid ${value ? (color || C.sageLight) : C.line}`,
      }}
      className="rounded-lg px-2.5 py-1 text-[10px] font-medium flex items-center gap-1 hover:opacity-80 transition-all"
      title={label}
    >
      {value ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>CARTA</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono" style={{ color: C.muted }}>
            {local.products.length} artículos · {local.categories.length} categorías
          </span>
          <button
            onClick={() => setShowNoImage(!showNoImage)}
            style={{
              background: showNoImage ? C.wine : C.surfaceLight,
              color: showNoImage ? C.cream : C.muted,
              border: `1px solid ${C.line}`,
            }}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium flex items-center gap-1"
          >
            <Camera className="w-3 h-3" />
            Sin imagen {sinImagen > 0 && <span className="ml-0.5">({sinImagen})</span>}
          </button>
          <button
            onClick={() => setShowDuplicates(!showDuplicates)}
            style={{
              background: showDuplicates ? C.brass : C.surfaceLight,
              color: showDuplicates ? C.base : C.muted,
              border: `1px solid ${C.line}`,
            }}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            Duplicados {duplicates.length > 0 && <span className="ml-0.5">({duplicates.length})</span>}
          </button>
          <button
            onClick={handleExportCsv}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.muted }}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium flex items-center gap-1 hover:opacity-80"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
          <button
            onClick={() => importRef.current?.click()}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.muted }}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium flex items-center gap-1 hover:opacity-80"
          >
            <Upload className="w-3 h-3" /> Importar
          </button>
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportCsv(f); e.target.value = ''; }} />
          <button
            onClick={handleSave}
            style={{ background: C.sage, color: '#fff' }}
            className="rounded-lg px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:opacity-90"
          >
            <Save className="w-3.5 h-3.5" /> Guardar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['categorias', 'modificadores'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? C.brass : C.surfaceLight,
              color: activeTab === tab ? C.base : C.muted,
              border: `1px solid ${activeTab === tab ? C.brassLight : C.line}`,
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            {tab === 'categorias' ? 'Categorías y artículos' : 'Modificadores'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.muted }} />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar artículos..."
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: 32 }}
            className="w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {activeTab === 'modificadores' ? (
        <ModificadoresTab colors={C} />
      ) : (
        <>
          {/* Duplicates Panel */}
          {showDuplicates && duplicates.length > 0 && (
            <div className="mb-4 p-4 rounded-xl" style={{ background: C.wine + '20', border: `1px solid ${C.wine}` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.wineLight }}>
                Posibles duplicados ({duplicates.length} grupos)
              </p>
              {duplicates.map((group, gi) => (
                <div key={gi} className="mb-2 last:mb-0">
                  <div className="flex flex-wrap gap-2">
                    {group.map(p => (
                      <div key={p.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                        <span className="text-xs font-medium">{p.name}</span>
                        <span className="text-[10px] font-mono" style={{ color: C.muted }}>{euros(p.price)}</span>
                        <span className="text-[10px]" style={{ color: C.muted }}>{p.category}</span>
                        <button onClick={() => deleteProduct(p.id)} style={{ color: C.wineLight }} className="p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Add */}
          <div className="flex gap-2 mb-4 items-center">
            <input
              value={quickName} onChange={e => setQuickName(e.target.value)}
              placeholder="Nombre del plato"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              onKeyDown={e => e.key === 'Enter' && addQuickProduct()}
            />
            <input
              value={quickPrice} onChange={e => setQuickPrice(e.target.value)}
              type="number" step="0.1" placeholder="Precio"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, width: 80 }}
              className="rounded-lg px-3 py-2 text-sm font-mono"
              onKeyDown={e => e.key === 'Enter' && addQuickProduct()}
            />
            <input
              value={quickCat} onChange={e => setQuickCat(e.target.value)}
              placeholder="Categoría"
              list="cats"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, width: 120 }}
              className="rounded-lg px-3 py-2 text-sm"
              onKeyDown={e => e.key === 'Enter' && addQuickProduct()}
            />
            <datalist id="cats">
              {local.categories.map(c => <option key={c.id || c.name} value={c.name} />)}
            </datalist>
            <button
              onClick={addQuickProduct}
              style={{ background: C.sage, color: '#fff' }}
              className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1 hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir
            </button>
          </div>

          {/* Category List */}
          {local.categories.map((cat, ci) => {
            const catProducts = filteredProducts.filter(p => p.category === cat.name);
            return (
              <div key={cat.id || ci} className="mb-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
                {/* Category Header */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: C.surface }}>
                  <GripVertical className="w-4 h-4" style={{ color: C.muted, cursor: 'grab' }} />
                  <input
                    value={cat.name}
                    onChange={e => updateCategory(ci, 'name', e.target.value)}
                    style={{ background: 'transparent', color: C.cream, fontWeight: 600 }}
                    className="text-sm flex-1 border-0 outline-none"
                  />
                  <button
                    onClick={() => {
                      const zones = PRINTER_ZONES;
                      const currentIdx = zones.indexOf(cat.printer_zone);
                      updateCategory(ci, 'printer_zone', zones[(currentIdx + 1) % zones.length]);
                    }}
                    style={{ color: cat.printer_zone ? C.sageLight : C.muted }}
                    className="p-1 rounded-lg hover:opacity-80 text-[10px] flex items-center gap-1"
                    title={`Impresora: ${cat.printer_zone || 'Sin impresora'}`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {cat.printer_zone && <span className="hidden sm:inline">{cat.printer_zone}</span>}
                  </button>
                  <Toggle
                    value={cat.show_qr !== false}
                    onChange={v => updateCategory(ci, 'show_qr', v)}
                    label="QR"
                    color={C.brassLight}
                  />
                  <Toggle
                    value={cat.active !== false}
                    onChange={v => updateCategory(ci, 'active', v)}
                    label="Activa"
                    color={C.sageLight}
                  />
                  <button onClick={() => setEditingCategory(ci)} style={{ color: C.muted }} className="p-1 hover:opacity-80">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Products */}
                {catProducts.length > 0 && (
                  <div>
                    {catProducts.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-2 border-t"
                        style={{ borderColor: C.line, background: p.active === false ? C.surfaceLight + '80' : 'transparent', opacity: p.active === false ? 0.6 : 1 }}
                      >
                        {/* Image */}
                        <div className="relative shrink-0">
                          {p.image ? (
                            <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px]" style={{ background: C.surface, color: C.muted }}>
                              ?
                            </div>
                          )}
                          <button
                            onClick={() => { setEditingProduct(p.id); setTimeout(() => fileInputRef.current?.click(), 100); }}
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                            style={{ background: C.surface, border: `1px solid ${C.line}` }}
                          >
                            <Camera className="w-2 h-2" style={{ color: C.muted }} />
                          </button>
                        </div>

                        {/* Name & Price */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-sm font-medium truncate cursor-pointer hover:brightness-125"
                              onClick={() => setEditingProduct(p.id)}
                            >
                              {p.name}
                            </span>
                            {p.featured && <Star className="w-3 h-3" style={{ color: C.brassLight }} fill={C.brassLight} />}
                          </div>
                          <span className="font-mono text-xs" style={{ color: C.brassLight }}>
                            {euros(p.price)}
                          </span>
                          <div className="flex gap-0.5 mt-0.5 flex-wrap">
                            {ALLERGENS.map(a => {
                              const active = p.allergens?.includes(a.id);
                              return (
                                <button
                                  key={a.id}
                                  onClick={() => toggleAllergen(p.id, a.id)}
                                  className="text-[7px] font-bold px-0.5 rounded-sm leading-tight border-0"
                                  style={{
                                    background: active ? ALLERGEN_COLORS[a.id] + '40' : 'transparent',
                                    color: active ? ALLERGEN_COLORS[a.id] : C.muted,
                                    opacity: active ? 1 : 0.35,
                                  }}
                                  title={a.label}
                                >{a.abbr}</button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Price indicator for missing price */}
                        {(!p.price || p.price === 0) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.wine + '30', color: C.wineLight }}>
                            ¡0,00 €!
                          </span>
                        )}

                        {/* Toggles */}
                        <div className="flex items-center gap-1">
                          <Toggle
                            value={p.show_tpv !== false}
                            onChange={v => updateProduct(p.id, 'show_tpv', v)}
                            label="TPV"
                            color={C.brassLight}
                          />
                          <Toggle
                            value={p.show_qr !== false}
                            onChange={v => updateProduct(p.id, 'show_qr', v)}
                            label="QR"
                            color={C.brassLight}
                          />
                          <Toggle
                            value={p.agotado === true}
                            onChange={v => updateProduct(p.id, 'agotado', v)}
                            label="Agotado"
                            color={C.wineLight}
                          />
                          <Toggle
                            value={p.active !== false}
                            onChange={v => updateProduct(p.id, 'active', v)}
                            label="Activo"
                            color={C.sageLight}
                          />
                        </div>

                        {/* Duplicate indicator */}
                        {duplicates.some(g => g.some(dp => dp.id === p.id) && g.length > 1) && (
                          <Copy className="w-3 h-3" style={{ color: C.wineLight }} />
                        )}

                        {/* Edit & Delete */}
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setEditingProduct(p.id)} style={{ color: C.muted }} className="p-1 hover:opacity-80">
                            <Search className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} style={{ color: C.wineLight }} className="p-1 hover:opacity-80">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {catProducts.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs border-t" style={{ borderColor: C.line, color: C.muted }}>
                    No hay artículos en esta categoría
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Category */}
          <button
            onClick={addCategory}
            style={{ border: `1px dashed ${C.line}`, color: C.muted }}
            className="w-full rounded-xl py-3 text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-80"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir categoría
          </button>
        </>
      )}

      {/* Product Editor Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div className="w-full max-w-lg rounded-xl p-5 fade-up max-h-[90vh] overflow-y-auto" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            {(() => {
              const p = local.products.find(pr => pr.id === editingProduct);
              if (!p) return null;
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-display text-lg" style={{ color: C.cream }}>Editar artículo</p>
                    <button onClick={() => setEditingProduct(null)} style={{ color: C.muted }} className="p-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="col-span-2">
                      <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Nombre</label>
                      <input value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)}
                        style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Precio (€)</label>
                      <input type="number" step="0.1" value={p.price} onChange={e => updateProduct(p.id, 'price', parseFloat(e.target.value) || 0)}
                        style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Categoría</label>
                      <input value={p.category} list="edit-cats" onChange={e => updateProduct(p.id, 'category', e.target.value)}
                        style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" />
                      <datalist id="edit-cats">{local.categories.map(c => <option key={c.id || c.name} value={c.name} />)}</datalist>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Descripción</label>
                      <textarea value={p.description || ''} onChange={e => updateProduct(p.id, 'description', e.target.value)} rows={2}
                        style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Curso</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {['', ...COURSES].map(c => (
                          <button key={c}
                            onClick={() => updateProduct(p.id, 'course', c)}
                            style={{
                              background: p.course === c ? C.brass : C.surfaceLight,
                              color: p.course === c ? C.base : C.muted,
                            }}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
                          >
                            {c || 'Sin curso'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>
                        Alérgenos <span style={{ color: C.wineLight }}>(contiene)</span>
                      </label>
                      <div className="flex gap-1.5 flex-wrap">
                        {ALLERGENS.map(a => {
                          const active = p.allergens?.includes(a.id);
                          return (
                            <button key={a.id}
                              onClick={() => toggleAllergen(p.id, a.id)}
                              style={{
                                background: active ? ALLERGEN_COLORS[a.id] + '40' : C.surfaceLight,
                                color: active ? ALLERGEN_COLORS[a.id] : C.muted,
                                border: `1px solid ${active ? ALLERGEN_COLORS[a.id] : 'transparent'}`,
                              }}
                              className="rounded-lg px-2.5 py-1 text-xs font-medium"
                            >{a.abbr} {a.label}</button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={p.featured || false}
                          onChange={e => updateProduct(p.id, 'featured', e.target.checked)}
                          className="w-4 h-4" />
                        <span className="text-sm" style={{ color: C.cream }}>Plato destacado</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Tipo</label>
                      <select value={p.type || ''} onChange={e => updateProduct(p.id, 'type', e.target.value)}
                        style={{ background: C.surfaceLight, color: C.cream }}
                        className="w-full rounded-lg px-3 py-2 text-sm">
                        <option value="">— Ninguno —</option>
                        <option value="raw_material">Materia prima</option>
                        <option value="elaborado">Elaborado</option>
                        <option value="semi_elaborado">Semi elaborado</option>
                        <option value="consumible">Consumible</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 h-full" style={{ paddingTop: '1.2rem' }}>
                        <input type="checkbox" checked={p.inventariable || false}
                          onChange={e => updateProduct(p.id, 'inventariable', e.target.checked)}
                          className="w-4 h-4" />
                        <span className="text-sm" style={{ color: C.cream }}>Inventariable</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { onSave(local); setEditingProduct(null); }}
                      style={{ background: C.sage, color: '#fff' }}
                      className="flex-1 rounded-lg py-2 text-sm font-semibold">Guardar</button>
                    <button onClick={() => setEditingProduct(null)}
                      style={{ background: C.surfaceLight, color: C.muted }}
                      className="flex-1 rounded-lg py-2 text-sm">Cerrar</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0];
          if (!file || !editingProduct) return;
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.url) updateProduct(editingProduct, 'image', data.url);
          setEditingProduct(null);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function ModificadoresTab({ colors: C }) {
  const [groups, setGroups] = useState([]);
  const [productMods, setProductMods] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [showProductMap, setShowProductMap] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [modData, catData] = await Promise.all([
        fetch('/api/modifiers').then(r => r.json()),
        fetch('/api/catalog').then(r => r.json()),
      ]);
      if (modData) { setGroups(modData.groups || []); setProductMods(modData.productModifiers || {}); }
      if (catData) setProducts(catData.products || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const r = await fetch('/api/modifiers', {
        method: 'PUT',
        body: JSON.stringify({ groups, productModifiers: productMods }),
      });
      const data = await r.json();
      if (data.warnings) {
        setError(data.warnings.join('\n'));
      } else if (data.ok) {
        await load();
      } else {
        setError(data.error || 'Error al guardar');
      }
    } catch { setError('Error de conexión'); }
    setSaving(false);
  };

  const addGroup = () => {
    const id = 'mg_' + Date.now();
    setGroups(prev => [...prev, { id, name: 'Nuevo grupo', type: 'single', required: false, options: [] }]);
    setEditingGroup(id);
  };

  const updateGroup = (id, key, val) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, [key]: val } : g));
  };

  const deleteGroup = (id) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    const next = { ...productMods };
    for (const pid of Object.keys(next)) {
      next[pid] = next[pid].filter(gid => gid !== id);
    }
    setProductMods(next);
  };

  const addOption = (groupId) => {
    const id = 'mo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 4);
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, options: [...(g.options || []), { id, name: 'Nueva opción', priceDelta: 0, isDefault: false, stockDeduct: false, stockArticleId: '', stockQuantity: 0, sortOrder: (g.options?.length || 0) }] };
    }));
  };

  const updateOption = (groupId, optId, key, val) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, options: g.options.map(o => o.id === optId ? { ...o, [key]: val } : o) };
    }));
  };

  const deleteOption = (groupId, optId) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, options: g.options.filter(o => o.id !== optId) };
    }));
  };

  const toggleProductMod = (productId, groupId) => {
    setProductMods(prev => {
      const next = { ...prev };
      const list = [...(next[productId] || [])];
      const idx = list.indexOf(groupId);
      if (idx >= 0) list.splice(idx, 1); else list.push(groupId);
      next[productId] = list;
      return next;
    });
  };

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: C.muted }}>{groups.length} grupo{groups.length !== 1 ? 's' : ''} de modificadores</p>
        <div className="flex gap-2">
          <button onClick={() => setShowProductMap(!showProductMap)}
            style={{ background: C.surfaceLight, color: C.muted }}
            className="px-3 py-1.5 rounded-lg text-xs hover:opacity-80">
            {showProductMap ? 'Ocultar asignaciones' : 'Asignar a platos'}
          </button>
          <button onClick={addGroup}
            style={{ background: C.brass, color: C.base }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80">
            <Plus className="w-3.5 h-3.5 inline mr-1" />Nuevo grupo
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: C.wine + '30', border: `1px solid ${C.wineLight}` }} className="rounded-lg p-3 whitespace-pre-wrap text-xs">
          {error}
        </div>
      )}

      {/* Grupo list */}
      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.id} style={{ border: `1px solid ${C.line}`, background: C.surface }} className="rounded-xl overflow-hidden">
            {/* Group header */}
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: C.surfaceLight }}>
              <input value={g.name} onChange={e => updateGroup(g.id, 'name', e.target.value)}
                style={{ background: 'transparent', color: C.cream, fontWeight: 600 }}
                className="text-sm flex-1 border-0 outline-none" />
              <select value={g.type} onChange={e => updateGroup(g.id, 'type', e.target.value)}
                style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                className="rounded-lg px-2 py-1 text-xs">
                <option value="single">Única</option>
                <option value="multiple">Múltiple</option>
              </select>
              <Toggle value={g.required} onChange={v => updateGroup(g.id, 'required', v)} label="Obligatorio" color={C.brassLight} />
              <button onClick={() => deleteGroup(g.id)} style={{ color: C.wineLight }} className="p-1 hover:opacity-80">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Options */}
            <div className="p-3 space-y-2">
              {(g.options || []).map(o => (
                <div key={o.id} style={{ background: C.surfaceLight }} className="rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input value={o.name} onChange={e => updateOption(g.id, o.id, 'name', e.target.value)}
                      style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}`, flex: 1 }}
                      className="rounded-lg px-2 py-1 text-xs" />
                    <input type="number" step="0.5" value={o.priceDelta || 0}
                      onChange={e => updateOption(g.id, o.id, 'priceDelta', Number(e.target.value))}
                      style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}`, width: 70 }}
                      className="rounded-lg px-2 py-1 text-xs font-mono text-right" />
                    <Toggle value={o.isDefault} onChange={v => updateOption(g.id, o.id, 'isDefault', v)} label="Por defecto" color={C.sageLight} />
                    <button onClick={() => deleteOption(g.id, o.id)} style={{ color: C.wineLight }} className="p-1 hover:opacity-80">
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Stock deduction */}
                  <div className="flex items-center gap-2">
                    <Toggle value={!!o.stockDeduct} onChange={v => {
                      updateOption(g.id, o.id, 'stockDeduct', v);
                    }} label="Descuenta inventario" color={C.sageLight} />
                    {o.stockDeduct && (
                      <>
                        <select value={o.stockArticleId || ''}
                          onChange={e => updateOption(g.id, o.id, 'stockArticleId', e.target.value)}
                          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}`, flex: 1 }}
                          className="rounded-lg px-2 py-1 text-xs">
                          <option value="">Seleccionar artículo...</option>
                          {products.filter(p => p.inventariable || p.type === 'raw_material').map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input type="number" step="0.1" value={o.stockQuantity || 0}
                          onChange={e => updateOption(g.id, o.id, 'stockQuantity', Number(e.target.value))}
                          placeholder="Cant."
                          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}`, width: 60 }}
                          className="rounded-lg px-2 py-1 text-xs font-mono text-right" />
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={() => addOption(g.id)}
                style={{ color: C.sageLight }}
                className="text-xs flex items-center gap-1 hover:opacity-80">
                <Plus className="w-3 h-3" /> Añadir opción
              </button>
            </div>

            {/* Product assignments (inline) */}
            <details className="px-3 pb-2">
              <summary className="text-[10px] cursor-pointer" style={{ color: C.muted }}>Platos asignados ({Object.entries(productMods).filter(([, v]) => v.includes(g.id)).length})</summary>
              <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto">
                {products.filter(p => (productMods[p.id] || []).includes(g.id)).map(p => (
                  <span key={p.id} style={{ background: C.surfaceLight }} className="text-[10px] px-2 py-0.5 rounded-full">{p.name}</span>
                ))}
                {products.filter(p => !(productMods[p.id] || []).includes(g.id)).length > 0 && (
                  <button onClick={() => setShowProductMap(true)} className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: C.sageLight }}>+ Asignar</button>
                )}
              </div>
            </details>
          </div>
        ))}
      </div>

      {/* Save + Discard */}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          style={{ background: C.brass, color: C.base, opacity: saving ? 0.5 : 1 }}
          className="flex-1 rounded-lg py-2.5 text-sm font-bold hover:opacity-80">
          {saving ? 'Guardando...' : 'Guardar modificadores'}
        </button>
        <button onClick={load}
          style={{ background: C.surfaceLight, color: C.muted }}
          className="rounded-lg px-4 py-2.5 text-sm hover:opacity-80">
          Descartar cambios
        </button>
      </div>

      {/* Product assignment modal */}
      {showProductMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center no-print">
          <div onClick={() => setShowProductMap(false)} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, maxWidth: 500, width: '90%', maxHeight: '80vh' }} className="relative rounded-xl p-5 fade-up overflow-y-auto">
            <h3 className="font-display text-base mb-3" style={{ color: C.brassLight }}>Asignar grupos a platos</h3>
            <div className="space-y-1">
              {groups.map(g => (
                <div key={g.id} className="mb-3">
                  <p className="text-xs font-bold mb-1" style={{ color: C.cream }}>{g.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {products.filter(p => p.active !== false).map(p => {
                      const assigned = (productMods[p.id] || []).includes(g.id);
                      return (
                        <button key={p.id} onClick={() => toggleProductMod(p.id, g.id)}
                          style={{
                            background: assigned ? C.brass + '30' : C.surfaceLight,
                            color: assigned ? C.brassLight : C.muted,
                            border: assigned ? `1px solid ${C.brassLight}` : `1px solid ${C.line}`,
                          }}
                          className="text-[10px] px-2 py-1 rounded-lg hover:opacity-80">
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowProductMap(false)}
              style={{ background: C.brass, color: C.base }}
              className="w-full rounded-lg py-2.5 text-sm font-bold mt-3 hover:opacity-80">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
