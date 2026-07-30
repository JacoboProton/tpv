'use client';

import { useState, useMemo } from 'react';
import {
  ArrowLeft, Receipt, ChefHat, CreditCard,
  Plus, Minus, X, Trash2, AlertTriangle, MoreVertical, ArrowRight,
  GitMerge, BadgePercent,
} from 'lucide-react';
import { euros, type Theme } from '@/components/constants';
import type { Table } from '@tpv/core';
import ProductSection from './ProductSection';
import OrderSection from './OrderSection';
import { DrawerModals } from './DrawerModals';
import type {
  CatalogProduct, CategoryInfo, ComboData, CustomerInfo, EmployeeInfo,
  HistoryEntry, MealMenuData, OrderInfo, OrderItem, TicketSettings, FloorData,
} from './types';

interface ComandaDrawerProps {
  selectedTable: Table;
  selectedOrder: OrderInfo | null;
  catalog: { products: CatalogProduct[]; categories: (string | CategoryInfo)[] };
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  orderTotal: number;
  orderDiscount: number;
  setOrderDiscount: (d: number) => void;
  tipAmount: number;
  finalTotal: number;
  onClose: () => void;
  onAddItem: (item: Partial<OrderItem> & { id?: string; name: string; price: number; category: string; course: string; ubicacion: string; allergens: string[] }) => void;
  onChangeQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCancelTable: () => void;
  onSendToKitchenCourse: (course: string) => void;
  onSendItemToKitchen: (itemId: string) => void;
  onToggleCuenta: () => void;
  onOpenPayment: () => void;
  onResetTable: () => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onUpdateItemCourse: (itemId: string, course: string) => void;
  onEditItemModifiers: (item: OrderItem, product: CatalogProduct) => void;
  onSetItemDiscount: (itemId: string, pct: number) => void;
  onRemoveItemDiscount: (itemId: string) => void;
  onSetItemCourtesy: (itemId: string) => void;
  onRemoveItemCourtesy: (itemId: string) => void;
  onSetItemPrice: (itemId: string, price: number | null) => void;
  onVoidSentItem: (itemId: string, reason: string) => void;
  onApplyPersonalDiscount: (orderId: string, pin: string) => Promise<boolean>;
  onRemovePersonalDiscount: (orderId: string) => void;
  employees: EmployeeInfo[];
  ticketSettings: TicketSettings;
  combos: ComboData[];
  mealMenus: MealMenuData[];
  floor: FloorData;
  onMoveTable: (currentId: string, destId: string | null) => void;
  onMergeTables: (currentId: string, ids: string[]) => void;
  currentTableId: string;
  activeTicketId: string;
  onSwitchTicket: (tableId: string, ticketId: string) => void;
  onCreateTicket: (tableId: string) => void;
  onDeleteEmptyTicket: (tableId: string, orderId: string) => void;
  onRenameTicket: (orderId: string, label: string) => void;
  onLinkCustomer: (orderId: string | undefined, customer: CustomerInfo | { id: string; name: string; phone: string }) => void;
  onUnlinkCustomer: (orderId: string) => void;
  onReopenOrder: (tableId: string, order: HistoryEntry) => void;
  onVoidTable: () => void;
  todayHistory: HistoryEntry[];
  colors: Theme;
}

