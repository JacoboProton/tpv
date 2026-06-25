import { useState } from 'react';
import { Check } from 'lucide-react';
import { euros } from './constants';

export default function ModifierSelector({ product, modifierGroups, onConfirm, onCancel, colors: C }) {
  const [selected, setSelected] = useState(() => {
    const init = {};
    for (const g of modifierGroups) {
      if (g.type === 'single') {
        const def = g.options.find(o => o.isDefault);
        init[g.id] = def ? def.id : (g.options[0]?.id || null);
      } else {
        const defs = g.options.filter(o => o.isDefault).map(o => o.id);
        init[g.id] = g.required && defs.length === 0 ? [g.options[0]?.id].filter(Boolean) : defs;
      }
    }
    return init;
  });

  if (!modifierGroups || modifierGroups.length === 0) {
    onConfirm([]);
    return null;
  }

  function toggleOption(group, option) {
    setSelected(prev => {
      const next = { ...prev };
      if (group.type === 'single') {
        next[group.id] = option.id;
      } else {
        const arr = [...(prev[group.id] || [])];
        const idx = arr.indexOf(option.id);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(option.id);
        next[group.id] = arr;
      }
      return next;
    });
  }

  function isSelected(group, option) {
    if (group.type === 'single') return selected[group.id] === option.id;
    return (selected[group.id] || []).includes(option.id);
  }

  function canConfirm() {
    for (const g of modifierGroups) {
      if (g.required) {
        if (g.type === 'single' && !selected[g.id]) return false;
        if (g.type === 'multiple' && (!selected[g.id] || selected[g.id].length === 0)) return false;
      }
    }
    return true;
  }

  function handleConfirm() {
    const result = [];
    for (const g of modifierGroups) {
      const val = selected[g.id];
      if (g.type === 'single') {
        const opt = g.options.find(o => o.id === val);
        if (opt) result.push({
          groupId: g.id, groupName: g.name,
          optionId: opt.id, optionName: opt.name, priceDelta: opt.priceDelta,
        });
      } else {
        for (const oid of (val || [])) {
          const opt = g.options.find(o => o.id === oid);
          if (opt) result.push({
            groupId: g.id, groupName: g.name,
            optionId: opt.id, optionName: opt.name, priceDelta: opt.priceDelta,
          });
        }
      }
    }
    onConfirm(result);
  }

  const totalExtra = modifierGroups.reduce((s, g) => {
    const val = selected[g.id];
    if (g.type === 'single') {
      const opt = g.options.find(o => o.id === val);
      return s + (opt?.priceDelta || 0);
    }
    return s + ((val || [])).reduce((a, oid) => {
      const opt = g.options.find(o => o.id === oid);
      return a + (opt?.priceDelta || 0);
    }, 0);
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.line}` }}
        className="w-full max-w-sm rounded-xl p-5 fade-up max-h-[80vh] overflow-y-auto"
      >
        <p className="font-display text-xl mb-1" style={{ color: C.cream }}>{product.name}</p>
        <p className="text-xs mb-4" style={{ color: C.muted }}>Elige las opciones</p>

        {modifierGroups.map(g => (
          <div key={g.id} className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-sm font-medium" style={{ color: C.brassLight }}>{g.name}</p>
              {g.required && <span className="text-xs" style={{ color: C.wineLight }}>obligatorio</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              {g.options.map(o => {
                const active = isSelected(g, o);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggleOption(g, o)}
                    style={{
                      background: active ? C.brass : C.surfaceLight,
                      color: active ? C.base : C.cream,
                      border: `1px solid ${active ? C.brass : C.line}`,
                    }}
                    className="rounded-lg px-3 py-2 text-sm flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      {g.type !== 'single' && (
                        <div style={{
                          width: 18, height: 18, borderRadius: 3,
                          border: `2px solid ${active ? C.base : C.muted}`,
                          background: active ? C.base : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {active && <Check className="w-3 h-3" style={{ color: C.brass }} />}
                        </div>
                      )}
                      <span>{o.name}</span>
                    </div>
                    {o.priceDelta > 0 && (
                      <span className="font-mono text-xs">+{euros(o.priceDelta)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {totalExtra > 0 && (
          <p className="text-right font-mono text-sm mb-4" style={{ color: C.brassLight }}>
            Extras: +{euros(totalExtra)}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            style={{ background: C.surfaceLight, color: C.muted }}
            className="flex-1 rounded-lg py-2.5 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            style={{
              background: canConfirm() ? C.sage : C.surfaceLight,
              color: canConfirm() ? '#fff' : C.muted,
            }}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
