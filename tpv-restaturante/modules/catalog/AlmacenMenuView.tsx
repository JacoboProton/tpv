import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { euros } from '@/components/constants';
import type { Theme } from '@/components/constants';

interface InventoryProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  lowStock: number;
  ubicacion: string;
  category: string;
}

interface InventoryCatalog {
  products: InventoryProduct[];
}

interface AlmacenMenuViewProps {
  catalog: InventoryCatalog;
  onSelectUbicacion: (ubicacion: string) => void;
  onSelectAlbaranes?: () => void;
  colors: Theme;
}

interface CategoryRowProps {
  name: string;
  productos: InventoryProduct[];
  C: Theme;
}

function CategoryRow({ name, productos, C }: CategoryRowProps) {
  const total = productos.length;
  const bajo = productos.filter(p => p.stock <= p.lowStock).length;
  const valor = productos.reduce((s, p) => s + p.stock * p.price, 0);
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: C.surfaceLight }}>
      <span className="text-xs font-medium" style={{ color: C.cream }}>{name}</span>
      <div className="flex items-center gap-3 text-xs font-mono">
        <span style={{ color: C.muted }}>{total} uds.</span>
        {bajo > 0 && <span style={{ color: C.wineLight }}>{bajo} bajo{bajo > 1 ? 's' : ''}</span>}
        <span style={{ color: C.brassLight }}>{euros(valor)}</span>
      </div>
    </div>
  );
}

export default function AlmacenMenuView({ catalog, onSelectUbicacion, onSelectAlbaranes, colors: C }: AlmacenMenuViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const ubicaciones = ['Bar', 'Cocina', 'Almacén'];

  const stats = ubicaciones.map(ub => {
    const productos = catalog.products.filter(p => p.ubicacion === ub);
    const total = productos.length;
    const bajo = productos.filter(p => p.stock <= p.lowStock).length;
    const valorTotal = productos.reduce((s, p) => s + p.stock * p.price, 0);

    const porCategoria: Record<string, InventoryProduct[]> = {};
    for (const p of productos) {
      if (!porCategoria[p.category]) porCategoria[p.category] = [];
      porCategoria[p.category].push(p);
    }

    return { ub, total, bajo, valorTotal, porCategoria };
  });

  return (
    <div>
      <h2 className="font-display text-2xl mb-2" style={{ color: C.cream }}>ALMACÉN</h2>
      <p style={{ color: C.muted }} className="text-sm mb-6">
        Gestiona el inventario por ubicación y categoría
      </p>

      {onSelectAlbaranes && (
        <div
          onClick={onSelectAlbaranes}
          style={{ background: C.surface, border: `2px solid ${C.sage}` }}
          className="rounded-2xl p-5 mb-4 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div style={{ background: 'rgba(111,146,114,0.15)' }} className="w-12 h-12 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6" style={{ color: C.sageLight }} />
            </div>
            <div className="flex-1">
              <p className="font-display text-lg" style={{ color: C.cream }}>Albaranes</p>
              <p className="text-xs" style={{ color: C.muted }}>Digitaliza notas de entrega y gestiona lotes</p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: C.muted }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(stat => {
          const cats = Object.keys(stat.porCategoria).sort();
          const isOpen = expanded === stat.ub;
          return (
            <div
              key={stat.ub}
              style={{ background: C.surface, border: `2px solid ${C.brass}` }}
              className="rounded-2xl overflow-hidden"
            >
              <div className="p-5">
                <p className="font-display text-2xl mb-3" style={{ color: C.brassLight }}>{stat.ub}</p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div style={{ background: C.surfaceLight }} className="text-center rounded-xl p-2.5">
                    <p className="text-xs" style={{ color: C.muted }}>Productos</p>
                    <p className="font-mono text-lg" style={{ color: C.cream }}>{stat.total}</p>
                  </div>
                  <div style={{ background: C.surfaceLight }} className="text-center rounded-xl p-2.5">
                    <p className="text-xs" style={{ color: C.muted }}>Stock bajo</p>
                    <p className="font-mono text-lg" style={{ color: stat.bajo > 0 ? C.wineLight : C.sageLight }}>
                      {stat.bajo}
                    </p>
                  </div>
                  <div style={{ background: C.surfaceLight }} className="text-center rounded-xl p-2.5">
                    <p className="text-xs" style={{ color: C.muted }}>Valor</p>
                    <p className="font-mono text-sm" style={{ color: C.brassLight }}>{euros(stat.valorTotal)}</p>
                  </div>
                </div>

                {cats.length > 1 && (
                  <button
                    onClick={() => setExpanded(isOpen ? null : stat.ub)}
                    className="flex items-center gap-1 text-xs w-full mb-2"
                    style={{ color: C.muted }}
                  >
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {isOpen ? 'Ocultar categorías' : `${cats.length} categorías`}
                  </button>
                )}

                {isOpen && (
                  <div className="flex flex-col gap-1 mb-3">
                    {cats.map(cat => (
                      <CategoryRow
                        key={cat} name={cat}
                        productos={stat.porCategoria[cat]}
                        C={C}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onSelectUbicacion(stat.ub)}
                  style={{ background: C.surfaceLight, color: C.brass }}
                  className="rounded-xl px-3 py-2.5 text-xs text-center w-full font-medium hover:opacity-80 transition-opacity mt-1"
                >
                  Ver productos →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
