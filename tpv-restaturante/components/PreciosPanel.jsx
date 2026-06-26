"use client";

import { useState, useMemo } from 'react';
import { Plus, Trash2, Save, X, Tag, Euro, Percent, Clock, CalendarDays, Eye } from 'lucide-react';
import { euros } from './constants';

function id() { return 'pr_' + Date.now() + Math.random().toString(16).slice(2, 6); }

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const TEMPLATES = [
  { label: 'Happy Hour', days: [0,1,2,3,4,5,6], start: '18:00', end: '21:00', type: 'discount_pct', value: 20 },
  { label: 'Menú Almuerzo', days: [0,1,2,3,4], start: '13:00', end: '16:00', type: 'fixed', value: 0 },
  { label: 'Fin de Semana', days: [5,6], start: '12:00', end: '23:00', type: 'discount_eur', value: 1 },
];

function dayList(days) {
  if (!days || days.length === 0) return '-';
  if (days.length === 7) return 'L-D';
  if (days.length === 5 && days.every(d => d < 5)) return 'L-V';
  if (days.length === 2 && days[0] === 5 && days[1] === 6) return 'S-D';
  return days.map(d => DAYS[d]).join('');
}

function effectivePrice(basePrice, rules) {
  const now = new Date();
  const today = (now.getDay() + 6) % 7;
  const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const active = (rules || []).filter(r => r.active && r.days?.includes(today) && time >= r.start_time && time <= r.end_time);
  if (active.length === 0) return { price: basePrice, rule: null };
  const r = active[0];
  if (r.type === 'fixed') return { price: r.value, rule: r };
  if (r.type === 'discount_pct') return { price: round2(basePrice - basePrice * r.value / 100), rule: r };
  if (r.type === 'discount_eur') return { price: Math.max(0, round2(basePrice - r.value)), rule: r };
  return { price: basePrice, rule: null };
}

function round2(v) { return Math.round(v * 100) / 100; }

