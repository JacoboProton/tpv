"use client";

import { useState } from 'react';
import { Plus, Trash2, Save, GripVertical, Tag, Percent } from 'lucide-react';
import { euros } from './constants';

function id() { return 'x_' + Date.now() + Math.random().toString(16).slice(2, 6); }

function emptySlot() {
  return { id: id(), name: '', minChoices: 1, maxChoices: 1, items: [] };
}

function emptyCombo() {
  return { id: id(), name: '', description: '', price: 0, image: '', active: true, discountPct: 0, slots: [] };
}

export default function CombosPanel({ combos, catalog, onSave, colors: C }) {
  const [local, setLocal] = useState(() => combos.length > 0 ? combos : []);

  function updateCombo(ci, field, value) {
    const next = [...local];
    next[ci] = { ...next[ci], [field]: value };
    setLocal(next);
  }

  function updateSlot(ci, si, field, value) {
    const next = [...local];
    next[ci].slots[si] = { ...next[ci].slots[si], [field]: value };
    setLocal(next);
  }

  function updateSlotItem(ci, si, ii, field, value) {
    const next = [...local];
    next[ci].slots[si].items[ii] = { ...next[ci].slots[si].items[ii], [field]: value };
    setLocal(next);
  }

  function addCombo() { setLocal([...local, emptyCombo()]); }
  function removeCombo(ci) { setLocal(local.filter((_, i) => i !== ci)); }

  function addSlot(ci) {
    const next = [...local];
    next[ci].slots = [...(next[ci].slots || []), emptySlot()];
    setLocal(next);
  }
  function removeSlot(ci, si) {
    const next = [...local];
    next[ci].slots = next[ci].slots.filter((_, i) => i !== si);
    setLocal(next);
  }

  function addSlotItem(ci, si) {
    const next = [...local];
    next[ci].slots[si].items = [...(next[ci].slots[si].items || []), { id: id(), slot_id: next[ci].slots[si].id, product_id: '', surcharge: 0 }];
    setLocal(next);
  }
  function removeSlotItem(ci, si, ii) {
    const next = [...local];
    next[ci].slots[si].items = next[ci].slots[si].items.filter((_, i) => i !== ii);
    setLocal(next);
  }

  function totalIndividual(c) {
    if (!c.slots) return 0;
    let min = 0, max = 0;
    for (const slot of c.slots) {
      if (!slot.items) continue;
      const prices = slot.items.map(item => {
        const p = catalog.products.find(pr => pr.id === item.product_id);
        return p ? p.price + (item.surcharge || 0) : 0;
      }).filter(Boolean);
      if (prices.length === 0) continue;
      prices.sort((a, b) => a - b);
      min += prices.slice(0, slot.minChoices || 1).reduce((s, v) => s + v, 0);
      max += prices.slice(0, slot.maxChoices || 1).reduce((s, v) => s + v, 0);
    }
    return { min, max };
  }

  const allProducts = catalog.products || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>COMBOS</h2>
        <div className="flex gap-2">
          <button onClick={addCombo}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
            className="text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 hover:opacity-80">
            <Plus className="w-4 h-4" /> Crear combo
          </button>
          <button onClick={() => onSave(local)}
            style={{ background: C.sage, color: '#fff' }}
            className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90">
            <Save className="w-4 h-4 inline mr-1" /> Guardar
          </button>
        </div>
      </div>

      {local.length === 0 && (
        <p style={{ color: C.muted }} className="text-sm text-center py-8">
          No hay combos. Crea tu primer combo con slots que el cliente pueda elegir.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {local.map((c, ci) => {
          const ind = totalIndividual(c);
          const savings = ind.min > 0 && c.price > 0 ? ind.min - c.price : 0;
          return (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
              {/* Combo header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 mr-3">
                  <input value={c.name} onChange={e => updateCombo(ci, 'name', e.target.value)}
                    placeholder="Nombre del combo"
                    style={{ background: C.surfaceLight, color: C.cream }}
                    className="rounded-lg px-3 py-2 text-sm font-medium" />
                  <input type="number" step="0.1" min="0" value={c.price}
                    onChange={e => updateCombo(ci, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="Precio €"
                    style={{ background: C.surfaceLight, color: C.brassLight }}
                    className="rounded-lg px-3 py-2 text-sm font-mono" />
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4" style={{ color: C.muted }} />
                    <input type="number" min="0" max="100" step="0.1" value={c.discountPct || 0}
                      onChange={e => updateCombo(ci, 'discountPct', parseFloat(e.target.value) || 0)}
                      placeholder="Dto. %"
                      style={{ background: C.surfaceLight, color: C.cream, width: 72 }}
                      className="rounded-lg px-2 py-2 text-sm font-mono" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={c.active !== false}
                      onChange={e => updateCombo(ci, 'active', e.target.checked)}
                      className="w-4 h-4" />
                    <span style={{ color: c.active !== false ? C.sageLight : C.muted }} className="text-sm">Activo</span>
                  </label>
                </div>
                <button onClick={() => removeCombo(ci)} style={{ color: C.wineLight }} className="p-1.5 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Savings indicator */}
              {savings > 0 && (
                <div className="flex items-center gap-2 mb-3 text-xs font-mono">
                  <Tag className="w-3 h-3" style={{ color: C.sageLight }} />
                  <span style={{ color: C.muted }}>Precio individual desde: {euros(ind.min)}</span>
                  <span style={{ color: C.sageLight }}>Ahorro: {euros(savings)} ({Math.round((savings / ind.min) * 100)}%)</span>
                </div>
              )}

              <textarea value={c.description || ''} onChange={e => updateCombo(ci, 'description', e.target.value)}
                placeholder="Descripción del combo"
                rows={2} style={{ background: C.surfaceLight, color: C.cream }}
                className="w-full rounded-lg px-3 py-2 text-sm mb-3" />

              {/* Slots */}
              <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">
                Slots — pasos que el cliente elige
              </p>
              <div className="flex flex-col gap-3">
                {(c.slots || []).map((slot, si) => (
                  <div key={slot.id} style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-3.5 h-3.5" style={{ color: C.muted }} />
                      <input value={slot.name} onChange={e => updateSlot(ci, si, 'name', e.target.value)}
                        placeholder="Nombre del slot (ej: Principal, Bebida)"
                        style={{ background: C.surface, color: C.cream }}
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-sm font-medium" />
                      <div className="flex items-center gap-1 text-xs">
                        <span style={{ color: C.muted }}>Min</span>
                        <input type="number" min="0" max="99" value={slot.minChoices ?? 1}
                          onChange={e => updateSlot(ci, si, 'minChoices', parseInt(e.target.value) || 0)}
                          style={{ background: C.surface, color: C.cream, width: 44 }}
                          className="rounded-lg px-1.5 py-1 text-xs font-mono text-center" />
                        <span style={{ color: C.muted }}>Max</span>
                        <input type="number" min="0" max="99" value={slot.maxChoices ?? 1}
                          onChange={e => updateSlot(ci, si, 'maxChoices', parseInt(e.target.value) || 1)}
                          style={{ background: C.surface, color: C.cream, width: 44 }}
                          className="rounded-lg px-1.5 py-1 text-xs font-mono text-center" />
                      </div>
                      <button onClick={() => removeSlot(ci, si)} style={{ color: C.wineLight }} className="p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Slot items */}
                    <div className="flex flex-col gap-1.5">
                      {(slot.items || []).map((item, ii) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <select value={item.product_id}
                            onChange={e => updateSlotItem(ci, si, ii, 'product_id', e.target.value)}
                            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                            className="flex-1 rounded-lg px-2.5 py-1.5 text-sm">
                            <option value="">Seleccionar producto...</option>
                            {allProducts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({euros(p.price)})
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <span style={{ color: C.muted }} className="text-[10px]">+€</span>
                            <input type="number" step="0.1" min="0" value={item.surcharge ?? 0}
                              onChange={e => updateSlotItem(ci, si, ii, 'surcharge', parseFloat(e.target.value) || 0)}
                              style={{ background: C.surface, color: C.brassLight, width: 60 }}
                              className="rounded-lg px-1.5 py-1.5 text-xs font-mono text-center"
                              placeholder="0.00" />
                          </div>
                          <button onClick={() => removeSlotItem(ci, si, ii)} style={{ color: C.wineLight }} className="p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addSlotItem(ci, si)}
                        style={{ color: C.sageLight, border: `1px dashed ${C.line}` }}
                        className="rounded-lg py-1.5 text-[11px] font-medium hover:opacity-80 flex items-center justify-center gap-1">
                        <Plus className="w-3 h-3" /> Añadir artículo a este slot
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addSlot(ci)}
                  style={{ color: C.brassLight, border: `1px dashed ${C.brass}40` }}
                  className="rounded-lg py-2 text-xs font-medium hover:opacity-80 flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Añadir slot
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
