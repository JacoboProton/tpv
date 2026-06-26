"use client";

import { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';
import { euros } from './constants';

export default function ComboSlotSelector({ combo, catalog, colors: C, onConfirm, onClose }) {
  const [selections, setSelections] = useState({});

  function toggleProduct(slotId, productId) {
    const slot = combo.slots.find(s => s.id === slotId);
    if (!slot) return;
    const current = selections[slotId] || [];
    if (current.includes(productId)) {
      setSelections(s => ({ ...s, [slotId]: current.filter(id => id !== productId) }));
    } else {
      if (current.length >= slot.maxChoices) return;
      setSelections(s => ({ ...s, [slotId]: [...current, productId] }));
    }
  }

  const { totalSurcharge, totalIndPrice } = useMemo(() => {
    let surcharge = 0, indPrice = 0;
    for (const slot of (combo.slots || [])) {
      const chosen = selections[slot.id] || [];
      for (const pid of chosen) {
        const item = slot.items.find(i => i.product_id === pid);
        const prod = catalog.products.find(p => p.id === pid);
        if (item) surcharge += item.surcharge || 0;
        if (prod) indPrice += prod.price;
      }
    }
    return { totalSurcharge: surcharge, totalIndPrice: indPrice };
  }, [selections, combo.slots, catalog.products]);

  function canConfirm() {
    for (const slot of (combo.slots || [])) {
      const count = (selections[slot.id] || []).length;
      if (count < slot.minChoices) return false;
    }
    return combo.slots && combo.slots.length > 0;
  }

  function handleConfirm() {
    const chosenItems = [];
    for (const slot of (combo.slots || [])) {
      const chosen = selections[slot.id] || [];
      for (const pid of chosen) {
        const item = slot.items.find(i => i.product_id === pid);
        chosenItems.push({
          slotName: slot.name,
          productId: pid,
          surcharge: item?.surcharge || 0,
        });
      }
    }
    onConfirm(chosenItems);
  }

  if (!combo.slots || combo.slots.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-6 max-w-sm w-full mx-4">
          <p style={{ color: C.muted }} className="text-sm text-center">
            Este combo no tiene slots configurados. Configúralo desde Administración &gt; Combos.
          </p>
          <button onClick={onClose} style={{ background: C.wine, color: '#fff' }}
            className="w-full mt-4 py-2 rounded-lg text-sm font-medium">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.line}` }}
        className="rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 style={{ color: C.cream }} className="text-lg font-bold uppercase tracking-wide">{combo.name}</h3>
            <p style={{ color: C.muted }} className="text-xs">{combo.description}</p>
          </div>
          <button onClick={onClose} style={{ color: C.muted }} className="p-1"><X className="w-5 h-5" /></button>
        </div>

        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: C.muted }}>Precio del combo</span>
            <span style={{ color: C.brassLight }} className="font-mono font-bold">{euros(combo.price)}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span style={{ color: C.muted }}>Valor individual seleccionado</span>
            <span style={{ color: C.cream }} className="font-mono">{euros(totalIndPrice)}</span>
          </div>
          {totalSurcharge > 0 && (
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span style={{ color: C.muted }}>Suplementos</span>
              <span style={{ color: C.wineLight }} className="font-mono">+{euros(totalSurcharge)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {combo.slots.map(slot => {
            const current = selections[slot.id] || [];
            return (
              <div key={slot.id} style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
                className="rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: C.cream }} className="text-sm font-bold uppercase tracking-wide">{slot.name}</span>
                  <span style={{ color: C.muted }} className="text-[10px] font-mono">
                    {current.length}/{slot.maxChoices} (min: {slot.minChoices})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {slot.items.map(item => {
                    const prod = catalog.products.find(p => p.id === item.product_id);
                    if (!prod) return null;
                    const selected = current.includes(item.product_id);
                    return (
                      <button key={item.id}
                        onClick={() => toggleProduct(slot.id, item.product_id)}
                        disabled={!selected && current.length >= slot.maxChoices}
                        style={{
                          background: selected ? C.brass + '30' : C.surface,
                          border: `1px solid ${selected ? C.brass : C.line}`,
                          color: selected ? C.cream : C.muted,
                          opacity: !selected && current.length >= slot.maxChoices ? 0.4 : 1,
                        }}
                        className="text-[11px] px-2.5 py-2 rounded-lg flex items-center gap-1.5 font-medium transition-all disabled:cursor-not-allowed"
                      >
                        {selected && <Check className="w-3 h-3" style={{ color: C.brassLight }} />}
                        {prod.name}
                        <span className="font-mono" style={{ color: C.brassLight }}>{euros(prod.price)}</span>
                        {item.surcharge > 0 && (
                          <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.wine + '30', color: C.wineLight }}>
                            +{euros(item.surcharge)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {slot.items.length === 0 && (
                    <span style={{ color: C.muted }} className="text-xs">Sin productos asignados</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleConfirm} disabled={!canConfirm()}
          style={{
            background: canConfirm() ? C.sage : C.line,
            color: '#fff',
            opacity: canConfirm() ? 1 : 0.5,
          }}
          className="w-full mt-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider hover:opacity-90 disabled:cursor-not-allowed transition-all">
          Añadir combo — {euros(combo.price + totalSurcharge)}
        </button>
      </div>
    </div>
  );
}
