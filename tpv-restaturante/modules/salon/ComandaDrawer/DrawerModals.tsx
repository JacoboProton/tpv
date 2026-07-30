import type { OrderItem, OrderInfo, FloorData, CatalogProduct, HistoryEntry, ComboData, MealMenuData } from './types';
import type { Table } from '@tpv/core';
import type { Theme } from '@/components/constants';
import { Check } from 'lucide-react';
import ComboSlotSelector from '@/components/modals/ComboSlotSelector';
import MenuDelDiaSelector from '@/components/modals/MenuDelDiaSelector';

interface DrawerModalsProps {
  showFreeItemModal: boolean;
  setShowFreeItemModal: (v: boolean) => void;
  freeItemName: string;
  setFreeItemName: React.Dispatch<React.SetStateAction<string>>;
  freeItemPrice: number;
  setFreeItemPrice: (v: number) => void;
  freeItemCourse: string;
  setFreeItemCourse: (v: string) => void;
  handleFreeItemAdd: () => void;
  showQtyModal: { item: OrderItem } | null;
  setShowQtyModal: (v: { item: OrderItem } | null) => void;
  qtyNumpad: string;
  setQtyNumpad: React.Dispatch<React.SetStateAction<string>>;
  qtyPress: (digit: number) => void;
  handleQtyConfirm: () => void;
  showBulkCourseModal: boolean;
  setShowBulkCourseModal: (v: boolean) => void;
  allCourses: string[];
  handleBulkCourse: (course: string) => void;
  selectedOrder: OrderInfo | null;
  configuringCombo: ComboData | null;
  setConfiguringCombo: (v: ComboData | null) => void;
  catalog: { products: CatalogProduct[] };
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  todayHistory: HistoryEntry[];
  currentTableId: string;
  onReopenOrder: (tableId: string, order: HistoryEntry) => void;
  showVoidConfirm: boolean;
  setShowVoidConfirm: (v: boolean) => void;
  selectedTable: Table;
  onVoidTable: () => void;
  showCustomerSearch: boolean;
  setShowCustomerSearch: (v: boolean) => void;
  customerQuery: string;
  setCustomerQuery: React.Dispatch<React.SetStateAction<string>>;
  customerResults: any[];
  setCustomerResults: React.Dispatch<React.SetStateAction<any[]>>;
  floor: FloorData;
  onLinkCustomer: (orderId: string | undefined, customer: { id: string; name: string; phone: string }) => void;
  showLineDiscount: OrderItem | null;
  setShowLineDiscount: (v: OrderItem | null) => void;
  onSetItemDiscount: (itemId: string, pct: number) => void;
  onRemoveItemDiscount: (itemId: string) => void;
  showPriceEdit: OrderItem | null;
  setShowPriceEdit: (v: OrderItem | null) => void;
  priceNumpad: string;
  setPriceNumpad: React.Dispatch<React.SetStateAction<string>>;
  onSetItemPrice: (itemId: string, price: number | null) => void;
  showPersonalPIN: boolean;
  setShowPersonalPIN: (v: boolean) => void;
  personalPinInput: string;
  setPersonalPinInput: React.Dispatch<React.SetStateAction<string>>;
  onApplyPersonalDiscount: (orderId: string, pin: string) => Promise<boolean>;
  showVoidItem: string | null;
  setShowVoidItem: (v: string | null) => void;
  voidReason: string;
  setVoidReason: React.Dispatch<React.SetStateAction<string>>;
  onVoidSentItem: (itemId: string, reason: string) => void;
  configuringMenu: MealMenuData | null;
  setConfiguringMenu: (v: MealMenuData | null) => void;
  onAddItem: (item: Partial<OrderItem> & { id?: string; name: string; price: number; category: string; course: string; ubicacion: string; allergens: string[] }) => void;
  showMoveModal: boolean;
  setShowMoveModal: (v: boolean) => void;
  moveDestId: string | null;
  setMoveDestId: (v: string | null) => void;
  onMoveTable: (currentId: string, destId: string | null) => void;
  showMergeModal: boolean;
  setShowMergeModal: (v: boolean) => void;
  mergeSelected: string[];
  setMergeSelected: React.Dispatch<React.SetStateAction<string[]>>;
  onMergeTables: (currentId: string, ids: string[]) => void;
  C: Theme;
}

