import { useState } from 'react';
import { Plus, AlertTriangle, Trash2, Package, Filter, FolderTree, List } from 'lucide-react';
import { euros } from './constants';

export default function InventarioView({
  catalog, colors: C, onUpdateField,
  newProductOpen, setNewProductOpen, onAddProduct,
  confirmDeleteId, setConfirmDeleteId, onDelete,
}) {
  const [form, setForm] = useState({
    name: '', category: catalog.categories[0] || '', price: '', stock: '', lowStock: '', ubicacion: 'Bar',
  });
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterLowOnly, setFilterLowOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByCat, setGroupByCat] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!form.name || !form.price) return;
    onAddProduct(form);
    setForm({ name: '', category: catalog.categories[0] || '', price: '', stock: '', lowStock: '', ubicacion: 'Bar' });
  }

  const filteredProducts = catalog.products.filter(p => {
    const byCategory = filterCategory === 'Todos' || p.category === filterCategory;
    const byLowStock = !filterLowOnly || p.stock <= p.lowStock;
    const bySearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return byCategory && byLowStock && bySearch;
  });

  const porCategoria = {};
  for (const p of filteredProducts) {
    if (!porCategoria[p.category]) porCategoria[p.category] = [];
    porCategoria[p.category].push(p);
  }
  const categorias = Object.keys(porCategoria).sort();

  const totalValor = filteredProducts.reduce((s, p) => s + p.stock * p.price, 0);
  const totalBajo = filteredProducts.filter(p => p.stock <= p.lowStock).length;

  const inputStyle = {
    background: C.surfaceLight,
    color: C.cream,
    border: `1px solid transparent`,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  function renderProduct(p) {
    const low = p.stock <= p.lowStock;
    const pct = Math.min(100, Math.round((p.stock / (p.lowStock || 1)) * 100));
    return (
      <div
        key={p.id}
        style={{ background: C.surface, border: `1px solid ${low ? C.wine : C.line}` }}
        className={`rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 transition-all ${low ? 'shadow-md shadow-red-500/10' : ''}`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-[8rem]">
          <div style={{ background: low ? 'rgba(162,62,62,0.2)' : 'rgba(111,146,114,0.2)', minWidth: 36, minHeight: 36 }} className="rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4" style={{ color: low ? C.wineLight : C.sageLight }} />
          </div>
          <div>
            <p className="text-sm font-medium">{p.name}</p>
            <p style={{ color: C.muted }} className="text-xs">{p.category} · {p.ubicacion}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div style={{ background: C.surfaceLight }} className="w-20 h-2.5 rounded-full overflow-hidden hidden sm:block">
            <div style={{ width: `${pct}%`, background: low ? C.wineLight : C.sageLight }} className="h-full transition-all duration-300" />
          </div>

          <div className="relative">
            <input
              type="number" defaultValue={p.stock}
              onBlur={e => onUpdateField(p.id, 'stock', e.target.value)}
              style={{ ...inputStyle, color: low ? C.wineLight : C.cream, width: 64 }}
              className="rounded-lg px-2.5 py-1.5 text-sm text-center font-mono hover:border-gray-500 focus:border-gray-300 focus:outline-none"
              onMouseEnter={e => { if (!e.target.matches(':focus')) e.target.style.borderColor = C.line; }}
              onMouseLeave={e => { if (!e.target.matches(':focus')) e.target.style.borderColor = 'transparent'; }}
              onFocus={e => e.target.style.borderColor = C.brass}
              onBlurCapture={e => e.target.style.borderColor = 'transparent'}
            />
            {low && <AlertTriangle className="w-3.5 h-3.5 absolute -top-1 -right-1" style={{ color: C.wineLight }} />}
          </div>

          <input
            type="number" step="0.1" defaultValue={p.price}
            onBlur={e => onUpdateField(p.id, 'price', e.target.value)}
            style={{ ...inputStyle, color: C.cream, width: 72 }}
            className="font-mono rounded-lg px-2.5 py-1.5 text-sm text-center hover:border-gray-500 focus:border-gray-300 focus:outline-none"
            onMouseEnter={e => { if (!e.target.matches(':focus')) e.target.style.borderColor = C.line; }}
            onMouseLeave={e => { if (!e.target.matches(':focus')) e.target.style.borderColor = 'transparent'; }}
            onFocus={e => e.target.style.borderColor = C.brass}
            onBlurCapture={e => e.target.style.borderColor = 'transparent'}
          />

          <div className="relative" style={{ width: 80, height: 36 }}>
            <button
              onClick={() => onDelete(p.id)}
              style={{
                background: C.wine, color: C.cream,
                opacity: confirmDeleteId === p.id ? 1 : 0,
                pointerEvents: confirmDeleteId === p.id ? 'auto' : 'none',
                transition: 'opacity 0.2s',
              }}
              className="absolute inset-0 rounded-lg text-xs font-medium"
            >
              ¿Eliminar?
            </button>
            <button
              onClick={() => setConfirmDeleteId(p.id)}
              style={{
                color: C.muted,
                opacity: confirmDeleteId === p.id ? 0 : 1,
                pointerEvents: confirmDeleteId === p.id ? 'none' : 'auto',
                transition: 'opacity 0.2s',
              }}
              className="absolute inset-0 p-1.5 rounded-lg hover:opacity-80 flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>INVENTARIO</h2>
        <button
          onClick={() => setNewProductOpen(!newProductOpen)}
          style={{ background: C.brass, color: C.base }}
          className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Producto
        </button>
      </div>

      <div className="flex items-center gap-2 mb-1 text-xs font-mono" style={{ color: C.muted }}>
        <span>{filteredProducts.length} productos</span>
        <span>·</span>
        <span style={{ color: totalBajo > 0 ? C.wineLight : C.muted }}>{totalBajo} stock bajo</span>
        <span>·</span>
        <span style={{ color: C.brassLight }}>{euros(totalValor)}</span>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <input
          type="text" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar producto..."
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm min-w-[140px]"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm"
        >
          <option value="Todos">Todas categorías</option>
          {catalog.categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => setFilterLowOnly(!filterLowOnly)}
          style={{
            background: filterLowOnly ? C.wine : C.surfaceLight,
            color: filterLowOnly ? C.cream : C.muted,
            border: `1px solid ${filterLowOnly ? C.wineLight : C.line}`
          }}
          className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5"
        >
          <Filter className="w-3.5 h-3.5" /> Stock bajo
        </button>
        <button
          onClick={() => setGroupByCat(!groupByCat)}
          style={{
            background: groupByCat ? C.sage : C.surfaceLight,
            color: groupByCat ? '#fff' : C.muted,
            border: `1px solid ${groupByCat ? C.sageLight : C.line}`
          }}
          className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5"
          title="Agrupar por categoría"
        >
          {groupByCat ? <FolderTree className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
          {groupByCat ? 'Agrupado' : 'Lista'}
        </button>
      </div>

      {newProductOpen && (
        <form
          onSubmit={submit}
          style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          <input
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre" style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm col-span-2 sm:col-span-1"
            autoFocus
          />
          <input
            list="categories"
            value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            placeholder="Categoría" style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm"
          />
          <datalist id="categories">
            {catalog.categories.map(cat => <option key={cat} value={cat} />)}
          </datalist>
          <input
            value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
            type="number" step="0.1" placeholder="Precio €"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm font-mono"
          />
          <input
            value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
            type="number" placeholder="Stock actual"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            value={form.lowStock} onChange={e => setForm({ ...form, lowStock: e.target.value })}
            type="number" placeholder="Stock mínimo"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-lg px-3 py-2.5 text-sm"
          />
          <select
            value={form.ubicacion}
            onChange={e => setForm({ ...form, ubicacion: e.target.value })}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="Bar">Bar</option>
            <option value="Cocina">Cocina</option>
            <option value="Almacén">Almacén</option>
          </select>
          <button
            type="submit"
            style={{ background: C.sage, color: '#fff' }}
            className="rounded-lg py-2.5 text-sm font-medium col-span-2 sm:col-span-3"
          >
            Añadir producto
          </button>
        </form>
      )}

      {groupByCat ? (
        <div className="flex flex-col gap-4">
          {categorias.map(cat => {
            const items = porCategoria[cat];
            const catBajo = items.filter(p => p.stock <= p.lowStock).length;
            const catValor = items.reduce((s, p) => s + p.stock * p.price, 0);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg" style={{ color: C.brassLight }}>{cat}</p>
                    <span className="text-xs font-mono" style={{ color: C.muted }}>{items.length} uds.</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    {catBajo > 0 && <span style={{ color: C.wineLight }}>{catBajo} bajo{catBajo > 1 ? 's' : ''}</span>}
                    <span style={{ color: C.brassLight }}>{euros(catValor)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map(renderProduct)}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <p style={{ color: C.muted }} className="text-center py-8 text-sm">
              No hay productos que coincidan con el filtro
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredProducts.length === 0 && (
            <p style={{ color: C.muted }} className="text-center py-8 text-sm">
              No hay productos que coincidan con el filtro
            </p>
          )}
          {filteredProducts.map(renderProduct)}
        </div>
      )}
    </div>
  );
}
