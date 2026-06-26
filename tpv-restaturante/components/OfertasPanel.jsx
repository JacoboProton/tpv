"use client";

import { useState } from 'react';
import { Plus, Trash2, Check, Percent, CalendarClock, Tag } from 'lucide-react';

const OFFER_TYPES = [
  { id: 'happy_hour', label: 'Happy Hour', icon: Percent, desc: 'Descuento por porcentaje en productos seleccionados' },
  { id: 'menu_del_dia', label: 'Menú del día', icon: CalendarClock, desc: 'Precio fijo por un conjunto de productos' },
  { id: 'discount', label: 'Descuento', icon: Tag, desc: 'Descuento general en productos seleccionados' },
];

export default function OfertasPanel({ offers, catalog, onSave, colors: C }) {
  const [localOffers, setLocalOffers] = useState(() => offers.length > 0 ? offers : []);

  const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const allProducts = catalog?.products || [];

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
      id: 'offer_' + Date.now(), name: '', type: 'happy_hour',
      days: [1, 2, 3, 4, 5], startHour: 13, endHour: 16,
      discountPct: 15, fixedPrice: null, productIds: [], active: true,
    }]);
  }

  function removeOffer(i) {
    setLocalOffers(localOffers.filter((_, idx) => idx !== i));
  }

  const TypeIcon = (type) => {
    const t = OFFER_TYPES.find(t => t.id === type);
    if (!t) return Tag;
    return t.icon;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>OFERTAS Y MENÚ DEL DÍA</h2>
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

      {localOffers.length === 0 && (
        <p style={{ color: C.muted }} className="text-sm text-center py-8">
          No hay ofertas. Crea happy hours, menús del día o descuentos programados.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {localOffers.map((o, i) => {
          const OfferIcon = TypeIcon(o.type);
          return (
            <div key={o.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 mr-3">
                  <OfferIcon className="w-5 h-5" style={{ color: o.type === 'happy_hour' ? C.wineLight : o.type === 'menu_del_dia' ? C.brassLight : C.sageLight }} />
                  <input
                    value={o.name}
                    onChange={e => update(i, 'name', e.target.value)}
                    placeholder="Nombre de la oferta"
                    style={{ background: C.surfaceLight, color: C.cream }}
                    className="rounded-lg px-3 py-2 text-sm font-medium flex-1"
                  />
                </div>
                <button onClick={() => removeOffer(i)} style={{ color: C.wineLight }} className="p-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                {OFFER_TYPES.map(t => {
                  const TIcon = t.icon;
                  const active = o.type === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => update(i, 'type', t.id)}
                      style={{
                        background: active ? C.brass : C.surfaceLight,
                        color: active ? C.base : C.muted,
                        border: `1px solid ${active ? C.brassLight : C.line}`,
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:opacity-80"
                      title={t.desc}
                    >
                      <TIcon className="w-3 h-3" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
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
                {o.type === 'menu_del_dia' ? (
                  <div>
                    <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Precio fijo €</p>
                    <input type="number" min="0" step="0.1" value={o.fixedPrice ?? ''}
                      onChange={e => update(i, 'fixedPrice', e.target.value ? parseFloat(e.target.value) : null)}
                      style={{ background: C.surfaceLight, color: C.brassLight }}
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Descuento %</p>
                    <input type="number" min="0" max="100" step="0.1" value={o.discountPct ?? ''}
                      onChange={e => update(i, 'discountPct', parseFloat(e.target.value) || 0)}
                      style={{ background: C.surfaceLight, color: C.cream }}
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                )}
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

              {o.type === 'menu_del_dia' && o.productIds.length > 0 && (
                <p style={{ color: C.muted }} className="text-xs mb-2">
                  Productos en el menú: los clientes podrán elegir entre los seleccionados de cada curso.
                </p>
              )}

              <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1.5">
                {o.type === 'menu_del_dia' ? 'Productos disponibles en el menú' : 'Productos incluidos'}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {allProducts.map(p => {
                  const selected = o.productIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(i, p.id)}
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
          );
        })}
      </div>
    </div>
  );
}
