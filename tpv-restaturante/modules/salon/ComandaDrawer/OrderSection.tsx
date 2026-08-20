import type { OrderItem, OrderInfo, CatalogProduct } from './types';
import { ChefHat, Minus, Plus, Edit3, X, Check, Percent } from 'lucide-react';
import { TICKET_EDGE, euros, type Theme } from '@/components/constants';

interface OrderSectionProps {
  selectedOrder: OrderInfo | null;
  actionItemId: string | null;
  setActionItemId: (v: string | null) => void;
  editNotesId: string | null;
  setEditNotesId: React.Dispatch<React.SetStateAction<string | null>>;
  notesInput: string;
  setNotesInput: (v: string) => void;
  showQtyModal: { item: OrderItem } | null;
  setShowQtyModal: (v: { item: OrderItem } | null) => void;
  qtyNumpad: string;
  setQtyNumpad: (v: string) => void;
  showBulkCourseModal: boolean;
  setShowBulkCourseModal: (v: boolean) => void;
  showLineDiscount: OrderItem | null;
  setShowLineDiscount: (v: OrderItem | null) => void;
  showPriceEdit: OrderItem | null;
  setShowPriceEdit: (v: OrderItem | null) => void;
  showVoidItem: string | null;
  setShowVoidItem: (v: string | null) => void;
  voidReason: string;
  setVoidReason: (v: string) => void;
  showDiscountModal: boolean;
  setShowDiscountModal: (v: boolean) => void;
  discountInput: string;
  setDiscountInput: (v: string) => void;
  allCourses: string[];
  orderTotal: number;
  orderDiscount: number;
  setOrderDiscount: (v: number) => void;
  tipAmount: number;
  finalTotal: number;
  catalog: { products: CatalogProduct[] };
  setPriceNumpad: (v: string) => void;
  onChangeQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onUpdateItemCourse: (itemId: string, course: string) => void;
  onEditItemModifiers: (item: OrderItem, product: CatalogProduct) => void;
  onSetItemDiscount: (itemId: string, pct: number) => void;
  onRemoveItemDiscount: (itemId: string) => void;
  onSetItemCourtesy: (itemId: string) => void;
  onRemoveItemCourtesy: (itemId: string) => void;
  onSetItemPrice: (itemId: string, price: number | null) => void;
  onVoidSentItem: (itemId: string, reason: string) => void;
  onSendItemToKitchen: (itemId: string) => void;
  handleSaveNotes: () => void;
  handleOpenNotes: (item: OrderItem) => void;
  handleBulkCourse: (course: string) => void;
  handleQtyConfirm: () => void;
  qtyPress: (digit: number) => void;
  isDebtOnly: boolean;
  C: Theme;
}

