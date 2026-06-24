import { AlertTriangle, Trash2 } from 'lucide-react';
import { euros } from './constants';

export default function AlmacenDetalleView({
  catalog, ubicacion, onBack, colors: C,
  onUpdateField,
  newProductOpen, setNewProductOpen, onAddProduct,
  confirmDeleteId, setConfirmDeleteId, onDelete,
}) {
  const productos = catalog.products.filter(p => p.ubicacion === ubicacion);
  const bajo = productos.filter(p => p.stock <= p.lowStock).length;
  const valorTotal = productos.reduce((s, p) => s + p.stock * p.price, 0);

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

      <div className="flex flex-col gap-2 mt-4">
        {productos.map(p => {
          const low = p.stock <= p.lowStock;
          const pct = Math.min(100, Math.round((p.stock / (p.lowStock * 3 || 1)) * 100));
          return (
            <div
              key={p.id}
              style={{ background: C.surface, border: `1px solid ${low ? C.wine : C.line}` }}
              className="rounded-lg p-3 flex flex-wrap items-center gap-3"
            >
              <div className="flex-1 min-w-[8rem]">
                <p className="text-sm font-medium">{p.name}</p>
                <p style={{ color: C.muted }} className="text-xs">{p.category}</p>
              </div>
              <div
                style={{ background: C.surfaceLight }}
                className="w-24 h-2 rounded-full overflow-hidden hidden sm:block"
              >
                <div style={{ width: `${pct}%`, background: low ? C.wineLight : C.sageLight }} className="h-full" />
              </div>
              <input
                type="number" defaultValue={p.stock}
                onBlur={e => onUpdateField(p.id, 'stock', e.target.value)}
                style={{ background: C.surfaceLight, color: low ? C.wineLight : C.cream, width: 64 }}
                className="rounded-md px-2 py-1.5 text-sm text-center"
              />
              <input
                type="number" step="0.1" defaultValue={p.price}
                onBlur={e => onUpdateField(p.id, 'price', e.target.value)}
                style={{ background: C.surfaceLight, color: C.cream, width: 72 }}
                className="font-mono rounded-md px-2 py-1.5 text-sm text-center"
              />
              {low && <AlertTriangle className="w-4 h-4" style={{ color: C.wineLight }} />}
              {confirmDeleteId === p.id ? (
                <button onClick={() => onDelete(p.id)} style={{ color: C.wineLight }} className="text-xs font-medium px-2">
                  Confirmar
                </button>
              ) : (
                <button onClick={() => setConfirmDeleteId(p.id)} style={{ color: C.muted }} className="p-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
