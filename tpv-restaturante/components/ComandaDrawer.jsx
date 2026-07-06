import { useState, useMemo } from 'react';
import {
  ArrowLeft, Receipt, ChefHat, CreditCard,
  Plus, Minus, Percent, X, Trash2, AlertTriangle, Check, Package, Tag, Search, Edit3, MoreVertical, ArrowRight,
  GitMerge, BadgePercent,
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
  onSetItemDiscount, onRemoveItemDiscount, onSetItemCourtesy, onRemoveItemCourtesy,
  onSetItemPrice, onVoidSentItem,
  onApplyPersonalDiscount, onRemovePersonalDiscount,
  employees, ticketSettings,
  combos, mealMenus,
  floor, onMoveTable, onMergeTables, currentTableId,
  activeTicketId, onSwitchTicket, onCreateTicket, onDeleteEmptyTicket,
  onRenameTicket, onLinkCustomer, onUnlinkCustomer,
  onReopenOrder, onVoidTable, todayHistory,
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
  const [showTicketMenu, setShowTicketMenu] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [moveDestId, setMoveDestId] = useState(null);
  const [mergeSelected, setMergeSelected] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [editLabel, setEditLabel] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showLineDiscount, setShowLineDiscount] = useState(null); // item
  const [showPriceEdit, setShowPriceEdit] = useState(null); // item
  const [priceNumpad, setPriceNumpad] = useState('');
  const [showVoidItem, setShowVoidItem] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [showPersonalPIN, setShowPersonalPIN] = useState(false);
  const [personalPinInput, setPersonalPinInput] = useState('');

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

  const unsentItems = selectedOrder ? selectedOrder.items.filter(i => !i.sent) : [];
  const unsentCourses = selectedOrder
    ? [...new Set(unsentItems.map(i => i.course).filter(Boolean))]
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
        className="relative w-full sm:w-[36rem] h-full flex flex-col fade-up"
      >
        {/* ── Cabecera ── */}
        <div style={{ borderBottom: `1px solid ${C.line}` }} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onClose} style={{ color: C.muted }} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-display text-xl" style={{ color: C.cream }}>
                {selectedTable.name}
                {selectedOrder?.label && !editLabel && (
                  <span className="text-sm font-normal ml-2" style={{ color: C.brassLight }}>
                    {selectedOrder.label}
                  </span>
                )}
              </h2>
              {editLabel ? (
                <div className="flex gap-1 mt-1">
                  <input type="text" value={labelInput}
                    onChange={e => setLabelInput(e.target.value)}
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                    className="text-xs px-2 py-1 rounded w-40" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') { onRenameTicket(selectedOrder?.id, labelInput); setEditLabel(false); } if (e.key === 'Escape') setEditLabel(false); }}
                  />
                  <button onClick={() => { onRenameTicket(selectedOrder?.id, labelInput); setEditLabel(false); }}
                    style={{ color: C.sage }} className="text-xs">OK</button>
                </div>
              ) : selectedOrder?.customer && (
                <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: C.sageLight }}>
                  👤 {selectedOrder.customer.name}
                </p>
              )}
              {selectedOrder?.personalDiscountApplied && (
                <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: C.sageLight }}>
                  <BadgePercent className="w-3 h-3 inline" />
                  Desc. personal ({selectedOrder.personalDiscountEmployeeName})
                </p>
              )}
              {selectedOrder?._mergedLabel && (
                <p className="text-[10px] font-medium mt-0.5" style={{ color: C.brassLight }}>
                  <GitMerge className="w-3 h-3 inline mr-1" />
                  {selectedOrder._mergedLabel}
                </p>
              )}
              {selectedTable.reserved_for && !selectedTable.orderId && (
                <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: C.wineLight }}>
                  📋 Reservada — {selectedTable.reserved_for}
                </p>
              )}
            </div>
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

            {/* Tres puntos — menú de ticket */}
            <div className="relative">
              <button
                onClick={() => setShowTicketMenu(!showTicketMenu)}
                style={{ color: C.muted }}
                className="p-1.5 rounded-lg hover:opacity-80"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showTicketMenu && (
                <div
                  style={{ background: C.surface, border: `1px solid ${C.line}`, zIndex: 60 }}
                  className="absolute right-0 top-full mt-1 rounded-xl py-1 min-w-[180px] shadow-xl"
                >
                  {selectedOrder && selectedOrder.items.length > 0 && (
                    <button onClick={() => { setShowTicketMenu(false); setMoveDestId(null); setShowMoveModal(true); }}
                      style={{ color: C.cream }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    >
                      <ArrowRight className="w-4 h-4" /> Mover mesa
                    </button>
                  )}
                  <button onClick={() => { setShowTicketMenu(false); setMergeSelected([]); setShowMergeModal(true); }}
                    style={{ color: C.cream }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                  >
                    <GitMerge className="w-4 h-4" /> Unir mesas
                  </button>
                  <div style={{ borderTop: `1px solid ${C.line}` }} className="my-1" />
                  {selectedOrder && (
                    <button onClick={() => { setShowTicketMenu(false); setLabelInput(selectedOrder.label || ''); setEditLabel(true); }}
                      style={{ color: C.cream }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    >
                      🏷️ {selectedOrder.label ? 'Editar etiqueta' : 'Añadir etiqueta'}
                    </button>
                  )}
                  {selectedOrder && (
                    <button onClick={() => { setShowTicketMenu(false); setCustomerQuery(''); setCustomerResults([]); setShowCustomerSearch(true); }}
                      style={{ color: C.cream }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    >
                      👤 {selectedOrder.customer ? 'Cambiar cliente' : 'Vincular cliente'}
                    </button>
                  )}
                  {selectedOrder?.customer && (
                    <button onClick={() => { setShowTicketMenu(false); onUnlinkCustomer(selectedOrder.id); }}
                      style={{ color: C.wineLight }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    >
                      ✕ Desvincular cliente
                    </button>
                  )}
                  <div style={{ borderTop: `1px solid ${C.line}` }} className="my-1" />
                  <button onClick={() => { setShowTicketMenu(false); onCreateTicket(currentTableId); }}
                    style={{ color: C.cream }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                  >
                    ➕ Nuevo ticket
                  </button>
                  {todayHistory && todayHistory.length > 0 && (
                    <button onClick={() => { setShowTicketMenu(false); setShowHistory(true); }}
                      style={{ color: C.cream }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    >
                      📋 Historial ({todayHistory.length})
                    </button>
                  )}
                  {selectedOrder && selectedOrder.items.length > 0 && !selectedOrder.personalDiscountApplied && (
                    <button onClick={() => { setShowTicketMenu(false); setPersonalPinInput(''); setShowPersonalPIN(true); }}
                      style={{ color: C.sageLight }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    >
                      <BadgePercent className="w-4 h-4" /> Descuento personal
                    </button>
                  )}
                  {selectedOrder?.personalDiscountApplied && (
                    <button onClick={() => { setShowTicketMenu(false); onRemovePersonalDiscount(selectedOrder.id); }}
                      style={{ color: C.wineLight }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    >
                      <BadgePercent className="w-4 h-4" /> Quitar descuento personal
                    </button>
                  )}
                  {selectedOrder && selectedOrder.items.length === 0 && (
                    <button onClick={() => { setShowTicketMenu(false); onDeleteEmptyTicket(currentTableId, selectedOrder.id); }}
                      style={{ color: C.wineLight }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    >
                      🗑️ Eliminar ticket vacío
                    </button>
                  )}
                  <div style={{ borderTop: `1px solid ${C.line}` }} className="my-1" />
                  <button onClick={() => { setShowTicketMenu(false); setShowVoidConfirm(true); }}
                    style={{ color: C.wineLight }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                  >
                    🚫 Vaciar / liberar mesa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Ticket tabs ── */}
        {selectedTable?.orderIds?.length > 0 && (
          <div style={{ borderBottom: `1px solid ${C.line}`, background: C.surfaceLight }} className="px-4 py-1.5 flex gap-1 overflow-x-auto">
            {selectedTable.orderIds.map((oid, idx) => {
              const order = floor?.orders?.[oid];
              const isActive = oid === activeTicketId;
              const label = order?.label || `#${idx + 1}`;
              const itemCount = order?.items?.length || 0;
              return (
                <button key={oid} onClick={() => onSwitchTicket(currentTableId, oid)}
                  style={{
                    background: isActive ? C.brass : 'transparent',
                    color: isActive ? C.base : C.muted,
                    border: `1px solid ${isActive ? C.brass : C.line}`,
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1 hover:opacity-80"
                >
                  {label}
                  {itemCount > 0 && <span style={{ opacity: 0.7 }}>({itemCount})</span>}
                </button>
              );
            })}
          </div>
        )}

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
                        {disc > 0 && !item.lineDiscount && (
                          <span className="text-[10px] ml-1" style={{ color: C.wineLight }}>-{disc}%</span>
                        )}
                        {item.lineDiscount > 0 && (
                          <span className="text-[10px] ml-1" style={{ color: C.wineLight }}>-{item.lineDiscount}%</span>
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
                        {/* Line discount */}
                        {!item.sent && (
                          <button onClick={() => { setShowLineDiscount(item); setActionItemId(null); }}
                            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                            className="text-[10px] px-2 py-1 rounded-lg">
                            {item.lineDiscount > 0 ? `-${item.lineDiscount}%` : 'Descuento línea'}
                          </button>
                        )}
                        {/* Courtesy */}
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
                        {/* Edit price */}
                        {!item.sent && (
                          <button onClick={() => { setPriceNumpad(String(item.overridePrice ?? item.price)); setShowPriceEdit(item); setActionItemId(null); }}
                            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                            className="text-[10px] px-2 py-1 rounded-lg">
                            {item.overridePrice != null ? `${item.overridePrice.toFixed(2)}€` : 'Editar precio'}
                          </button>
                        )}
                        {/* Notes */}
                        <button onClick={() => { handleOpenNotes(item); setActionItemId(null); }}
                          style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                          className="text-[10px] px-2 py-1 rounded-lg">
                          {item.notes ? '📝 ' : ''}Nota
                        </button>
                        {/* Delete (unsent only) */}
                        {!item.sent && (
                          <button onClick={() => { onRemoveItem(item.id); setActionItemId(null); }}
                            style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
                            className="text-[10px] px-2 py-1 rounded-lg">Eliminar</button>
                        )}
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
            {!isDebtOnly && unsentItems.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {unsentCourses.length > 0 && unsentCourses.map(course => {
                  const count = selectedOrder.items.filter(i => !i.sent && i.course === course).length;
                  const colors = { Entrantes: '#7a9a7c', Principales: '#c4a04a', Postres: '#b05e5e' };
                  const color = colors[course] || C.sage;
                  return (
                    <button key={course}
                      onClick={() => onSendToKitchenCourse(course)}
                      style={{ background: color, color: '#fff', border: `1px solid ${color}` }}
                      className="flex-1 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <ChefHat className="w-3.5 h-3.5" /> {course} ({count})
                    </button>
                  );
                })}
                <button onClick={() => onSendToKitchenCourse('')}
                  style={{ background: C.brass, color: C.base, border: `1px solid ${C.brass}` }}
                  className="rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity px-4">
                  <ChefHat className="w-3.5 h-3.5" /> Enviar todo ({unsentItems.length})
                </button>
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
              Se descartarán todos los pedidos de <strong style={{ color: C.cream }}>{selectedTable.name}</strong> sin cobrar.
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
                // Save to floor customers list
                const next = clone(floor);
                if (!next.customers) next.customers = [];
                if (!next.customers.find(c => c.name === customerQuery)) {
                  next.customers.push({ id: 'c_' + Date.now(), name: customerQuery, phone: '' });
                }
                // can't persistFloor here since floor is owned by parent
                setShowCustomerSearch(false);
              }}
                style={{ background: C.sage, color: '#fff' }}
                className="w-full rounded-lg py-2.5 text-sm font-medium hover:opacity-80"
              >
                + Crear "{customerQuery}"
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
            {showLineDiscount.lineDiscount > 0 && (
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
              <button onClick={() => {
                if (personalPinInput.length < 4) return;
                const ok = onApplyPersonalDiscount(selectedOrder?.id, personalPinInput);
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

      {/* ── Modal Mover mesa ── */}
      {showMoveModal && floor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowMoveModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-sm rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>Mover mesa</p>
            <p style={{ color: C.muted }} className="text-xs mb-4">
              Trasladar el pedido de <strong style={{ color: C.cream }}>{selectedTable.name}</strong> a otra mesa.
            </p>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto mb-4">
        {floor.tables
          .filter(t => t.id !== currentTableId && t.status === 'libre' && !t.reserved_for)
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
              {floor.tables.filter(t => t.id !== currentTableId && t.status === 'libre' && !t.reserved_for).length === 0 && (
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
              Fusionar pedidos de otras mesas en <strong style={{ color: C.cream }}>{selectedTable.name}</strong>.
            </p>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto mb-4">
              {floor.tables
                .filter(t => t.id !== currentTableId && !t.reserved_for && (t.status === 'ocupada' || t.status === 'cuenta' || t.status === 'unidas'))
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
              {floor.tables.filter(t => t.id !== currentTableId && !t.reserved_for && (t.status === 'ocupada' || t.status === 'cuenta' || t.status === 'unidas')).length === 0 && (
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
    </div>
  );
}
