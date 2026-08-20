import { Search, X, ChefHat, Package, Tag } from 'lucide-react';
import { TICKET_EDGE, euros, ALLERGENS, ALLERGEN_COLORS, type Theme } from '@/components/constants';
import type { OrderItem, CatalogProduct, ComboData, MealMenuData } from './types';
import type { Dispatch, SetStateAction } from 'react';

interface ProductSectionProps {
  catalog: { products: CatalogProduct[]; categories: (string | { id: string; name: string })[] };
  combos: ComboData[];
  mealMenus: MealMenuData[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  activeCategory: string;
  setActiveCategory: (v: string) => void;
  setShowFreeItemModal: (v: boolean) => void;
  setFreeItemName: (v: string) => void;
  setFreeItemPrice: (v: number) => void;
  setFreeItemCourse: (v: string) => void;
  setConfiguringCombo: Dispatch<SetStateAction<ComboData | null>>;
  setConfiguringMenu: Dispatch<SetStateAction<MealMenuData | null>>;
  onAddItem: (item: Partial<OrderItem> & { id?: string; name: string; price: number; category: string; course?: string; ubicacion?: string; allergens?: string[] }) => void;
  isDebtOnly: boolean;
  C: Theme;
}

export default function ProductSection({
  catalog, combos, mealMenus,
  searchQuery, setSearchQuery,
  activeCategory, setActiveCategory,
  setShowFreeItemModal, setFreeItemName, setFreeItemPrice, setFreeItemCourse,
  setConfiguringCombo, setConfiguringMenu,
  onAddItem, isDebtOnly, C,
}: ProductSectionProps) {
  return (
    <>
      {/* ── Carrusel Destacados ── */}
      {!isDebtOnly && (() => {
        const featured = (catalog?.products || [])
          .filter(p => p.carouselSort !== null && p.carouselSort !== undefined && p.active !== false)
          .sort((a, b) => (a.carouselSort || 0) - (b.carouselSort || 0));
        if (featured.length === 0) return null;
        return (
          <div className="px-4 py-2 overflow-x-auto" style={{ borderBottom: `1px solid ${C.line}` }}>
            <div className="flex gap-2">
              {featured.map(p => (
                <button key={p.id} onClick={() => onAddItem(p)}
                  style={{ background: C.surface, border: `1px solid ${C.brass}40`, color: C.cream }}
                  className="rounded-lg p-2.5 text-left hover:opacity-90 min-w-[130px] shrink-0 flex flex-col items-center gap-1"
                >
                  {p.image ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid ${C.brass}40` }}>
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg" style={{ background: C.brass + '20', color: C.brassLight }}>
                      ★
                    </div>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate w-full text-center">{p.name}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: C.brassLight }}>{euros(p.price)}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Buscador + Varios ── */}
      {!isDebtOnly && (
        <div style={{ borderBottom: `1px solid ${C.line}` }} className="px-4 py-2 flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar productos (/)"
              data-search-products
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: 28 }}
              className="w-full rounded-lg py-1.5 text-xs outline-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: C.muted }}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button onClick={() => { setFreeItemName(''); setFreeItemPrice(0); setFreeItemCourse(''); setShowFreeItemModal(true); }}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.brassLight }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap flex items-center gap-1 hover:opacity-80">
            ✏️ Varios
          </button>
        </div>
      )}

      {/* ── Categorías ── */}
      {!isDebtOnly && !searchQuery && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ borderBottom: `1px solid ${C.line}` }}>
          {['Todos', ...catalog.categories].map(cat => {
            const label = typeof cat === 'string' ? cat : cat.name;
            const key = typeof cat === 'string' ? cat : cat.id;
            return (
              <button key={key} onClick={() => setActiveCategory(label)}
                style={{
                  background: activeCategory === label ? C.brass : C.surfaceLight,
                  color:      activeCategory === label ? C.base  : C.muted,
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Combos ── */}
      {!isDebtOnly && combos && combos.length > 0 && (
        <div className="px-4 py-2 overflow-x-auto" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="flex gap-2">
            {combos.filter(c => c.active).map(combo => {
              const total = combo.items.reduce((s, item) => {
                const p = catalog.products.find(pr => pr.id === item.product_id);
                return s + (p?.price || 0) * item.quantity;
              }, 0);
              const savings = total - combo.price;
              return (
                <button
                  key={combo.id}
                  onClick={() => {
                    if (combo.slots && combo.slots.length > 0) {
                      setConfiguringCombo(combo);
                    } else {
                      onAddItem({ id: combo.id, name: combo.name, price: combo.price, category: combo.category || 'Combos', course: '', ubicacion: 'Cocina', allergens: [], isCombo: true, comboData: combo });
                    }
                  }}
                  style={{ background: C.surface, border: `1px solid ${C.brass}40`, color: C.cream }}
                  className="rounded-lg p-2.5 text-left hover:opacity-90 min-w-[160px] shrink-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-3.5 h-3.5" style={{ color: C.brassLight }} />
                    <span className="text-xs font-bold uppercase tracking-wider truncate">{combo.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold" style={{ color: C.brassLight }}>{Number(combo.price).toFixed(2)}€</span>
                    {savings > 0 && (
                      <span className="text-[9px] px-1 py-0.5 rounded-full" style={{ background: C.wine + '30', color: C.wineLight }}>
                        -{Math.round((savings / total) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {combo.items.map((item, ii) => {
                      const p = catalog.products.find(pr => pr.id === item.product_id);
                      return p ? (
                        <span key={ii} className="text-[9px] flex items-center gap-0.5" style={{ color: C.muted }}>
                          <Tag className="w-2.5 h-2.5" />
                          {item.quantity > 1 && <span>x{item.quantity}</span>}
                          {p.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Menú del día ── */}
      {!isDebtOnly && mealMenus && mealMenus.length > 0 && (
        <div className="px-4 py-2 overflow-x-auto" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="flex gap-2">
            {mealMenus.filter(m => m.active).map(menu => (
              <button key={menu.id}
                onClick={() => setConfiguringMenu(menu)}
                style={{ background: C.surface, border: `1px solid ${C.sage}40`, color: C.cream }}
                className="rounded-lg p-2.5 text-left hover:opacity-90 min-w-[160px] shrink-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <ChefHat className="w-3.5 h-3.5" style={{ color: C.sageLight }} />
                  <span className="text-xs font-bold uppercase tracking-wider truncate">{menu.name}</span>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: C.sageLight }}>{euros(menu.price)}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {menu.includes_pan && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.brass + '20', color: C.brassLight }}>Pan</span>}
                  {menu.includes_bebida && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.brass + '20', color: C.brassLight }}>Bebida</span>}
                  {menu.includes_cafe && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.brass + '20', color: C.brassLight }}>Café</span>}
                  {menu.courses && <span className="text-[9px] text-white/30">{menu.courses.length} cursos</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Productos ── */}
      {!isDebtOnly && (
        <div className="grid grid-cols-2 gap-2 p-4 overflow-y-auto" style={{ maxHeight: '32%' }}>
          {catalog.products
            .filter(p => {
              if (p.agotado) return false;
              if (searchQuery) return p.name.toLowerCase().includes(searchQuery.toLowerCase());
              return activeCategory === 'Todos' || p.category === activeCategory;
            })
            .map(p => {
              const disc = p.discount || 0;
              return (
                <button
                  key={p.id}
                  onClick={() => onAddItem(p)}
                  disabled={(p.stock ?? Infinity) <= 0}
                  style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, opacity: (p.stock ?? Infinity) <= 0 ? 0.4 : 1 }}
                  className="text-left rounded-lg p-2 hover:opacity-90 disabled:cursor-not-allowed relative flex gap-2.5 items-start"
                >
                  {p.image ? (
                    <img src={p.image} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-10 h-10 rounded-md shrink-0 mt-0.5 flex items-center justify-center text-base font-bold" style={{ background: C.surface, color: C.muted }}>
                      {p.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate">{p.name}</p>
                    {p.allergens && p.allergens.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap">
                        {p.allergens.map(aid => {
                          const a = ALLERGENS.find(x => x.id === aid);
                          return a ? (
                            <span key={aid} className="text-[9px] font-bold px-1 rounded-sm leading-tight" style={{ background: ALLERGEN_COLORS[aid] + '30', color: ALLERGEN_COLORS[aid] }}>
                              {a.abbr}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <p className="font-mono text-xs mt-1" style={{ color: C.brassLight }}>
                      {disc > 0 ? (
                        <><span className="line-through opacity-60 mr-1">{euros(p.price)}</span> {euros(p.price * (1 - disc / 100))}</>
                      ) : (
                        euros(p.price)
                      )}
                    </p>
                  </div>
                  {disc > 0 && (
                    <span className="absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.wine, color: C.cream }}>
                      -{disc}%
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      )}
    </>
  );
}
