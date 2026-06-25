import { useState } from 'react';
import {
  ArrowLeft, Receipt, ChefHat, CreditCard,
  Plus, Minus, Percent, X, Trash2, AlertTriangle, Check, StickyNote,
} from 'lucide-react';
import { TICKET_EDGE, euros, ALLERGENS, ALLERGEN_COLORS } from './constants';

export default function ComandaDrawer({
  selectedTable, selectedOrder,
  catalog, activeCategory, setActiveCategory,
  orderTotal, orderDiscount, setOrderDiscount, tipAmount, finalTotal,
  onClose, onAddItem, onChangeQty, onRemoveItem, onCancelTable,
  onSendToKitchenCourse, onToggleCuenta,
  onOpenPayment, onResetTable,
  onUpdateNotes,
  colors: C,
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editNotesId, setEditNotesId] = useState(null);
  const [notesInput, setNotesInput] = useState('');

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

        {/* ── Categorías ── */}
        {!isDebtOnly && (
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

        {/* ── Productos ── */}
        {!isDebtOnly && (
          <div className="grid grid-cols-2 gap-2 p-4 overflow-y-auto" style={{ maxHeight: '32%' }}>
            {catalog.products
              .filter(p => activeCategory === 'Todos' || p.category === activeCategory)
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
                            <span className="w-5 text-center text-xs">{item.qty}</span>
                            <button onClick={() => onChangeQty(item.id, 1)} className="p-0.5">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="w-5 text-center text-xs">{item.qty}</span>
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              style={{ color: C.wineLight }}
                              className="p-0.5 hover:opacity-80"
                              title="Eliminar línea"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleOpenNotes(item)}
                          className="p-0.5 hover:opacity-80"
                          title="Añadir notas"
                          style={{ color: item.notes ? C.brass : '#9a8e80' }}
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="w-16 text-right shrink-0">{euros(effectivePrice * item.qty)}</span>
                    </div>
                    {/* Notes input inline */}
                    {editNotesId === item.id && (
                      <div className="flex gap-1 py-1 px-2" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <input
                          type="text"
                          value={notesInput}
                          onChange={e => setNotesInput(e.target.value)}
                          placeholder="Notas..."
                          className="flex-1 text-xs px-2 py-1 rounded border font-sans"
                          style={{ border: '1px solid #d4c4aa', background: '#fff' }}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveNotes(); if (e.key === 'Escape') setEditNotesId(null); }}
                        />
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
    </div>
  );
}
