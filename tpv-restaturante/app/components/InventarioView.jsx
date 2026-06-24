import { useState } from 'react';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';

export default function InventarioView({
  catalog, colors: C, onUpdateField,
  newProductOpen, setNewProductOpen, onAddProduct,
  confirmDeleteId, setConfirmDeleteId, onDelete,
}) {
  const [form, setForm] = useState({
    name: '', category: catalog.categories[0] || '', price: '', stock: '', lowStock: '',
  });

  function submit(e) {
    e.preventDefault();
    if (!form.name || !form.price) return;
    onAddProduct(form);
    setForm({ name: '', category: catalog.categories[0] || '', price: '', stock: '', lowStock: '' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>INVENTARIO</h2>
        <button
          onClick={() => setNewProductOpen(!newProductOpen)}
          style={{ background: C.brass, color: C.base }}
          className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Producto
        </button>
      </div>

      {newProductOpen && (
        <form
          onSubmit={submit}
          style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2"
        >
          <input
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre" style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-md px-3 py-2 text-sm col-span-2"
          />
          <input
            value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            placeholder="Categoría" style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-md px-3 py-2 text-sm"
          />
          <input
            value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
            type="number" step="0.1" placeholder="Precio €"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-md px-3 py-2 text-sm"
          />
          <input
            value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
            type="number" placeholder="Stock"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-md px-3 py-2 text-sm"
          />
          <button
            type="submit"
            style={{ background: C.sage, color: '#fff' }}
            className="rounded-md py-2 text-sm font-medium col-span-2 sm:col-span-5"
          >
            Añadir producto
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {catalog.products.map(p => {
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
