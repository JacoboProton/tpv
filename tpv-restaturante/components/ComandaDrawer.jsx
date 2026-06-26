import { useState, useMemo } from 'react';
import {
  ArrowLeft, Receipt, ChefHat, CreditCard,
  Plus, Minus, Percent, X, Trash2, AlertTriangle, Check, Package, Tag, Search, Edit3,
} from 'lucide-react';
import { TICKET_EDGE, euros, ALLERGENS, ALLERGEN_COLORS } from './constants';
import ComboSlotSelector from './ComboSlotSelector';
import MenuDelDiaSelector from './MenuDelDiaSelector';

export default function ComandaDrawer({
  selectedTable, selectedOrder,
  catalog, activeCategory, setActiveCategory,
  orderTotal, orderDiscount, setOrderDiscount, tipAmount, finalTotal,
  onClose, onAddItem, onChangeQty, onRemoveItem, onCancelTable,
  onSendToKitchenCourse, onToggleCuenta,
  onOpenPayment, onResetTable,
  onUpdateNotes, onUpdateItemCourse, onEditItemModifiers,
  combos, mealMenus,
  colors: C,
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editNotesId, setEditNotesId] = useState(null);
  const [notesInput, setNotesInput] = useState('');
  const [configuringCombo, setConfiguringCombo] = useState(null);
  const [configuringMenu, setConfiguringMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFreeItemModal, setShowFreeItemModal] = useState(false);
  const [freeItemName, setFreeItemName] = useState('');
  const [freeItemPrice, setFreeItemPrice] = useState(0);
  const [freeItemCourse, setFreeItemCourse] = useState('');
  const [showBulkCourseModal, setShowBulkCourseModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(null); // { item, value }
  const [qtyNumpad, setQtyNumpad] = useState('1');
  const [actionItemId, setActionItemId] = useState(null); // for inline action menu

  const allCourses = useMemo(() => {
    const s = new Set();
    (catalog?.products || []).forEach(p => { if (p.course) s.add(p.course); });
    return [...s].sort();
  }, [catalog?.products]);

  if (!selectedTable) return null;

  const isStaleState = !selectedOrder && (selectedTable.status === 'cuenta' || selectedTable.status === 'ocupada');
  const isDebtOnly   = selectedOrder?.items?.length === 1 && selectedOrder.items[0].productId === null;
  const hasItems     = selectedOrder && selectedOrder.items.length > 0;
  const isCuenta     = selectedTable.status === 'cuenta';

  const unsentCourses = selectedOrder
    ? [...new Set(selectedOrder.items.filter(i => !i.sent).map(i => i.course).filter(Boolean))]
    : [];

  function handleCancelTable() {
    setConfirmCancel(false);
    onCancelTable();
  }

  function handleOpenNotes(item) {
    setEditNotesId(item.id);
    setNotesInput(item.notes || '');
  }

  function handleSaveNotes() {
    if (editNotesId) onUpdateNotes(editNotesId, notesInput);
    setEditNotesId(null);
    setNotesInput('');
  }

  function handleFreeItemAdd() {
    if (!freeItemName.trim() || freeItemPrice <= 0) return;
    onAddItem({
      id: 'free_' + Date.now(),
      name: freeItemName.trim(),
      price: freeItemPrice,
      category: '',
      course: freeItemCourse || '',
      ubicacion: 'Cocina',
      allergens: [],
      isFreeItem: true,
    });
    setShowFreeItemModal(false);
    setFreeItemName('');
    setFreeItemPrice(0);
    setFreeItemCourse('');
  }

  function handleQtyConfirm() {
    if (!showQtyModal) return;
    const val = parseInt(qtyNumpad, 10);
    if (val > 0) {
      onChangeQty(showQtyModal.item.id, val - showQtyModal.item.qty);
    } else {
      onRemoveItem(showQtyModal.item.id);
    }
    setShowQtyModal(null);
    setQtyNumpad('1');
  }

  function qtyPress(digit) {
    setQtyNumpad(prev => {
      const next = prev === '1' ? String(digit) : prev + String(digit);
      return Math.min(parseInt(next, 10) || 1, 999).toString();
    });
  }

  function handleBulkCourse(course) {
    if (!selectedOrder) return;
    for (const item of selectedOrder.items) {
      if (!item.sent) {
        onUpdateItemCourse(item.id, course);
      }
    }
    setShowBulkCourseModal(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end no-print">
      <div onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />

      <div
        style={{ background: C.surface, borderLeft: `1px solid ${C.line}` }}
        className="relative w-full sm:w-[26rem] h-full flex flex-col fade-up"
      >
        {/* ── Cabecera ── */}
        <div style={{ borderBottom: `1px solid ${C.line}` }} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onClose} style={{ color: C.muted }} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl" style={{ color: C.cream }}>{selectedTable.name}</h2>
          </div>

          <div className="flex items-center gap-2">
            {hasItems && !isDebtOnly && (
              <button
                onClick={() => setConfirmCancel(true)}
                style={{ color: C.wineLight }}
                className="p-1.5 rounded-lg hover:opacity-80"
                title="Cancelar mesa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {selectedTable.isFiado && !selectedOrder ? (
              <button
                onClick={onOpenPayment}
                style={{ background: C.wine, color: C.cream }}
                className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
              >
                💳 Pagar deuda
              </button>
            ) : (
              !isCuenta && (
                <button
                  onClick={onToggleCuenta}
                  style={{ color: C.brassLight, border: `1px solid ${C.brass}` }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5" /> Pedir cuenta
                </button>
              )
            )}
          </div>
        </div>

        {/* ── Banner: cuenta pedida ── */}
        {isCuenta && !isDebtOnly && (
          <div
            style={{ background: C.surfaceLight, borderBottom: `1px solid ${C.line}` }}
            className="px-4 py-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 shrink-0" style={{ color: C.brassLight }} />
              <p className="text-sm font-medium" style={{ color: C.brassLight }}>Cuenta pedida</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onToggleCuenta}
                style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.muted }}
                className="flex-1 rounded-lg py-2 text-xs font-medium hover:opacity-80"
              >
                Cancelar cuenta
              </button>
              <button
                onClick={() => setConfirmCancel(true)}
                style={{ background: C.wine, color: C.cream }}
                className="flex-1 rounded-lg py-2 text-xs font-medium hover:opacity-80"
              >
                Cancelar mesa
              </button>
              <button
                onClick={onOpenPayment}
                disabled={!hasItems}
                style={{ background: C.brass, color: C.base }}
                className="flex-1 rounded-lg py-2 text-xs font-semibold hover:opacity-80 disabled:opacity-40"
              >
                Cobrar
              </button>
            </div>
          </div>
        )}

        {/* ── Confirmación cancelar mesa ── */}
        {confirmCancel && (
          <div style={{ background: C.wine, color: C.cream }} className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium">¿Cancelar toda la mesa?</p>
            </div>
            <p className="text-xs opacity-80">
              Se eliminará el pedido y la mesa quedará libre. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleCancelTable}
                style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.5)' }}
                className="flex-1 rounded-lg py-2 text-xs font-semibold hover:opacity-90"
              >
                Sí, cancelar mesa
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}
                className="flex-1 rounded-lg py-2 text-xs hover:opacity-90"
              >
                Volver
              </button>
            </div>
          </div>
        )}

        {/* ── Banner estado inconsistente ── */}
        {isStaleState && (
          <div style={{ background: C.wine, color: C.cream }} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span>Mesa con estado incorrecto. Puedes liberarla.</span>
            <button
              onClick={onResetTable}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90"
            >
              Liberar mesa
            </button>
          </div>
        )}

        {/* ── Carrusel Destacados ── */}
        {!isDebtOnly && (() => {
          const featured = (catalog?.products || [])
            .filter(p => p.carousel_sort !== null && p.carousel_sort !== undefined && p.active !== false)
            .sort((a, b) => (a.carousel_sort || 0) - (b.carousel_sort || 0));
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
                placeholder="Buscar productos..."
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
            {['Todos', ...catalog.categories].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: activeCategory === cat ? C.brass : C.surfaceLight,
                  color:      activeCategory === cat ? C.base  : C.muted,
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
              >
                {cat}
              </button>
            ))}
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
                if (searchQuery) return p.name.toLowerCase().includes(searchQuery.toLowerCase());
                return activeCategory === 'Todos' || p.category === activeCategory;
              })
              .map(p => {
                const disc = p.discount || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => onAddItem(p)}
                    disabled={p.stock <= 0}
                    style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, opacity: p.stock <= 0 ? 0.4 : 1 }}
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
                      {p.allergens?.length > 0 && (
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

        {/* ── Ticket ── */}
        <div className="flex-1 flex flex-col min-h-0" style={{ borderTop: `1px solid ${C.line}` }}>
          {/* Ticket header with bulk course */}
          {selectedOrder && selectedOrder.items.some(i => !i.sent) && (
            <div style={{ background: C.cream, borderBottom: '1px dashed #d4c4aa' }} className="px-4 py-1.5 flex items-center gap-2">
              <button onClick={() => setShowBulkCourseModal(true)}
                style={{ color: '#9a8e80' }}
                className="text-[10px] flex items-center gap-1 hover:opacity-80">
                <ChefHat className="w-3 h-3" /> Marcar todos como...
              </button>
            </div>
          )}

          <div style={TICKET_EDGE} />
          <div style={{ background: C.cream, color: C.base }} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm">
            {!selectedOrder || selectedOrder.items.length === 0 ? (
              <p style={{ color: '#9a8e80' }} className="text-center py-6 text-xs">
                Sin artículos todavía. Toca un producto para añadirlo.
              </p>
            ) : (
              selectedOrder.items.map(item => {
                const product = catalog.products.find(p => p.id === item.productId);
                const disc = product?.discount || 0;
                const effectivePrice = disc > 0 ? item.price * (1 - disc / 100) : item.price;
                const showActions = actionItemId === item.id;

                return (
                  <div key={item.id}>
                    <div
                      className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: '1px dashed #d4c4aa' }}
                    >
                      <div className="flex-1 pr-2 min-w-0">
                        <p className="leading-tight truncate">{item.name}</p>
                        {item.sent && (
                          <span style={{ color: item.ready ? C.sage : '#b89850' }} className="text-[11px]">
                            {item.ready ? '✓ servido' : '● en cocina'}
                          </span>
                        )}
                        {item.course && (
                          <span className="text-[10px] ml-1 cursor-pointer hover:opacity-70"
                            style={{ color: '#b89850' }}
                            onClick={() => {
                              const courses = allCourses;
                              const idx = courses.indexOf(item.course);
                              const next = courses[(idx + 1) % courses.length] || '';
                              onUpdateItemCourse(item.id, next);
                            }}>
                            Curso: {item.course}
                          </span>
                        )}
                        {disc > 0 && (
                          <span className="text-[10px] ml-1" style={{ color: C.wineLight }}>-{disc}%</span>
                        )}
                        {item.modifiers?.length > 0 && (
                          <p className="text-[10px]" style={{ color: '#9a8e80' }}>
                            {item.modifiers.map(m => m.optionName).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] italic truncate" style={{ color: '#9a8e80' }}>📝 {item.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!item.sent ? (
                          <>
                            <button onClick={() => onChangeQty(item.id, -1)} className="p-0.5">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setShowQtyModal({ item }); setQtyNumpad(String(item.qty)); }}
                              className="w-6 text-center text-xs font-bold hover:opacity-70" style={{ color: C.base }}>
                              {item.qty}
                            </button>
                            <button onClick={() => onChangeQty(item.id, 1)} className="p-0.5">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setActionItemId(showActions ? null : item.id)}
                              className="p-0.5 hover:opacity-80" style={{ color: showActions ? C.brass : '#9a8e80' }}>
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="w-5 text-center text-xs">{item.qty}</span>
                            <button onClick={() => onRemoveItem(item.id)}
                              style={{ color: C.wineLight }} className="p-0.5 hover:opacity-80">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <span className="w-16 text-right shrink-0">{euros(effectivePrice * item.qty)}</span>
                    </div>

                    {/* Action menu */}
                    {showActions && (
                      <div className="flex flex-wrap gap-1 py-1.5 px-2" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        {/* Qty */}
                        <button onClick={() => { setShowQtyModal({ item }); setQtyNumpad(String(item.qty)); setActionItemId(null); }}
                          style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                          className="text-[10px] px-2 py-1 rounded-lg">Cambiar cantidad</button>
                        {/* Modifiers */}
                        {product && !item.isFreeItem && (
                          <button onClick={() => { setActionItemId(null); onEditItemModifiers(item, product); }}
                            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                            className="text-[10px] px-2 py-1 rounded-lg">Editar opciones</button>
                        )}
                        {/* Course */}
                        {allCourses.length > 0 && (
                          <div className="flex items-center gap-0.5">
                            {allCourses.map(c => (
                              <button key={c} onClick={() => { onUpdateItemCourse(item.id, c); setActionItemId(null); }}
                                style={{
                                  background: item.course === c ? C.brass + '30' : 'transparent',
                                  border: `1px solid ${item.course === c ? C.brass : C.line}`,
                                  color: item.course === c ? C.base : '#9a8e80',
                                }}
                                className="text-[10px] px-1.5 py-1 rounded">{c}</button>
                            ))}
                          </div>
                        )}
                        {/* Notes */}
                        <button onClick={() => { handleOpenNotes(item); setActionItemId(null); }}
                          style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                          className="text-[10px] px-2 py-1 rounded-lg">
                          {item.notes ? '📝 ' : ''}Nota
                        </button>
                        {/* Delete */}
                        <button onClick={() => { onRemoveItem(item.id); setActionItemId(null); }}
                          style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
                          className="text-[10px] px-2 py-1 rounded-lg">Eliminar</button>
                      </div>
                    )}

                    {/* Notes input inline */}
                    {editNotesId === item.id && (
                      <div className="flex gap-1 py-1 px-2" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <input type="text" value={notesInput}
                          onChange={e => setNotesInput(e.target.value)}
                          placeholder="Notas para cocina..."
                          className="flex-1 text-xs px-2 py-1 rounded border font-sans"
                          style={{ border: '1px solid #d4c4aa', background: '#fff' }}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveNotes(); if (e.key === 'Escape') setEditNotesId(null); }} />
                        <button onClick={handleSaveNotes} className="p-1" style={{ color: C.sage }}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Subtotales */}
          <div
            style={{ background: C.cream, color: C.base, borderTop: '1px dashed #d4c4aa' }}
            className="px-4 py-1 font-mono text-xs"
          >
            <div className="flex justify-between py-1">
              <span>Subtotal</span><span>{euros(orderTotal)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between py-1" style={{ color: C.sage }}>
                <span>Descuento {orderDiscount}%</span>
                <span>-{euros(orderTotal * orderDiscount / 100)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between py-1" style={{ color: C.brass }}>
                <span>Propina</span><span>+{euros(tipAmount)}</span>
              </div>
            )}
          </div>
          <div style={{ background: C.cream, color: C.base }} className="px-4 py-3 font-mono flex justify-between text-base font-semibold">
            <span>TOTAL</span><span>{euros(finalTotal)}</span>
          </div>

          {/* Barra descuento */}
          <div style={{ background: C.surfaceLight, color: C.muted }} className="px-4 py-2 text-xs flex gap-2">
            <button
              onClick={() => { setDiscountInput(String(orderDiscount)); setShowDiscountModal(true); }}
              className="flex items-center gap-1 hover:opacity-80"
            >
              <Percent className="w-3.5 h-3.5" /> {orderDiscount > 0 ? `${orderDiscount}%` : 'Descuento'}
            </button>
          </div>
          {/* Modal descuento */}
          {showDiscountModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.65)' }}
              onClick={() => setShowDiscountModal(false)}
            >
              <div
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="w-full max-w-xs rounded-xl p-5 fade-up"
                onClick={e => e.stopPropagation()}
              >
                <p className="font-display text-lg mb-3" style={{ color: C.cream }}>Descuento</p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="number" min="0" max="100"
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    style={{ background: C.surfaceLight, color: C.cream }}
                    className="flex-1 rounded-lg px-3 py-2.5 text-lg font-mono text-center"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') { setOrderDiscount(Math.min(100, Math.max(0, parseFloat(discountInput) || 0))); setShowDiscountModal(false); } }}
                  />
                  <span style={{ color: C.muted }} className="text-lg">%</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setOrderDiscount(Math.min(100, Math.max(0, parseFloat(discountInput) || 0))); setShowDiscountModal(false); }}
                    style={{ background: C.brass, color: C.base }}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Aplicar
                  </button>
                  <button
                    onClick={() => setShowDiscountModal(false)}
                    style={{ color: C.muted, background: C.surfaceLight }}
                    className="flex-1 rounded-lg py-2.5 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Acciones principales (solo visibles si NO está en estado "cuenta") ── */}
        {!isCuenta && (
          <div className="p-4 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
            {!isDebtOnly && unsentCourses.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {unsentCourses.map(course => {
                  const count = selectedOrder.items.filter(i => !i.sent && i.course === course).length;
                  const colors = { Entrantes: '#7a9a7c', Principales: '#c4a04a', Postres: '#b05e5e' };
                  const color = colors[course] || C.sage;
                  return (
                    <button
                      key={course}
                      onClick={() => onSendToKitchenCourse(course)}
                      style={{ background: color, color: '#fff', border: `1px solid ${color}` }}
                      className="flex-1 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <ChefHat className="w-3.5 h-3.5" /> {course} ({count})
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={onOpenPayment}
              disabled={!selectedOrder || selectedOrder.items.length === 0}
              style={{
                background: finalTotal > 0 ? C.brass : C.surface,
                color:      finalTotal > 0 ? C.base  : C.muted,
              }}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" /> Cobrar
            </button>
          </div>
        )}
      </div>

      {/* ── Modal Artículo libre (Varios) ── */}
      {showFreeItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowFreeItemModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-3" style={{ color: C.cream }}>Artículo libre</p>
            <input value={freeItemName} onChange={e => setFreeItemName(e.target.value)}
              placeholder="Nombre del artículo"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2.5 text-sm mb-2" autoFocus />
            <div className="flex items-center gap-2 mb-2">
              <input type="number" step="0.1" min="0" value={freeItemPrice}
                onChange={e => setFreeItemPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={{ background: C.surfaceLight, color: C.brassLight, border: `1px solid ${C.line}` }}
                className="flex-1 rounded-lg px-3 py-2.5 text-lg font-mono text-center" />
              <span style={{ color: C.muted }}>€</span>
            </div>
            <div className="flex items-center gap-1.5 mb-4">
              <span style={{ color: C.muted }} className="text-xs">Curso:</span>
              {['', ...allCourses].map(c => (
                <button key={c || 'sin'} onClick={() => setFreeItemCourse(c)}
                  style={{
                    background: freeItemCourse === c ? C.brass + '30' : C.surfaceLight,
                    border: `1px solid ${freeItemCourse === c ? C.brass : C.line}`,
                    color: freeItemCourse === c ? C.cream : C.muted,
                  }}
                  className="text-[10px] px-2 py-1 rounded-lg capitalize">{c || 'Sin curso'}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFreeItemModal(false)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={handleFreeItemAdd} disabled={!freeItemName.trim() || freeItemPrice <= 0}
                style={{ background: freeItemName.trim() && freeItemPrice > 0 ? C.sage : C.surfaceLight, color: freeItemName.trim() && freeItemPrice > 0 ? '#fff' : C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed">Añadir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Cantidad (numpad) ── */}
      {showQtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowQtyModal(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>{showQtyModal.item.name}</p>
            <p className="text-xs mb-4" style={{ color: C.muted }}>Cambiar cantidad</p>
            <div className="text-center mb-4">
              <span style={{ background: C.surfaceLight, color: C.cream }}
                className="text-4xl font-mono font-bold px-6 py-3 rounded-xl inline-block">{qtyNumpad}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button key={n} onClick={() => qtyPress(n)}
                  style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                  className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">{n}</button>
              ))}
              <button onClick={() => setQtyNumpad('0')}
                style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">0</button>
              <button onClick={() => setQtyNumpad(prev => prev.length > 1 ? prev.slice(0, -1) : '1')}
                style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">⌫</button>
              <button onClick={() => setQtyNumpad('1')}
                style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.muted }}
                className="rounded-lg py-3 text-lg font-mono hover:opacity-80">C</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowQtyModal(null)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={handleQtyConfirm}
                style={{ background: C.brass, color: C.base }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Marcar todos como... ── */}
      {showBulkCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowBulkCourseModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-3" style={{ color: C.cream }}>Marcar todos como...</p>
            <p className="text-xs mb-3" style={{ color: C.muted }}>Asignar curso a todos los artículos nuevos</p>
            <div className="flex flex-col gap-1.5">
              {allCourses.map(c => {
                const count = selectedOrder?.items.filter(i => !i.sent).length || 0;
                return (
                  <button key={c} onClick={() => handleBulkCourse(c)}
                    style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                    className="rounded-lg px-3 py-2.5 text-sm text-left font-medium hover:opacity-80">{c} ({count})</button>
                );
              })}
            </div>
            <button onClick={() => setShowBulkCourseModal(false)}
              style={{ color: C.muted, background: C.surfaceLight, marginTop: 8 }}
              className="w-full rounded-lg py-2.5 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {configuringCombo && (
        <ComboSlotSelector
          combo={configuringCombo}
          catalog={catalog}
          colors={C}
          onConfirm={(selections) => {
            onAddItem({
              id: configuringCombo.id,
              name: configuringCombo.name,
              price: configuringCombo.price,
              category: 'Combos',
              course: '', ubicacion: 'Cocina',
              allergens: [],
              isCombo: true,
              comboData: configuringCombo,
              comboSel: selections,
            });
            setConfiguringCombo(null);
          }}
          onClose={() => setConfiguringCombo(null)}
        />
      )}

      {configuringMenu && (
        <MenuDelDiaSelector
          menu={configuringMenu}
          catalog={catalog}
          colors={C}
          onConfirm={(selections, menu) => {
            onAddItem({
              id: menu.id,
              name: menu.name,
              price: menu.price,
              category: 'Menú del día',
              course: '', ubicacion: 'Cocina',
              allergens: [],
              isMenu: true,
              menuData: menu,
              menuSel: selections,
            });
            setConfiguringMenu(null);
          }}
          onClose={() => setConfiguringMenu(null)}
        />
      )}
    </div>
  );
}