export default function ComandaDrawer({
  selectedTable, selectedOrder,
  catalog, activeCategory, setActiveCategory,
  orderTotal, orderDiscount, setOrderDiscount, tipAmount, finalTotal,
  onClose, onAddItem, onChangeQty, onRemoveItem, onCancelTable,
  onSendToKitchenCourse, onSendItemToKitchen, onToggleCuenta,
  onOpenPayment, onResetTable,
  onUpdateNotes, onUpdateItemCourse, onEditItemModifiers,
  onSetItemDiscount, onRemoveItemDiscount, onSetItemCourtesy, onRemoveItemCourtesy,
  onSetItemPrice, onVoidSentItem,
  onApplyPersonalDiscount, onRemovePersonalDiscount,
  combos, mealMenus,
  floor, onMoveTable, onMergeTables, currentTableId,
  activeTicketId, onSwitchTicket, onCreateTicket, onDeleteEmptyTicket,
  onRenameTicket, onLinkCustomer, onUnlinkCustomer,
  onReopenOrder, onVoidTable, todayHistory,
  colors: C,
}: ComandaDrawerProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editNotesId, setEditNotesId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [configuringCombo, setConfiguringCombo] = useState<ComboData | null>(null);
  const [configuringMenu, setConfiguringMenu] = useState<MealMenuData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFreeItemModal, setShowFreeItemModal] = useState(false);
  const [freeItemName, setFreeItemName] = useState('');
  const [freeItemPrice, setFreeItemPrice] = useState(0);
  const [freeItemCourse, setFreeItemCourse] = useState('');
  const [showBulkCourseModal, setShowBulkCourseModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState<{ item: OrderItem } | null>(null);
  const [qtyNumpad, setQtyNumpad] = useState('1');
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [showTicketMenu, setShowTicketMenu] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [moveDestId, setMoveDestId] = useState<string | null>(null);
  const [mergeSelected, setMergeSelected] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [editLabel, setEditLabel] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerInfo[]>([]);
  const [showLineDiscount, setShowLineDiscount] = useState<OrderItem | null>(null);
  const [showPriceEdit, setShowPriceEdit] = useState<OrderItem | null>(null);
  const [priceNumpad, setPriceNumpad] = useState('');
  const [showVoidItem, setShowVoidItem] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [showPersonalPIN, setShowPersonalPIN] = useState(false);
  const [personalPinInput, setPersonalPinInput] = useState('');

  const allCourses = useMemo(() => {
    const s = new Set<string>();
    (catalog?.products || []).forEach(p => { if (p.course) s.add(p.course); });
    return [...s].sort();
  }, [catalog?.products]);

  if (!selectedTable) return null;

  const isStaleState = !selectedOrder && (selectedTable.status === 'cuenta' || selectedTable.status === 'ocupada');
  const isDebtOnly   = selectedOrder?.items?.length === 1 && selectedOrder.items[0].productId === null;
  const hasItems     = selectedOrder && selectedOrder.items.length > 0;
  const isCuenta     = selectedTable.status === 'cuenta';

  const unsentItems = selectedOrder ? selectedOrder.items.filter(i => !i.sent) : [];
  const unsentCourses: string[] = selectedOrder
    ? [...new Set(unsentItems.map(i => i.course).filter((c): c is string => !!c))]
    : [];

  function handleCancelTable() {
    setConfirmCancel(false);
    onCancelTable();
  }

  function handleOpenNotes(item: OrderItem) {
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

  function qtyPress(digit: number) {
    setQtyNumpad(prev => {
      const next = prev === '1' ? String(digit) : prev + String(digit);
      return Math.min(parseInt(next, 10) || 1, 999).toString();
    });
  }

  function handleBulkCourse(course: string) {
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
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.line}` }} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onClose} style={{ color: C.muted }} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-display text-xl" style={{ color: C.cream }}>
                {selectedTable.name || ''}
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
                    onKeyDown={e => { if (e.key === 'Enter') { onRenameTicket(selectedOrder?.id ?? '', labelInput); setEditLabel(false); } if (e.key === 'Escape') setEditLabel(false); }}
                  />
                  <button onClick={() => { onRenameTicket(selectedOrder?.id ?? '', labelInput); setEditLabel(false); }}
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
                  📋 Reservada — {selectedTable.reserved_for || ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasItems && !isDebtOnly && (
              <button onClick={onToggleCuenta}
                style={{ background: C.wineLight + '20', color: C.wineLight }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80">
                <Receipt className="w-3.5 h-3.5" />
                {isCuenta ? 'Cancelar cuenta' : 'Pedir cuenta'}
              </button>
            )}
            {!isDebtOnly && (
              <button onClick={() => setConfirmCancel(true)} style={{ color: C.wineLight }} className="p-1.5 rounded-lg hover:bg-white/5">
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="relative">
              <button onClick={() => setShowTicketMenu(!showTicketMenu)}
                style={{ color: C.muted }} className="p-1.5 rounded-lg hover:bg-white/5">
                <MoreVertical className="w-4 h-4" />
              </button>
              {showTicketMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl overflow-hidden shadow-xl fade-up" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
                  <button onClick={() => { setShowMoveModal(true); setShowTicketMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.cream }}>
                    <ArrowRight className="w-3 h-3" /> Mover mesa
                  </button>
                  <button onClick={() => { setShowMergeModal(true); setShowTicketMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.cream }}>
                    <GitMerge className="w-3 h-3" /> Unir mesas
                  </button>
                  <button onClick={() => { setEditLabel(!editLabel); setLabelInput(selectedOrder?.label || ''); setShowTicketMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.cream }}>
                    ✏️ {selectedOrder?.label ? 'Editar etiqueta' : 'Añadir etiqueta'}
                  </button>
                  <button onClick={() => { setShowCustomerSearch(true); setShowTicketMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.cream }}>
                    👤 {selectedOrder?.customer ? 'Cambiar cliente' : 'Vincular cliente'}
                  </button>
                  <button onClick={() => { onCreateTicket(currentTableId); setShowTicketMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.cream }}>
                    <Plus className="w-3 h-3" /> Nuevo ticket
                  </button>
                  {todayHistory && todayHistory.length > 0 && (
                    <button onClick={() => { setShowHistory(true); setShowTicketMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.cream }}>
                      📋 Historial ({todayHistory.length})
                    </button>
                  )}
                  {selectedOrder && !selectedOrder.personalDiscountApplied ? (
                    <button onClick={() => { setShowPersonalPIN(true); setShowTicketMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.sageLight }}>
                      <BadgePercent className="w-3 h-3" /> Desc. personal
                    </button>
                  ) : null}
                  {selectedOrder?.personalDiscountApplied && (
                    <button onClick={() => { onRemovePersonalDiscount(selectedOrder.id); setShowTicketMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.sageLight }}>
                      <BadgePercent className="w-3 h-3" /> Quitar desc. personal
                    </button>
                  )}
                  {selectedOrder && !selectedOrder.customer && (
                    <button onClick={() => { onUnlinkCustomer(selectedOrder.id); setShowTicketMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.muted }}>
                      🔗 Desvincular cliente
                    </button>
                  )}
                  {selectedOrder && selectedOrder.items.length === 0 && (
                    <button onClick={() => { onDeleteEmptyTicket(currentTableId, selectedOrder.id); setShowTicketMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.wineLight }}>
                      <Trash2 className="w-3 h-3" /> Eliminar ticket vacío
                    </button>
                  )}
                  <button onClick={() => { setShowVoidConfirm(true); setShowTicketMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:opacity-70 flex items-center gap-2" style={{ color: C.wineLight }}>
                    <AlertTriangle className="w-3 h-3" /> Vaciar / liberar mesa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ticket tabs */}
        {selectedTable.orderIds && selectedTable.orderIds.length > 1 && (
          <div style={{ background: C.surfaceLight, borderBottom: `1px solid ${C.line}` }} className="flex gap-1 px-4 py-2 overflow-x-auto">
            {selectedTable.orderIds.map(orderId => {
              const o = floor?.orders?.[orderId];
              const isActive = orderId === activeTicketId;
              const label = o?.label || `Ticket ${(selectedTable.orderIds?.indexOf(orderId) ?? 0) + 1}`;
              return (
                <button key={orderId} onClick={() => onSwitchTicket(currentTableId, orderId)}
                  style={{
                    background: isActive ? C.brass : C.surface,
                    color: isActive ? C.base : C.muted,
                    border: `1px solid ${isActive ? C.brass : C.line}`,
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap hover:opacity-80"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Cuenta banner */}
        {isCuenta && !isDebtOnly && (
          <div style={{ background: C.wineLight + '15', borderBottom: `1px solid ${C.wineLight}40` }} className="px-4 py-2 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4" style={{ color: C.wineLight }} />
            <span className="text-xs font-medium" style={{ color: C.wineLight }}>
              Cliente pide la cuenta
            </span>
            <div className="flex-1" />
            <button onClick={onToggleCuenta}
              className="px-3 py-1 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.wineLight + '20', color: C.wineLight }}>
              Cancelar cuenta
            </button>
            <button onClick={onOpenPayment} disabled={!hasItems}
              className="px-3 py-1 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-40" style={{ background: C.brass, color: C.base }}>
              Cobrar
            </button>
            <button onClick={onResetTable} title="Cancelar mesa"
              className="p-1 rounded-lg hover:opacity-80" style={{ color: C.wineLight }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Cancel confirmation */}
        {confirmCancel && (
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: C.wine + '20', borderBottom: `1px solid ${C.wine}40` }}>
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: C.wineLight }} />
            <span className="text-xs font-medium flex-1" style={{ color: C.wineLight }}>
              {selectedOrder ? 'Cancelar todos los artículos y dejar la mesa libre?' : 'Descartar cambios y dejar la mesa libre?'}
            </span>
            <button onClick={() => setConfirmCancel(false)}
              className="px-2.5 py-1.5 rounded-lg text-[10px]" style={{ background: C.surface, color: C.muted }}>
              Volver
            </button>
            <button onClick={handleCancelTable}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: C.wine, color: C.cream }}>
              Sí, cancelar mesa
            </button>
          </div>
        )}

        {/* Stale state banner */}
        {isStaleState && (
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: C.brass + '20', borderBottom: `1px solid ${C.brass}40` }}>
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: C.brassLight }} />
            <span className="text-xs flex-1" style={{ color: C.brassLight }}>
              Esta mesa tiene cuenta u ocupada sin pedido activo.
            </span>
            <button onClick={onResetTable}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: C.brass, color: C.base }}>
              Liberar mesa
            </button>
          </div>
        )}

        <ProductSection
          catalog={catalog}
          combos={combos}
          mealMenus={mealMenus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          setShowFreeItemModal={setShowFreeItemModal}
          setFreeItemName={setFreeItemName}
          setFreeItemPrice={setFreeItemPrice}
          setFreeItemCourse={setFreeItemCourse}
          setConfiguringCombo={setConfiguringCombo}
          setConfiguringMenu={setConfiguringMenu}
          onAddItem={onAddItem}
          isDebtOnly={isDebtOnly}
          C={C}
        />

        <OrderSection
          selectedOrder={selectedOrder}
          actionItemId={actionItemId}
          setActionItemId={setActionItemId}
          editNotesId={editNotesId}
          setEditNotesId={setEditNotesId}
          notesInput={notesInput}
          setNotesInput={setNotesInput}
          showQtyModal={showQtyModal}
          setShowQtyModal={setShowQtyModal}
          qtyNumpad={qtyNumpad}
          setQtyNumpad={setQtyNumpad}
          showBulkCourseModal={showBulkCourseModal}
          setShowBulkCourseModal={setShowBulkCourseModal}
          showLineDiscount={showLineDiscount}
          setShowLineDiscount={setShowLineDiscount}
          showPriceEdit={showPriceEdit}
          setShowPriceEdit={setShowPriceEdit}
          setPriceNumpad={setPriceNumpad}
          showVoidItem={showVoidItem}
          setShowVoidItem={setShowVoidItem}
          voidReason={voidReason}
          setVoidReason={setVoidReason}
          showDiscountModal={showDiscountModal}
          setShowDiscountModal={setShowDiscountModal}
          discountInput={discountInput}
          setDiscountInput={setDiscountInput}
          allCourses={allCourses}
          orderTotal={orderTotal}
          orderDiscount={orderDiscount}
          setOrderDiscount={setOrderDiscount}
          tipAmount={tipAmount}
          finalTotal={finalTotal}
          catalog={catalog}
          onChangeQty={onChangeQty}
          onRemoveItem={onRemoveItem}
          onUpdateNotes={onUpdateNotes}
          onUpdateItemCourse={onUpdateItemCourse}
          onEditItemModifiers={onEditItemModifiers}
          onSetItemDiscount={onSetItemDiscount}
          onRemoveItemDiscount={onRemoveItemDiscount}
          onSetItemCourtesy={onSetItemCourtesy}
          onRemoveItemCourtesy={onRemoveItemCourtesy}
          onSetItemPrice={onSetItemPrice}
          onVoidSentItem={onVoidSentItem}
          onSendItemToKitchen={onSendItemToKitchen}
          handleSaveNotes={handleSaveNotes}
          handleOpenNotes={handleOpenNotes}
          handleBulkCourse={handleBulkCourse}
          handleQtyConfirm={handleQtyConfirm}
          qtyPress={qtyPress}
          isDebtOnly={isDebtOnly}
          C={C}
        />

        {/* Main actions */}
        {!isCuenta && (
          <div className="p-4 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
            {!isDebtOnly && unsentItems.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {unsentCourses.length > 0 && unsentCourses.map(course => {
                  const count = (selectedOrder?.items ?? []).filter(i => !i.sent && i.course === course).length;
                  const colors: Record<string, string> = { Entrantes: '#7a9a7c', Principales: '#c4a04a', Postres: '#b05e5e' };
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

      <DrawerModals
        showFreeItemModal={showFreeItemModal}
        setShowFreeItemModal={setShowFreeItemModal}
        freeItemName={freeItemName}
        setFreeItemName={setFreeItemName}
        freeItemPrice={freeItemPrice}
        setFreeItemPrice={setFreeItemPrice}
        freeItemCourse={freeItemCourse}
        setFreeItemCourse={setFreeItemCourse}
        handleFreeItemAdd={handleFreeItemAdd}
        showQtyModal={showQtyModal}
        setShowQtyModal={setShowQtyModal}
        qtyNumpad={qtyNumpad}
        setQtyNumpad={setQtyNumpad}
        qtyPress={qtyPress}
        handleQtyConfirm={handleQtyConfirm}
        showBulkCourseModal={showBulkCourseModal}
        setShowBulkCourseModal={setShowBulkCourseModal}
        allCourses={allCourses}
        handleBulkCourse={handleBulkCourse}
        selectedOrder={selectedOrder}
        configuringCombo={configuringCombo}
        setConfiguringCombo={setConfiguringCombo}
        catalog={catalog}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        todayHistory={todayHistory}
        currentTableId={currentTableId}
        onReopenOrder={onReopenOrder}
        showVoidConfirm={showVoidConfirm}
        setShowVoidConfirm={setShowVoidConfirm}
        selectedTable={selectedTable}
        onVoidTable={onVoidTable}
        showCustomerSearch={showCustomerSearch}
        setShowCustomerSearch={setShowCustomerSearch}
        customerQuery={customerQuery}
        setCustomerQuery={setCustomerQuery}
        customerResults={customerResults}
        setCustomerResults={setCustomerResults}
        floor={floor}
        onLinkCustomer={onLinkCustomer}
        showLineDiscount={showLineDiscount}
        setShowLineDiscount={setShowLineDiscount}
        onSetItemDiscount={onSetItemDiscount}
        onRemoveItemDiscount={onRemoveItemDiscount}
        showPriceEdit={showPriceEdit}
        setShowPriceEdit={setShowPriceEdit}
        priceNumpad={priceNumpad}
        setPriceNumpad={setPriceNumpad}
        onSetItemPrice={onSetItemPrice}
        showPersonalPIN={showPersonalPIN}
        setShowPersonalPIN={setShowPersonalPIN}
        personalPinInput={personalPinInput}
        setPersonalPinInput={setPersonalPinInput}
        onApplyPersonalDiscount={onApplyPersonalDiscount}
        showVoidItem={showVoidItem}
        setShowVoidItem={setShowVoidItem}
        voidReason={voidReason}
        setVoidReason={setVoidReason}
        onVoidSentItem={onVoidSentItem}
        configuringMenu={configuringMenu}
        setConfiguringMenu={setConfiguringMenu}
        onAddItem={onAddItem}
        showMoveModal={showMoveModal}
        setShowMoveModal={setShowMoveModal}
        moveDestId={moveDestId}
        setMoveDestId={setMoveDestId}
        onMoveTable={onMoveTable}
        showMergeModal={showMergeModal}
        setShowMergeModal={setShowMergeModal}
        mergeSelected={mergeSelected}
        setMergeSelected={setMergeSelected}
        onMergeTables={onMergeTables}
        C={C}
      />
    </div>
  );
}