function RuleEditor({ product, rules, onSave, onClose, colors: C }) {
  const [local, setLocal] = useState(() => rules.filter(r => r.product_id === product.id));
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({ id: '', product_id: product.id, name: '', active: true, days: [0, 1, 2, 3, 4, 5, 6], start_time: '17:00', end_time: '19:00', type: 'discount_pct', value: 0 });

  function emptyRule() {
    return { id: id(), product_id: product.id, name: '', active: true, days: [0, 1, 2, 3, 4, 5, 6], start_time: '17:00', end_time: '19:00', type: 'discount_pct', value: 0 };
  }

  function startAdd() { setForm(emptyRule()); setShowForm(true); setEditId(null); }
  function startEdit(r) { setForm({ ...r }); setShowForm(true); setEditId(r.id); }

  function saveRule() {
    if (!form.name.trim()) return;
    if (editId) {
      setLocal(local.map(r => r.id === editId ? form : r));
    } else {
      setLocal([...local, { ...form, id: id() }]);
    }
    setShowForm(false);
    setEditId(null);
  }

  function deleteRule(id) {
    setLocal(local.filter(r => r.id !== id));
    if (editId === id) { setShowForm(false); setEditId(null); }
  }

  function toggleDay(d) {
    const days = form.days.includes(d) ? form.days.filter(x => x !== d) : [...form.days, d].sort();
    setForm({ ...form, days });
  }

  function applyTemplate(t) {
    setForm({ ...form, days: [...t.days], start_time: t.start, end_time: t.end, type: t.type, value: t.value });
  }

  const basePrice = product.price || 0;
  let previewPrice = basePrice;
  let savings = 0;
  if (form.name.trim() && form.active) {
    if (form.type === 'fixed') { previewPrice = form.value; }
    else if (form.type === 'discount_pct') { previewPrice = round2(basePrice - basePrice * form.value / 100); }
    else if (form.type === 'discount_eur') { previewPrice = Math.max(0, round2(basePrice - (form.value || 0))); }
    savings = round2(basePrice - previewPrice);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.line}` }}
        className="rounded-xl p-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 style={{ color: C.cream }} className="text-lg font-bold">{product.name}</h3>
            <span style={{ color: C.muted }} className="text-xs font-mono">Base: {euros(basePrice)}</span>
          </div>
          <button onClick={onClose} style={{ color: C.muted }} className="p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Active effective price */}
        {(() => {
          const eff = effectivePrice(basePrice, local);
          if (eff.rule) {
            return (
              <div style={{ background: C.sage + '20', border: `1px solid ${C.sage}`, color: C.sageLight }}
                className="rounded-lg px-3 py-2 text-xs mb-4 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" />
                Precio activo ahora: <strong className="font-mono">{euros(eff.price)}</strong>
                <span className="text-[10px]">({eff.rule.name})</span>
              </div>
            );
          }
          return null;
        })()}

        {/* Existing rules */}
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Reglas ({local.length})</p>
        <div className="flex flex-col gap-2 mb-4">
          {local.map(r => {
            const eff = effectivePrice(basePrice, [r]);
            const nowActive = eff.rule !== null;
            return (
              <div key={r.id} onClick={() => startEdit(r)}
                style={{ background: C.surfaceLight, border: `1px solid ${nowActive ? C.sage : C.line}`, cursor: 'pointer' }}
                className="rounded-lg p-3 hover:opacity-90 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: C.cream }} className="text-sm font-medium">{r.name}</span>
                  <div className="flex items-center gap-2">
                    {nowActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: C.sage + '30', color: C.sageLight }}>ACTIVA</span>}
                    <span style={{ color: r.active ? C.sageLight : C.muted }} className="text-[10px]">{r.active ? 'Activa' : 'Inactiva'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: C.muted }}>
                  <span className="flex items-center gap-0.5"><CalendarDays className="w-3 h-3" />{dayList(r.days)}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{r.start_time}-{r.end_time}</span>
                  <span className="flex items-center gap-0.5">
                    {r.type === 'fixed' && <><Euro className="w-3 h-3" />Fijo {euros(r.value)}</>}
                    {r.type === 'discount_pct' && <><Percent className="w-3 h-3" />{r.value}%</>}
                    {r.type === 'discount_eur' && <><Euro className="w-3 h-3" />-{euros(r.value)}</>}
                  </span>
                  <span style={{ color: C.brassLight }} className="font-mono">{euros(eff.price)}</span>
                </div>
              </div>
            );
          })}
          {local.length === 0 && (
            <p style={{ color: C.muted }} className="text-xs italic py-2">Sin reglas. Añade la primera.</p>
          )}
        </div>

        <button onClick={startAdd} style={{ color: C.sageLight, border: `1px dashed ${C.line}` }}
          className="w-full rounded-lg py-2 text-xs font-medium hover:opacity-80 flex items-center justify-center gap-1.5 mb-4">
          <Plus className="w-3.5 h-3.5" /> Añadir regla
        </button>

        {/* Rule form */}
        {showForm && (
          <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre (ej: Happy Hour)"
                style={{ background: C.surface, color: C.cream }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium" />
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: C.muted }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-3.5 h-3.5" />
                Activa
              </label>
            </div>

            {/* Templates */}
            <div className="flex flex-wrap gap-1 mb-3">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => applyTemplate(t)}
                  style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.muted }}
                  className="text-[10px] px-2 py-1 rounded-lg hover:opacity-80">{t.label}</button>
              ))}
            </div>

            {/* Days */}
            <p style={{ color: C.muted }} className="text-[10px] mb-1">Días</p>
            <div className="flex gap-1 mb-3">
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  style={{
                    background: form.days.includes(i) ? C.brass + '30' : C.surface,
                    border: `1px solid ${form.days.includes(i) ? C.brass : C.line}`,
                    color: form.days.includes(i) ? C.cream : C.muted,
                  }}
                  className="w-8 h-8 rounded-lg text-xs font-medium">{d}</button>
              ))}
            </div>

            {/* Time */}
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: C.muted }} className="text-[10px]">Desde</span>
              <input type="time" value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                style={{ background: C.surface, color: C.cream, width: 80 }}
                className="rounded px-2 py-1.5 text-xs font-mono" />
              <span style={{ color: C.muted }} className="text-[10px]">Hasta</span>
              <input type="time" value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
                style={{ background: C.surface, color: C.cream, width: 80 }}
                className="rounded px-2 py-1.5 text-xs font-mono" />
            </div>

            {/* Type & value */}
            <div className="flex items-center gap-2 mb-3">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                className="rounded-lg px-2.5 py-2 text-xs">
                <option value="fixed">Precio fijo</option>
                <option value="discount_pct">Descuento %</option>
                <option value="discount_eur">Descuento €</option>
              </select>
              <div className="flex items-center gap-1">
                {form.type === 'discount_pct' && <Percent className="w-3 h-3" style={{ color: C.muted }} />}
                {form.type !== 'discount_pct' && <Euro className="w-3 h-3" style={{ color: C.muted }} />}
                <input type="number" step="0.1" min="0" value={form.value}
                  onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                  style={{ background: C.surface, color: C.brassLight, width: 80 }}
                  className="rounded-lg px-2 py-1.5 text-xs font-mono text-center" />
              </div>
            </div>

            {/* Preview */}
            {form.name.trim() && (
              <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-lg p-3 mb-3">
                <p style={{ color: C.muted }} className="text-[10px] uppercase tracking-wide mb-1">Vista previa</p>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: C.muted }}>Base</span>
                  <span className="font-mono" style={{ color: C.cream }}>{euros(basePrice)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: C.muted }}>Descuento</span>
                  <span className="font-mono" style={{ color: C.wineLight }}>{savings > 0 ? `-${euros(savings)}` : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold mt-1 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
                  <span style={{ color: C.sageLight }}>Resultado</span>
                  <span className="font-mono" style={{ color: C.brassLight }}>{euros(previewPrice)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                style={{ border: `1px solid ${C.line}`, color: C.muted }}
                className="flex-1 rounded-lg py-2 text-xs font-medium">Cancelar</button>
              <button onClick={saveRule}
                style={{ background: C.sage, color: '#fff' }}
                className="flex-1 rounded-lg py-2 text-xs font-bold">Guardar regla</button>
              {editId && (
                <button onClick={() => deleteRule(editId)} style={{ background: C.wine, color: '#fff' }}
                  className="rounded-lg py-2 px-3 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          </div>
        )}

        {/* Save all */}
        <button onClick={() => onSave(local)}
          style={{ background: C.brass, color: C.base, opacity: showForm ? 0.4 : 1 }}
          disabled={showForm}
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:cursor-not-allowed">
          <Save className="w-4 h-4 inline mr-1.5" /> Guardar todas las reglas
        </button>
      </div>
    </div>
  );
}

export default function PreciosPanel({ catalog, priceRules, onSaveRules, colors: C }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'has_rules' | 'active_now'
  const [editingProduct, setEditingProduct] = useState(null);
  const [rulesMap, setRulesMap] = useState(() => {
    const m = {};
    for (const r of (priceRules || [])) {
      if (!m[r.product_id]) m[r.product_id] = [];
      m[r.product_id].push(r);
    }
    return m;
  });

  const { filtered, totalCount, rulesCount } = useMemo(() => {
    const allProducts = catalog?.products || [];
    const mapped = allProducts.map(p => {
      const rules = rulesMap[p.id] || [];
      const eff = effectivePrice(p.price, rules);
      return { ...p, rules, effPrice: eff.price, activeRule: eff.rule };
    });
    return {
      totalCount: mapped.length,
      rulesCount: mapped.filter(p => p.rules.length > 0).length,
      filtered: mapped.filter(p => {
        if (filter === 'all') return true;
        if (filter === 'has_rules') return p.rules.length > 0;
        if (filter === 'active_now') return p.activeRule !== null;
        return true;
      }),
    };
  }, [catalog?.products, rulesMap, filter]);

  function handleSaveRules(productId, newRules) {
    setRulesMap(prev => ({ ...prev, [productId]: newRules }));
    const all = [];
    for (const [, rs] of Object.entries({ ...rulesMap, [productId]: newRules })) {
      for (const r of rs) all.push(r);
    }
    onSaveRules(all);
    setEditingProduct(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>PRECIOS PROGRAMADOS</h2>
        <div className="flex gap-2">
          {[
            { id: 'all', label: `Todos (${totalCount})` },
            { id: 'has_rules', label: `Con reglas (${rulesCount})` },
            { id: 'active_now', label: `Activo ahora (${filtered.filter(p => p.activeRule).length})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? C.brass : C.surfaceLight,
                color: filter === f.id ? C.base : C.muted,
                border: filter === f.id ? 'none' : `1px solid ${C.line}`,
              }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap">{f.label}</button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="flex flex-col gap-1">
        {filtered.map(p => (
          <div key={p.id} onClick={() => setEditingProduct(p)}
            style={{ background: p.activeRule ? C.sage + '10' : C.surface, border: `1px solid ${p.activeRule ? C.sage : C.line}`, cursor: 'pointer' }}
            className="rounded-lg p-3 hover:opacity-90 transition-all flex items-center gap-3">
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ color: C.cream }} className="text-sm font-medium truncate">{p.name}</span>
                <span style={{ color: C.muted }} className="text-[10px]">{p.category}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] mt-1" style={{ color: C.muted }}>
                <span className="font-mono">Base: {euros(p.price)}</span>
                {p.effPrice !== p.price && (
                  <span style={{ color: C.sageLight }} className="font-mono font-bold">
                    → {euros(p.effPrice)}
                    {p.activeRule?.type === 'discount_pct' && ` (${p.activeRule.value}%)`}
                    {p.activeRule?.type === 'discount_eur' && ` (-${euros(p.activeRule.value)})`}
                  </span>
                )}
              </div>
              {p.rules.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.rules.map(r => {
                    const nowActive = p.activeRule?.id === r.id;
                    return (
                      <span key={r.id} style={{
                        background: nowActive ? C.brass + '30' : C.surfaceLight,
                        border: `1px solid ${nowActive ? C.brass : C.line}`,
                        color: nowActive ? C.cream : C.muted,
                      }}
                        className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {r.name}
                        <span className="font-mono">
                          {r.type === 'fixed' && euros(r.value)}
                          {r.type === 'discount_pct' && `${r.value}%`}
                          {r.type === 'discount_eur' && `-${euros(r.value)}`}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Right: quick status */}
            <div className="text-right shrink-0">
              {p.activeRule ? (
                <span style={{ color: C.sageLight }} className="text-[10px] font-mono font-bold block">{euros(p.effPrice)}</span>
              ) : (
                <span style={{ color: C.muted }} className="font-mono text-xs">{euros(p.price)}</span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: C.muted }} className="text-sm text-center py-8">No hay artículos con este filtro.</p>
        )}
      </div>

      {editingProduct && (
        <RuleEditor
          product={editingProduct}
          rules={rulesMap[editingProduct.id] || []}
          onSave={(newRules) => handleSaveRules(editingProduct.id, newRules)}
          onClose={() => setEditingProduct(null)}
          colors={C}
        />
      )}
    </div>
  );
}
