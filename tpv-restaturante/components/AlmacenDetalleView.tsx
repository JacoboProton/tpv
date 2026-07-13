import { AlertTriangle, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { euros } from './constants';
import type { Theme } from './constants';

interface DetalleProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  lowStock: number;
  ubicacion: string;
  category: string;
  image?: string;
}

interface DetalleCatalog {
  products: DetalleProduct[];
}

interface AlmacenDetalleViewProps {
  catalog: DetalleCatalog;
  ubicacion: string;
  onBack: () => void;
  colors: Theme;
  onUpdateField: (id: string, field: string, value: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export default function AlmacenDetalleView({
  catalog, ubicacion, onBack, colors: C,
  onUpdateField,
  confirmDeleteId, setConfirmDeleteId, onDelete,
}: AlmacenDetalleViewProps) {
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const productos = catalog.products.filter(p => p.ubicacion === ubicacion);
  const bajo = productos.filter(p => p.stock <= p.lowStock).length;
  const valorTotal = productos.reduce((s, p) => s + p.stock * p.price, 0);

  const porCategoria: Record<string, DetalleProduct[]> = {};
  for (const p of productos) {
    if (!porCategoria[p.category]) porCategoria[p.category] = [];
    porCategoria[p.category].push(p);
  }
  const categorias = Object.keys(porCategoria).sort();

  function toggleCat(cat: string) {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  const inputStyle: Record<string, string> = {
    background: C.surface,
    color: C.cream,
    border: `1px solid transparent`,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={onBack} style={{ color: C.muted }} className="text-sm mb-2 hover:opacity-80 flex items-center gap-1">
            ← Volver
          </button>
          <h2 className="font-display text-2xl" style={{ color: C.cream }}>Stock de {ubicacion}</h2>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase">Productos</p>
            <p className="font-display text-2xl" style={{ color: C.cream }}>{productos.length}</p>
          </div>
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase">Categorías</p>
            <p className="font-display text-2xl" style={{ color: C.cream }}>{categorias.length}</p>
          </div>
          {bajo > 0 && (
            <div>
              <p style={{ color: C.muted }} className="text-xs uppercase">Stock bajo</p>
              <p className="font-display text-2xl" style={{ color: C.wineLight }}>{bajo}</p>
            </div>
          )}
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase">Valor</p>
            <p className="font-mono text-lg" style={{ color: C.brassLight }}>{euros(valorTotal)}</p>
          </div>
        </div>
      </div>

      {categorias.map(cat => {
        const items = porCategoria[cat];
        const catBajo = items.filter((p: DetalleProduct) => p.stock <= p.lowStock).length;
        const catValor = items.reduce((s: number, p: DetalleProduct) => s + p.stock * p.price, 0);
        const isOpen = expandedCats[cat] !== false;

        return (
          <div key={cat} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="mb-3 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center justify-between px-4 py-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: C.muted }} /> : <ChevronRight className="w-4 h-4" style={{ color: C.muted }} />}
                <span className="font-display text-lg" style={{ color: C.brassLight }}>{cat}</span>
                <span className="text-xs font-mono" style={{ color: C.muted }}>{items.length} uds.</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                {catBajo > 0 && <span style={{ color: C.wineLight }}>{catBajo} bajo{catBajo > 1 ? 's' : ''}</span>}
                <span style={{ color: C.brassLight }}>{euros(catValor)}</span>
              </div>
            </button>

            <div style={{
              maxHeight: isOpen ? '2000px' : '0',
              opacity: isOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.35s ease, opacity 0.25s ease',
            }}>
              <div className="px-3 pb-3 flex flex-col gap-1.5">
                {items.map((p: DetalleProduct) => {
                  const low = p.stock <= p.lowStock;
                  const pct = Math.min(100, Math.round((p.stock / (p.lowStock || 1)) * 100));
                  return (
                    <div
                      key={p.id}
                      style={{ background: C.surfaceLight, border: `1px solid ${low ? C.wine : 'transparent'}` }}
                      className={`rounded-lg p-2.5 flex items-center gap-2 ${low ? 'shadow-sm' : ''}`}
                    >
                      {p.image ? (
                        <img src={p.image} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: C.surface, color: C.muted }}>
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-[6rem]">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p style={{ color: C.muted }} className="text-xs font-mono">
                          {euros(p.price)} / ud.
                        </p>
                      </div>

                      <div style={{ background: C.surface }} className="w-16 h-2 rounded-full overflow-hidden hidden sm:block">
                        <div style={{ width: `${pct}%`, background: low ? C.wineLight : C.sageLight }} className="h-full transition-all duration-300" />
                      </div>

                      <div className="relative">
                        <input
                          type="number" defaultValue={p.stock}
                          onBlur={e => onUpdateField(p.id, 'stock', (e.target as HTMLInputElement).value)}
                          style={{ ...inputStyle, color: low ? C.wineLight : C.cream, width: 56 }}
                          className="rounded-md px-2 py-1 text-sm text-center font-mono hover:border-gray-500 focus:border-gray-300 focus:outline-none"
                          onMouseEnter={e => { if (!(e.target as HTMLElement).matches(':focus')) (e.target as HTMLElement).style.borderColor = C.line; }}
                          onMouseLeave={e => { if (!(e.target as HTMLElement).matches(':focus')) (e.target as HTMLElement).style.borderColor = 'transparent'; }}
                          onFocus={e => (e.target as HTMLElement).style.borderColor = C.brass}
                          onBlurCapture={e => (e.target as HTMLElement).style.borderColor = 'transparent'}
                        />
                        {low && <AlertTriangle className="w-3 h-3 absolute -top-1 -right-1" style={{ color: C.wineLight }} />}
                      </div>

                      <input
                        type="number" step="0.1" defaultValue={p.price}
                        onBlur={e => onUpdateField(p.id, 'price', (e.target as HTMLInputElement).value)}
                        style={{ ...inputStyle, color: C.cream, width: 64 }}
                        className="font-mono rounded-md px-2 py-1 text-sm text-center hover:border-gray-500 focus:border-gray-300 focus:outline-none"
                        onMouseEnter={e => { if (!(e.target as HTMLElement).matches(':focus')) (e.target as HTMLElement).style.borderColor = C.line; }}
                        onMouseLeave={e => { if (!(e.target as HTMLElement).matches(':focus')) (e.target as HTMLElement).style.borderColor = 'transparent'; }}
                        onFocus={e => (e.target as HTMLElement).style.borderColor = C.brass}
                        onBlurCapture={e => (e.target as HTMLElement).style.borderColor = 'transparent'}
                      />

                      <div className="relative" style={{ width: 70, height: 32 }}>
                        <button
                          onClick={() => onDelete(p.id)}
                          style={{
                            background: C.wine, color: C.cream,
                            opacity: confirmDeleteId === p.id ? 1 : 0,
                            pointerEvents: confirmDeleteId === p.id ? 'auto' as const : 'none' as const,
                            transition: 'opacity 0.2s',
                          }}
                          className="absolute inset-0 rounded-md text-xs font-medium"
                        >
                          ¿Eliminar?
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(p.id)}
                          style={{
                            color: C.muted,
                            opacity: confirmDeleteId === p.id ? 0 : 1,
                            pointerEvents: confirmDeleteId === p.id ? 'none' as const : 'auto' as const,
                            transition: 'opacity 0.2s',
                          }}
                          className="absolute inset-0 p-1 rounded-md hover:opacity-70 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
