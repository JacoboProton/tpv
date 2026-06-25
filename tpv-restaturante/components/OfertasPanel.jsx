"use client";

import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

export default function OfertasPanel({ offers, catalog, onSave, colors: C }) {
  const [localOffers, setLocalOffers] = useState(() => offers.length > 0 ? offers : [{
    id: 'offer_' + Date.now(), name: '', type: 'menu', days: [1,2,3,4,5],
    startHour: 13, endHour: 16, discountPct: 15, productIds: [], active: true,
  }]);

  const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const allProductIds = catalog?.products?.map(p => p.id) || [];

  function update(i, field, value) {
    const next = [...localOffers];
    next[i] = { ...next[i], [field]: value };
    setLocalOffers(next);
  }

  function toggleDay(i, day) {
    const o = localOffers[i];
    const days = o.days.includes(day) ? o.days.filter(d => d !== day) : [...o.days, day].sort();
    update(i, 'days', days);
  }

  function toggleProduct(i, pid) {
    const o = localOffers[i];
    const ids = o.productIds.includes(pid) ? o.productIds.filter(id => id !== pid) : [...o.productIds, pid];
    update(i, 'productIds', ids);
  }

  function addOffer() {
    setLocalOffers([...localOffers, {
      id: 'offer_' + Date.now(), name: '', type: 'menu', days: [1,2,3,4,5],
      startHour: 13, endHour: 16, discountPct: 15, productIds: [], active: true,
    }]);
  }

  function removeOffer(i) {
    setLocalOffers(localOffers.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>OFERTAS</h2>
        <div className="flex gap-2">
          <button
            onClick={addOffer}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
            className="text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 hover:opacity-80"
          >
            <Plus className="w-4 h-4" /> Añadir
          </button>
          <button
            onClick={() => onSave(localOffers)}
            style={{ background: C.sage, color: '#fff' }}
            className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90"
          >
            Guardar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {localOffers.map((o, i) => (
          <div key={o.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <input
                value={o.name}
                onChange={e => update(i, 'name', e.target.value)}
                placeholder="Nombre de la oferta"
                style={{ background: C.surfaceLight, color: C.cream }}
                className="rounded-lg px-3 py-2 text-sm font-medium flex-1 mr-3"
              />
              <button onClick={() => removeOffer(i)} style={{ color: C.wineLight }} className="p-1.5">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Hora inicio</p>
                <input type="number" min="0" max="23" value={o.startHour}
                  onChange={e => update(i, 'startHour', parseInt(e.target.value) || 0)}
                  style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Hora fin</p>
                <input type="number" min="0" max="23" value={o.endHour}
                  onChange={e => update(i, 'endHour', parseInt(e.target.value) || 0)}
                  style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Descuento %</p>
                <input type="number" min="0" max="100" step="0.1" value={o.discountPct}
                  onChange={e => update(i, 'discountPct', parseFloat(e.target.value) || 0)}
                  style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={o.active}
                    onChange={e => update(i, 'active', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span style={{ color: o.active ? C.sageLight : C.muted }} className="text-sm">Activa</span>
                </label>
              </div>
            </div>

            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1.5">Días</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {DAYS.map((label, dayIdx) => (
                <button
                  key={dayIdx}
                  onClick={() => toggleDay(i, dayIdx + 1)}
                  style={{
                    background: o.days.includes(dayIdx + 1) ? C.brass : C.surfaceLight,
                    color: o.days.includes(dayIdx + 1) ? C.base : C.muted,
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                >
                  {label}
                </button>
              ))}
            </div>

            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1.5">Productos incluidos</p>
            <div className="flex gap-1.5 flex-wrap">
              {allProductIds.map(pid => {
                const p = catalog?.products?.find(pr => pr.id === pid);
                if (!p) return null;
                const selected = o.productIds.includes(pid);
                return (
                  <button
                    key={pid}
                    onClick={() => toggleProduct(i, pid)}
                    style={{
                      background: selected ? C.sage : C.surfaceLight,
                      color: selected ? '#fff' : C.muted,
                      border: `1px solid ${selected ? C.sageLight : C.line}`,
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium hover:opacity-80"
                  >
                    {selected && <Check className="w-3 h-3 inline mr-1" />}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