export default function OrderSection({
  selectedOrder,
  actionItemId,
  setActionItemId,
  editNotesId,
  setEditNotesId,
  notesInput,
  setNotesInput,
  setShowQtyModal,
  setQtyNumpad,
  setShowBulkCourseModal,
  setShowLineDiscount,
  setShowPriceEdit,
  showVoidItem,
  setShowVoidItem,
  voidReason,
  setVoidReason,
  showDiscountModal,
  setShowDiscountModal,
  discountInput,
  setDiscountInput,
  allCourses,
  orderTotal,
  orderDiscount,
  setOrderDiscount,
  tipAmount,
  finalTotal,
  catalog,
  setPriceNumpad,
  onChangeQty,
  onRemoveItem,
  onUpdateItemCourse,
  onEditItemModifiers,
  onSetItemCourtesy,
  onRemoveItemCourtesy,
  onSetItemPrice,
  onSendItemToKitchen,
  handleSaveNotes,
  handleOpenNotes,
  isDebtOnly,
  C,
}: OrderSectionProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ borderTop: `1px solid ${C.line}` }}>
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
            const effectivePrice = (disc > 0 ? item.price * (1 - disc / 100) : item.price) || 0;
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
                          const idx = courses.indexOf(item.course!);
                          const next = courses[(idx + 1) % courses.length] || '';
                          onUpdateItemCourse(item.id, next);
                        }}>
                        Curso: {item.course}
                      </span>
                    )}
                    {disc > 0 && !item.lineDiscount && (
                      <span className="text-[10px] ml-1" style={{ color: C.wineLight }}>-{disc}%</span>
                    )}
                    {(item.lineDiscount ?? 0) > 0 && (
                      <span className="text-[10px] ml-1" style={{ color: C.wineLight }}>-{item.lineDiscount ?? 0}%</span>
                    )}
                    {item.isCourtesy && (
                      <span className="text-[10px] ml-1 font-bold" style={{ color: C.sage }}>INVITACIÓN</span>
                    )}
                    {item.overridePrice != null && (
                      <span className="text-[10px] ml-1" style={{ color: C.brassLight }}>Precio editado</span>
                    )}
                    {item.voided && (
                      <span className="text-[10px] ml-1 font-bold" style={{ color: C.wineLight }}>
                        ANULADO{item.voidReason ? `: ${item.voidReason}` : ''}
                      </span>
                    )}
                    {item.modifiers && item.modifiers.length > 0 && (
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
                        <button onClick={() => onSendItemToKitchen(item.id)}
                          className="p-0.5" style={{ color: C.sage }}>
                          <ChefHat className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="w-5 text-center text-xs">{item.qty}</span>
                        {!item.voided && (
                          <button onClick={() => { setVoidReason(''); setShowVoidItem(item.id); }}
                            style={{ color: C.wineLight }} className="p-0.5 hover:opacity-80">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <span className="w-16 text-right shrink-0">{euros(effectivePrice * item.qty)}</span>
                </div>

                {showActions && (
                  <div className="flex flex-wrap gap-1 py-1.5 px-2" style={{ background: 'rgba(0,0,0,0.03)' }}>
                    <button onClick={() => { setShowQtyModal({ item }); setQtyNumpad(String(item.qty)); setActionItemId(null); }}
                      style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                      className="text-[10px] px-2 py-1 rounded-lg">Cambiar cantidad</button>
                    {product && !item.isFreeItem && (
                      <button onClick={() => { setActionItemId(null); onEditItemModifiers(item, product); }}
                        style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                        className="text-[10px] px-2 py-1 rounded-lg">Editar opciones</button>
                    )}
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
                    {!item.sent && (
                      <button onClick={() => { setShowLineDiscount(item); setActionItemId(null); }}
                        style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                        className="text-[10px] px-2 py-1 rounded-lg">
                        {(item.lineDiscount ?? 0) > 0 ? `-${item.lineDiscount ?? 0}%` : 'Descuento línea'}
                      </button>
                    )}
                    {!item.sent && (
                      <button onClick={() => {
                        if (item.isCourtesy) { onRemoveItemCourtesy(item.id); }
                        else { onSetItemCourtesy(item.id); }
                        setActionItemId(null);
                      }}
                        style={{
                          background: item.isCourtesy ? C.sage + '30' : C.surfaceLight,
                          border: `1px solid ${item.isCourtesy ? C.sage : C.line}`,
                          color: item.isCourtesy ? C.sageLight : C.cream,
                        }}
                        className="text-[10px] px-2 py-1 rounded-lg">
                        {item.isCourtesy ? 'Quitar cortesía' : 'Cortesía'}
                      </button>
                    )}
                    {!item.sent && (
                      <button onClick={() => { setPriceNumpad(String((item.overridePrice ?? item.price) || '')); setShowPriceEdit(item); setActionItemId(null); }}
                        style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                        className="text-[10px] px-2 py-1 rounded-lg">
                        {item.overridePrice != null ? `${item.overridePrice.toFixed(2)}€` : 'Editar precio'}
                      </button>
                    )}
                    <button onClick={() => { handleOpenNotes(item); setActionItemId(null); }}
                      style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                      className="text-[10px] px-2 py-1 rounded-lg">
                      {item.notes ? '📝 ' : ''}Nota
                    </button>
                    {!item.sent && (
                      <button onClick={() => { onRemoveItem(item.id); setActionItemId(null); }}
                        style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
                        className="text-[10px] px-2 py-1 rounded-lg">Eliminar</button>
                    )}
                  </div>
                )}

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

      <div style={{ background: C.surfaceLight, color: C.muted }} className="px-4 py-2 text-xs flex gap-2">
        <button
          onClick={() => { setDiscountInput(String(orderDiscount)); setShowDiscountModal(true); }}
          className="flex items-center gap-1 hover:opacity-80"
        >
          <Percent className="w-3.5 h-3.5" /> {orderDiscount > 0 ? `${orderDiscount}%` : 'Descuento'}
        </button>
      </div>
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
  );
}