export function DrawerModals({
  showFreeItemModal, setShowFreeItemModal,
  freeItemName, setFreeItemName,
  freeItemPrice, setFreeItemPrice,
  freeItemCourse, setFreeItemCourse,
  handleFreeItemAdd,
  showQtyModal, setShowQtyModal,
  qtyNumpad, setQtyNumpad,
  qtyPress, handleQtyConfirm,
  showBulkCourseModal, setShowBulkCourseModal,
  allCourses,
  handleBulkCourse,
  selectedOrder,
  configuringCombo, setConfiguringCombo,
  catalog,
  showHistory, setShowHistory,
  todayHistory,
  currentTableId,
  onReopenOrder,
  showVoidConfirm, setShowVoidConfirm,
  selectedTable,
  onVoidTable,
  showCustomerSearch, setShowCustomerSearch,
  customerQuery, setCustomerQuery,
  customerResults, setCustomerResults,
  floor,
  onLinkCustomer,
  showLineDiscount, setShowLineDiscount,
  onSetItemDiscount,
  onRemoveItemDiscount,
  showPriceEdit, setShowPriceEdit,
  priceNumpad, setPriceNumpad,
  onSetItemPrice,
  showPersonalPIN, setShowPersonalPIN,
  personalPinInput, setPersonalPinInput,
  onApplyPersonalDiscount,
  showVoidItem, setShowVoidItem,
  voidReason, setVoidReason,
  onVoidSentItem,
  configuringMenu, setConfiguringMenu,
  onAddItem,
  showMoveModal, setShowMoveModal,
  moveDestId, setMoveDestId,
  onMoveTable,
  showMergeModal, setShowMergeModal,
  mergeSelected, setMergeSelected,
  onMergeTables,
  C,
}: DrawerModalsProps) {
  return (
    <>
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
          onConfirm={(selections: unknown) => {
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

      {/* ── Modal Historial ── */}
      {showHistory && todayHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowHistory(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-sm rounded-xl p-5 fade-up max-h-[80vh] flex flex-col">
            <p className="font-display text-lg mb-3" style={{ color: C.cream }}>Historial de hoy</p>
            <div className="flex-1 overflow-y-auto space-y-2">
              {todayHistory.map(h => (
                <div key={h.id} style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
                  className="rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: C.cream }}>
                      {h.label || h.id.slice(0, 8)}
                    </span>
                    <span className="text-xs" style={{ color: C.muted }}>
                      {new Date(h.closedAt || h.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: C.muted }}>
                    {h.items?.length || 0} artículos · {h.items?.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}€
                  </p>
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => { setShowHistory(false); onReopenOrder(currentTableId, h); }}
                      style={{ background: C.brass, color: C.base }}
                      className="flex-1 rounded-lg py-1.5 text-xs font-medium hover:opacity-80">
                      Reabrir
                    </button>
                  </div>
                </div>
              ))}
              {todayHistory.length === 0 && (
                <p style={{ color: C.muted }} className="text-sm text-center py-6">No hay tickets cerrados hoy.</p>
              )}
            </div>
            <button onClick={() => setShowHistory(false)}
              style={{ color: C.muted, background: C.surfaceLight, marginTop: 12 }}
              className="w-full rounded-lg py-2.5 text-sm">Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Modal Vaciar / liberar mesa ── */}
      {showVoidConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowVoidConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>Vaciar / liberar mesa</p>
            <p style={{ color: C.muted }} className="text-sm mb-4">
              Se descartarán todos los pedidos de <strong style={{ color: C.cream }}>{selectedTable.name || ''}</strong> sin cobrar.
              Los artículos ya enviados a cocina quedarán registrados como anulados.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowVoidConfirm(false)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={() => { setShowVoidConfirm(false); onVoidTable(); }}
                style={{ background: C.wine, color: C.cream }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold hover:opacity-90">
                Vaciar mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Vincular cliente ── */}
      {showCustomerSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowCustomerSearch(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-sm rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-3" style={{ color: C.cream }}>Vincular cliente</p>
            <input type="text" value={customerQuery} onChange={e => {
              const q = e.target.value;
              setCustomerQuery(q);
              if (q.length >= 2 && floor?.customers) {
                setCustomerResults(floor.customers.filter(c =>
                  c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)
                ));
              } else {
                setCustomerResults([]);
              }
            }}
              placeholder="Buscar por teléfono o nombre (mín. 2 caracteres)"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2.5 text-sm mb-3" autoFocus
            />
            {customerResults.length > 0 && (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-3">
                {customerResults.map(c => (
                  <button key={c.id} onClick={() => { onLinkCustomer(selectedOrder?.id, c); setShowCustomerSearch(false); }}
                    style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                    className="rounded-lg px-3 py-2 text-sm text-left hover:opacity-80"
                  >
                    {c.name} <span style={{ color: C.muted }}>{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {customerQuery.length >= 2 && customerResults.length === 0 && (
              <button onClick={() => {
                onLinkCustomer(selectedOrder?.id, { id: 'c_' + Date.now(), name: customerQuery, phone: '' });
                setShowCustomerSearch(false);
                setShowCustomerSearch(false);
              }}
                style={{ background: C.sage, color: '#fff' }}
                className="w-full rounded-lg py-2.5 text-sm font-medium hover:opacity-80"
              >
                {'+ Crear "'}{customerQuery}{'"'}
              </button>
            )}
            <button onClick={() => setShowCustomerSearch(false)}
              style={{ color: C.muted, background: C.surfaceLight, marginTop: 8 }}
              className="w-full rounded-lg py-2.5 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Modal Descuento por línea ── */}
      {showLineDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowLineDiscount(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>Descuento por línea</p>
            <p className="text-xs mb-4" style={{ color: C.muted }}>{showLineDiscount.name}</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[5, 10, 15, 20, 25, 50].map(pct => (
                <button key={pct} onClick={() => {
                  onSetItemDiscount(showLineDiscount.id, pct);
                  setShowLineDiscount(null);
                }}
                  style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                  className="rounded-lg py-3 text-sm font-medium hover:opacity-80">
                  {pct}%
                </button>
              ))}
            </div>
            {(showLineDiscount.lineDiscount ?? 0) > 0 && (
              <button onClick={() => { onRemoveItemDiscount(showLineDiscount.id); setShowLineDiscount(null); }}
                style={{ background: C.wine + '30', color: C.wineLight, border: `1px solid ${C.wine}` }}
                className="w-full rounded-lg py-2.5 text-sm font-medium hover:opacity-80">
                Quitar descuento
              </button>
            )}
            <button onClick={() => setShowLineDiscount(null)}
              style={{ color: C.muted, background: C.surfaceLight, marginTop: 8 }}
              className="w-full rounded-lg py-2.5 text-sm">Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Modal Editar precio ── */}
      {showPriceEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowPriceEdit(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>Editar precio</p>
            <p className="text-xs mb-3" style={{ color: C.muted }}>{showPriceEdit.name}</p>
            <div className="text-center mb-4">
              <span style={{ background: C.surfaceLight, color: C.brassLight }}
                className="text-3xl font-mono font-bold px-6 py-3 rounded-xl inline-block">
                {priceNumpad || '0'}€
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button key={n} onClick={() => setPriceNumpad(prev => prev + n)}
                  style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                  className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">{n}</button>
              ))}
              <button onClick={() => setPriceNumpad(prev => prev + '.')}
                style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">.</button>
              <button onClick={() => setPriceNumpad(prev => prev.slice(0, -1))}
                style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">⌫</button>
              <button onClick={() => setPriceNumpad('0')}
                style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.muted }}
                className="rounded-lg py-3 text-lg font-mono hover:opacity-80">C</button>
            </div>
            {showPriceEdit.overridePrice != null && (
              <button onClick={() => { onSetItemPrice(showPriceEdit.id, null); setShowPriceEdit(null); }}
                style={{ background: C.wine + '30', color: C.wineLight, border: `1px solid ${C.wine}` }}
                className="w-full rounded-lg py-2 text-sm mb-2 hover:opacity-80">
                Restaurar precio original
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowPriceEdit(null)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={() => { onSetItemPrice(showPriceEdit.id, parseFloat(priceNumpad) || 0); setShowPriceEdit(null); }}
                style={{ background: C.brass, color: C.base }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal PIN Descuento personal ── */}
      {showPersonalPIN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowPersonalPIN(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>Descuento personal</p>
            <p style={{ color: C.muted }} className="text-xs mb-4">
              El empleado debe teclear su PIN para aplicar el descuento.
            </p>
            <div className="text-center mb-4">
              <div style={{ background: C.surfaceLight, color: C.brassLight }}
                className="text-3xl font-mono font-bold px-6 py-3 rounded-xl inline-block tracking-[0.3em]">
                {personalPinInput.padEnd(4, '·')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} onClick={() => { if (personalPinInput.length < 4) setPersonalPinInput(p => p + n); }}
                  style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                  className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">{n}</button>
              ))}
              <button onClick={() => setPersonalPinInput(p => p.slice(0, -1))}
                style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">⌫</button>
              <button onClick={() => setPersonalPinInput('')}
                style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.muted }}
                className="rounded-lg py-3 text-lg font-mono hover:opacity-80">C</button>
              <button onClick={async () => {
                if (personalPinInput.length < 4) return;
                if (!selectedOrder?.id) return;
                const ok = await onApplyPersonalDiscount(selectedOrder.id, personalPinInput);
                if (ok) setShowPersonalPIN(false);
              }}
                disabled={personalPinInput.length < 4}
                style={{
                  background: personalPinInput.length === 4 ? C.sage : C.surfaceLight,
                  color: personalPinInput.length === 4 ? '#fff' : C.muted,
                }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80 disabled:cursor-not-allowed">
                OK
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPersonalPIN(false)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Anular artículo (enviado) ── */}
      {showVoidItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowVoidItem(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>Anular artículo</p>
            <p style={{ color: C.muted }} className="text-xs mb-4">
              El artículo ya fue enviado a cocina. Indica el motivo de la anulación.
            </p>
            {['Error de pedido', 'Cliente canceló', 'Producto dañado', 'Otro'].map(r => (
              <button key={r} onClick={() => setVoidReason(r)}
                style={{
                  background: voidReason === r ? C.brass + '30' : C.surfaceLight,
                  border: `1px solid ${voidReason === r ? C.brass : C.line}`,
                  color: C.cream,
                }}
                className="w-full text-left rounded-lg px-3 py-2.5 text-sm mb-1.5 hover:opacity-80"
              >
                {r}
              </button>
            ))}
            <input type="text" value={voidReason} onChange={e => setVoidReason(e.target.value)}
              placeholder="O escribe un motivo personalizado..."
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowVoidItem(null)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={() => { onVoidSentItem(showVoidItem, voidReason || 'Sin motivo'); setShowVoidItem(null); }}
                disabled={!voidReason}
                style={{ background: voidReason ? C.wine : C.surfaceLight, color: voidReason ? C.cream : C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed">
                Anular
              </button>
            </div>
          </div>
        </div>
      )}

      {configuringMenu && (
        <MenuDelDiaSelector
          menu={configuringMenu}
          catalog={catalog}
          colors={C}
          onConfirm={(selections: unknown, menu: MealMenuData) => {
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

      {/* ── Modal Mover mesa ── */}
      {showMoveModal && floor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowMoveModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-sm rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>Mover mesa</p>
            <p style={{ color: C.muted }} className="text-xs mb-4">
              Trasladar el pedido de <strong style={{ color: C.cream }}>{selectedTable.name || ''}</strong> a otra mesa.
            </p>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto mb-4">
              {floor.tables
                .filter((t: Table) => t.id !== currentTableId && t.status === 'libre' && !t.reserved_for)
                .map(t => (
                  <button key={t.id} onClick={() => setMoveDestId(t.id)}
                    style={{
                      background: moveDestId === t.id ? C.brass + '30' : C.surfaceLight,
                      border: `1px solid ${moveDestId === t.id ? C.brass : C.line}`,
                      color: C.cream,
                    }}
                    className="rounded-lg px-4 py-3 text-sm text-left font-medium flex items-center justify-between hover:opacity-80"
                  >
                    <span>{t.name}</span>
                    <span style={{ color: C.muted }} className="text-xs">{t.type === 'barra' ? 'Barra' : 'Mesa'}</span>
                  </button>
                ))}
              {(floor.tables ?? []).filter((t: Table) => t.id !== currentTableId && t.status === 'libre' && !t.reserved_for).length === 0 && (
                <p style={{ color: C.muted }} className="text-sm text-center py-4">No hay mesas libres disponibles.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowMoveModal(false)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={() => { setShowMoveModal(false); onMoveTable(currentTableId, moveDestId); }}
                disabled={!moveDestId}
                style={{ background: moveDestId ? C.brass : C.surfaceLight, color: moveDestId ? C.base : C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed">
                Mover aquí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Unir mesas ── */}
      {showMergeModal && floor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowMergeModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-sm rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>Unir mesas</p>
            <p style={{ color: C.muted }} className="text-xs mb-4">
              Fusionar pedidos de otras mesas en <strong style={{ color: C.cream }}>{selectedTable.name || ''}</strong>.
            </p>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto mb-4">
              {floor.tables
                .filter((t: Table) => t.id !== currentTableId && !t.reserved_for && (t.status === 'ocupada' || t.status === 'cuenta' || t.status === 'unidas'))
                .map(t => {
                  const sel = mergeSelected.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => setMergeSelected(prev =>
                      prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                    )}
                      style={{
                        background: sel ? C.brass + '30' : C.surfaceLight,
                        border: `1px solid ${sel ? C.brass : C.line}`,
                        color: C.cream,
                      }}
                      className="rounded-lg px-4 py-3 text-sm text-left font-medium flex items-center justify-between hover:opacity-80"
                    >
                      <div className="flex items-center gap-2">
                        {sel && <Check className="w-4 h-4" style={{ color: C.brassLight }} />}
                        <span>{t.name}</span>
                      </div>
                      <span style={{ color: C.muted }} className="text-xs">
                        {t.orderId ? `${(floor.orders[t.orderId]?.items || []).length} artículos` : 'Sin pedido'}
                      </span>
                    </button>
                  );
                })}
              {(floor.tables ?? []).filter((t: Table) => t.id !== currentTableId && !t.reserved_for && (t.status === 'ocupada' || t.status === 'cuenta' || t.status === 'unidas')).length === 0 && (
                <p style={{ color: C.muted }} className="text-sm text-center py-4">No hay otras mesas con pedidos para unir.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowMergeModal(false)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={() => { setShowMergeModal(false); onMergeTables(currentTableId, mergeSelected); }}
                disabled={mergeSelected.length === 0}
                style={{ background: mergeSelected.length > 0 ? C.brass : C.surfaceLight, color: mergeSelected.length > 0 ? C.base : C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed">
                Unir ({mergeSelected.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
