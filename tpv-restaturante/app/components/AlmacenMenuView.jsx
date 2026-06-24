import { euros } from './constants';

export default function AlmacenMenuView({ catalog, onSelectUbicacion, colors: C }) {
  const ubicaciones = ['Bar', 'Cocina', 'Almacén'];

  const stats = ubicaciones.map(ub => {
    const productos = catalog.products.filter(p => p.ubicacion === ub);
    const total = productos.length;
    const bajo = productos.filter(p => p.stock <= p.lowStock).length;
    const valorTotal = productos.reduce((s, p) => s + p.stock * p.price, 0);
    return { ub, total, bajo, valorTotal };
  });

  return (
    <div>
      <h2 className="font-display text-2xl mb-6" style={{ color: C.cream }}>ALMACÉN</h2>
      <p style={{ color: C.muted }} className="text-sm mb-6">Selecciona una ubicación para ver el inventario</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(stat => (
          <button
            key={stat.ub}
            onClick={() => onSelectUbicacion(stat.ub)}
            style={{ background: C.surface, border: `2px solid ${C.brass}` }}
            className="rounded-2xl p-6 hover:opacity-90 transition-opacity text-left"
          >
            <p className="font-display text-2xl mb-4" style={{ color: C.brassLight }}>{stat.ub}</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Productos</span>
                <span className="font-mono" style={{ color: C.cream }}>{stat.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Stock bajo</span>
                <span className="font-mono" style={{ color: stat.bajo > 0 ? C.wineLight : C.sageLight }}>
                  {stat.bajo}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Valor total</span>
                <span className="font-mono" style={{ color: C.brassLight }}>{euros(stat.valorTotal)}</span>
              </div>
            </div>

            <div
              style={{ background: C.surfaceLight, color: C.brass }}
              className="rounded-lg px-3 py-2 text-xs text-center"
            >
              Ver inventario →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
