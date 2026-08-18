"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { type Theme, THEMES, clone } from '../../components/constants';
import type { Floor, Catalog, Sale, Employee, Offer, Combo, Table, TicketSettings, ClockinSummary, Tenant, QrCall, Product } from '../../domain/types'
import type { ModifierData } from '../../domain/catalog/modifier-groups'
import { FatalError } from '../../components/app/FatalError';
import { LoginGuard } from '../../components/app/LoginGuard';
import { LoadingSkeleton } from '../../components/app/LoadingSkeleton';
import { OfflineBanner } from '../../components/app/OfflineBanner';
import { FloorLoading } from '../../components/app/FloorLoading';
import { QrCallBanner } from '../../components/app/QrCallBanner';
import { registerAllSubscribers } from '../../application/subscribers';
import { fetchModifiers } from '../../lib/api';
import { escposOpenDrawer, printESCPOS, isPrinterConnected } from '../../lib/thermal-printer';

declare global {
  interface Window {
    __tpvToastTimer: number;
  }
}

import { useOrders }           from '../../hooks/useOrders';
import { useKitchen }          from '../../hooks/useKitchen';
import { useInventory }        from '../../hooks/useInventory';
import { useEmployees }        from '../../hooks/useEmployees';
import { useInvoice }          from '../../hooks/useInvoice';
import { useSalesActions }     from '../../hooks/useSalesActions';
import { useAppInit }          from '../../hooks/useAppInit';
import { useOfflineSync }      from '../../hooks/useOfflineSync';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useLoginRouting }     from '../../hooks/useLoginRouting';
import { useRealtimeSync }     from '../../hooks/useRealtimeSync';
import { useQrPolling }        from '../../hooks/useQrPolling';
import { useDebtOrder }        from '../../hooks/useDebtOrder';
import MenuPrincipal        from '../../components/app/MenuPrincipal';
import LoginScreen          from '../../components/auth/LoginScreen';
import CommandPalette       from '../../components/app/CommandPalette';
import dynamic from 'next/dynamic';
import type { ModifierSelectorProps }             from '../../components/modals/ModifierSelector';
import type { ComandaDrawerProps }                  from '../../modules/salon/ComandaDrawer/types';
import { EventLog }          from '../../modules/debug/EventLog';
import AppProviders from '../../modules/core/app-contexts'
import Sidebar from '../../modules/core/Sidebar'
import TopBar from '../../modules/core/TopBar'
import { navGroups } from '../../modules/core/nav-config'
import { routeFor, viewFromPath } from '../../modules/core/view-routes'

const PaymentModal     = dynamic(() => import('../../modules/payment/PaymentModal'), { ssr: false })
const ComandaDrawer    = dynamic(() => import('../../modules/salon/ComandaDrawer'), { ssr: false })
const ModifierSelector = dynamic(() => import('../../components/modals/ModifierSelector'), { ssr: false })
const ClockinModal     = dynamic(() => import('../../components/modals/ClockinModal'), { ssr: false })
const SettingsModal    = dynamic(() => import('../../components/modals/SettingsModal'), { ssr: false })

export default function TallerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, setTheme] = useState<string>('dark');
  const C: Theme = THEMES[theme as keyof typeof THEMES];

  const [tenants, setTenants]       = useState<Tenant[]>([]);
  const [tenantId, setTenantId]     = useState<string>(() => {
    if (typeof window === 'undefined') return 'default';
    try { return localStorage.getItem('tpv:tenant') || 'default'; } catch { return 'default'; }
  });

  const [catalog, setCatalog]       = useState<Catalog | null>(null);
  const [floor, setFloor]           = useState<Floor | null>(null);
  const [employees, setEmployees]   = useState<Employee[]>([]);

  const sales = floor?.sales ?? [];
  const setSales = useCallback((updater: Sale[] | ((prev: Sale[]) => Sale[])) => {
    setFloor(prev => {
      if (!prev) return prev
      const current = prev.sales ?? []
      const next = typeof updater === 'function' ? (updater as (p: Sale[]) => Sale[])(current) : updater
      return { ...prev, sales: next }
    })
  }, [setFloor]);

  const setFloorPreservingSales = useCallback((f: Floor | ((prev: Floor | null) => Floor | null)) => {
    setFloor(prev => {
      const next = typeof f === 'function' ? f(prev) : f;
      if (!next) return null;
      if (!prev) return next;
      return { ...next, sales: next.sales ?? prev.sales }
    })
  }, [setFloor]);

  const [menuMode, setMenuMode]           = useState<string>('menu');
  const [entryPoint, setEntryPoint]       = useState<string>('entrada');
  const pathname = usePathname();
  const router = useRouter();
  const navigateTo = useCallback((v: string) => { router.push(routeFor(v)) }, [router]);
  const view = viewFromPath(pathname ?? '');
  const [almacenUbicacion, setAlmacenUbicacion] = useState<string | null>(null);

  const [toast, setToast]                  = useState<string | null>(null);
  const [modifierData, setModifierData]    = useState<ModifierData>({ groups: [], productModifiers: {} });
  const [ticketSettings, setTicketSettings] = useState<TicketSettings>({
    restaurantName: 'LA COMANDA', companyCif: '78406450W', companyAddress: '', companyPhone: '', logoUrl: '', footerText: 'Gracias por su visita', ticketWidth: '80mm',
  });
  const [showSettings, setShowSettings]     = useState(false);
  const [offers, setOffers]                = useState<Offer[]>([]);
  const [combos, setCombos]                = useState<Combo[]>([]);

  const [showCommands, setShowCommands]             = useState(false);
  const [showClockinModal, setShowClockinModal]     = useState(false);
  const [clockinSummary, setClockinSummary]         = useState<ClockinSummary | null>(null);
  const [clockinLoading, setClockinLoading]         = useState(false);
  const [showFloorEditor, setShowFloorEditor]       = useState(false);

  const [qrCalls, setQrCalls] = useState<QrCall[]>([]);

  const [paying, setPaying] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(window.__tpvToastTimer);
    window.__tpvToastTimer = window.setTimeout(() => setToast(null), 2600);
  }, []);

  function openDrawer(): void {
    if (!isPrinterConnected()) { showToast('No hay impresora conectada'); return; }
    printESCPOS(escposOpenDrawer()).then(() => {}).catch(() => {});
  }

  const emp = useEmployees({ employees, setEmployees, showToast, floor: floor as Floor, setFloor: setFloorPreservingSales });
  const {
    currentUser, setCurrentUser, loginSelected, setLoginSelected, pinInput, setPinInput,
    trainingMode, setTrainingMode, savedFloor, setSavedFloor,
    pressDigit, deleteDigit, logout,
    addEmployee, updateEmployeeField, deleteEmployee,
    toggleTraining, loadClockinSummary, handleClockinAction,
    tryRestoreSession,
  } = emp;

  const orders = useOrders({
    floor: floor as Floor, setFloor: setFloorPreservingSales, catalog: catalog as Catalog, setCatalog, sales, setSales,
    employees, setEmployees, currentUser, tenantId, modifierData,
    ticketSettings, offers, trainingMode, showToast,
  });

  const {
    selectedTableId, setSelectedTableId,
    activeTicketId, setActiveTicketId,
    activeCategory, setActiveCategory,
    paymentSplits, setPaymentSplits,
    orderDiscount, setOrderDiscount,
    tipAmount, setTipAmount,
    tipMethod, setTipMethod,
    paymentIntentId, setPaymentIntentId,
    invoiceNif, setInvoiceNif,
    invoiceName, setInvoiceName,
    invoiceAddress, setInvoiceAddress,
    invoiceEmail, setInvoiceEmail,
    showModifierSelector, setShowModifierSelector,
    editingItemModifiers, setEditingItemModifiers,
    selectedTable, activeOrderId, selectedOrder,
    orderTotal, discountedTotal, finalTotal, splitsUsed, remaining, canConfirm,
    pendingBarCount, pendingCocinaCount,
    pendingSalesCount,
    persistFloor, persistSales,
    addItem, confirmModifiersAndAdd, changeQty, updateItemNotes, removeItem,
    sendToKitchenCourse, sendItemToKitchen, updateItemCourse, editItemModifiers,
    toggleCuenta, markReady, voidSentItem,
    setItemDiscount, removeItemDiscount, setItemCourtesy, removeItemCourtesy, setItemPrice,
    calcPersonalDiscountAmount, applyPersonalDiscount, removePersonalDiscount,
    cancelTable, voidTable, moveTable, mergeTables, reopenOrder,
    createNewTicket, switchTicket, deleteEmptyTicket, renameTicket,
    linkCustomer, unlinkCustomer,
    addSplit, updateSplitAmount, removeSplit, toggleSplitItem,
    closeBill, handlePrint, debtFloorRef,
  } = orders;

  const kitchen = useKitchen({ floor: floor as Floor, setFloor: setFloorPreservingSales, persistFloor, catalog: catalog as Catalog, setCatalog, showToast, handlePrint, tenantId });
  const { updateItemState, advanceOrder, agotarProducto, reprintKitchenTicket, handleReadyNotification } = kitchen;

  const { loading, fatalError } = useAppInit({
    tenantId, setTenantId, setTenants, setCatalog, setFloor: setFloorPreservingSales, setEmployees, setSales,
    setTicketSettings, setOffers, setCombos, currentUser, tryRestoreSession,
  });

  useLoginRouting({
    currentUser, setCurrentUser, entryPoint,
    setView: navigateTo, setMenuMode, setSelectedTableId,
    setAlmacenUbicacion, showToast,
  });

  const { isOffline, pendingMutations } = useOfflineSync();

  useKeyboardShortcuts({
    onToggleCommandPalette: useCallback(() => setShowCommands(p => !p), []),
    onEscape: useCallback(() => { setShowCommands(false); setShowSettings(false); setSelectedTableId(null); setActiveTicketId(null); }, []),
    onFocusSearch: useCallback(() => {}, []),
    onOpenPayment: useCallback(() => { setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true); }, []),
    onQuickCash: useCallback(() => { setPaymentSplits([{ id: 'qc', method: 'efectivo', amount: 0 }]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true); }, []),
    onQuickCard: useCallback(() => { setPaymentSplits([{ id: 'qd', method: 'tarjeta', amount: 0 }]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true); }, []),
  });

  useRealtimeSync({ tenantId, setFloor: setFloorPreservingSales, setSales, onReadyNotification: handleReadyNotification as (payload: unknown) => void });
  useQrPolling(setQrCalls);
  useDebtOrder({ selectedTable, selectedTableId, currentUser, sales, floor: floor as Floor, setFloor: setFloorPreservingSales, showToast, debtFloorRef });

  const inv = useInventory({ catalog: catalog as Catalog, setCatalog, offers, setOffers, combos, setCombos, showToast });
  const {
    newProductOpen, setNewProductOpen, confirmDeleteId, setConfirmDeleteId,
    lowStockProducts, addProduct, updateProductField, deleteProduct,
    saveOffers: saveOffersFn, saveCombos: saveCombosFn, saveMealMenus: saveMealMenusFn,
    savePriceRules: savePriceRulesFn, saveCarrusel, saveCartas,
  } = inv;

  const { printInvoice, handleDownloadPdf, handleSendInvoiceEmail } = useInvoice({ ticketSettings, showToast });
  const { handleRefund, handleConfirmBizum } = useSalesActions({ sales, setSales, currentUser });

  useEffect(() => {
    if (!catalog) return;
    fetchModifiers().then(data => { if (data) setModifierData(data as ModifierData); }).catch(() => {});
  }, [catalog]);

  useEffect(() => {
    registerAllSubscribers({ showToast });
  }, [showToast]);

  const dismissQrCalls = async () => {
    for (const call of qrCalls) {
      await fetch('/api/qr-calls', { method: 'PUT', body: JSON.stringify({ id: call.id }) });
    }
    setQrCalls([]);
  };

  if (loading) return <LoadingSkeleton colors={C} />;

  if (fatalError) return <FatalError error={fatalError} colors={C} />;

  if (!currentUser) return <LoginGuard employees={employees} menuMode={menuMode} setMenuMode={setMenuMode} entryPoint={entryPoint} setEntryPoint={setEntryPoint} loginSelected={loginSelected} setLoginSelected={setLoginSelected} pinInput={pinInput} setPinInput={setPinInput} pressDigit={pressDigit} deleteDigit={deleteDigit} colors={C} />;

  if (!floor) return <FloorLoading colors={C} />;

  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex">
      <Sidebar menuMode={menuMode} currentUser={currentUser} tenants={tenants as { id: string; name: string }[]} tenantId={tenantId} setTenantId={setTenantId} view={view} setView={navigateTo} colors={C} lowStockProducts={lowStockProducts} pendingBarCount={pendingBarCount} pendingCocinaCount={pendingCocinaCount} />

      <div className="flex flex-col flex-1 min-w-0" style={{ maxHeight: '100vh', overflowY: 'auto' }}>

      {isOffline && <OfflineBanner colors={C} pendingMutations={pendingMutations + pendingSalesCount} />}

      <QrCallBanner qrCalls={qrCalls} colors={C} onDismiss={dismissQrCalls} />

      <TopBar colors={C} theme={theme} toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} currentUser={currentUser} trainingMode={trainingMode} toggleTraining={toggleTraining} handlePrint={handlePrint} setShowSettings={setShowSettings} logout={logout} showToast={showToast} ticketSettings={ticketSettings} loadClockinSummary={loadClockinSummary} setShowClockinModal={setShowClockinModal} clockinSummary={clockinSummary as { totalHours?: number; entries?: unknown[] } | null} />

      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <AppProviders
          view={view}
          handlers={{ setSelectedTableId, setActiveCategory, setShowFloorEditor, setAlmacenUbicacion, setView: navigateTo, markReady, updateItemState, advanceOrder, agotarProducto, reprintKitchenTicket, updateProductField, addProduct, deleteProduct, saveCartas, saveOffersFn, saveCombosFn, saveMealMenusFn, saveCarrusel, savePriceRulesFn, handleRefund, handleConfirmBizum, printInvoice, handleDownloadPdf, handleSendInvoiceEmail, addEmployee, updateEmployeeField, deleteEmployee }}
          data={{ floor, catalog, sales, employees, offers, combos, colors: C, ticketSettings, currentUser, showToast, almacenUbicacion, showFloorEditor, persistFloor, newProductOpen, setNewProductOpen, confirmDeleteId, setConfirmDeleteId }}
        >
          {children}
        </AppProviders>
      </main>

      {selectedTable && (
        <ComandaDrawer
          selectedTable={selectedTable} selectedOrder={selectedOrder}
          catalog={catalog as unknown as ComandaDrawerProps['catalog']} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
          orderTotal={orderTotal} orderDiscount={orderDiscount} setOrderDiscount={setOrderDiscount}
          tipAmount={tipAmount} finalTotal={finalTotal}
          onClose={() => { setSelectedTableId(null); setActiveTicketId(null); }}
          onAddItem={addItem as unknown as ComandaDrawerProps['onAddItem']} onChangeQty={changeQty} onRemoveItem={removeItem}
          onCancelTable={cancelTable}
          onSendToKitchenCourse={sendToKitchenCourse} onSendItemToKitchen={sendItemToKitchen} onToggleCuenta={toggleCuenta}
          onOpenPayment={() => { setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail(''); setPaying(true); }}
          onResetTable={() => { const next = clone(floor as Floor); const table = next?.tables?.find((t) => t.id === selectedTableId); if (!table) return; table.status = 'libre'; table.orderId = null; table.orderIds = []; persistFloor(next); setSelectedTableId(null); setActiveTicketId(null); }}
          onUpdateNotes={updateItemNotes} onUpdateItemCourse={updateItemCourse}
          onEditItemModifiers={editItemModifiers}
          onSetItemDiscount={setItemDiscount} onRemoveItemDiscount={removeItemDiscount} onSetItemCourtesy={setItemCourtesy} onRemoveItemCourtesy={removeItemCourtesy} onSetItemPrice={setItemPrice as (itemId: string, price: number | null) => void}
          onVoidSentItem={voidSentItem}
          onApplyPersonalDiscount={applyPersonalDiscount} onRemovePersonalDiscount={removePersonalDiscount}
          employees={employees} ticketSettings={ticketSettings} floor={floor}
          onMoveTable={moveTable as (currentId: string, destId: string | null) => void} onMergeTables={mergeTables}
          currentTableId={selectedTableId ?? ''} activeTicketId={activeTicketId ?? ''}
          onSwitchTicket={(tid, oid) => setActiveTicketId(oid)} onCreateTicket={createNewTicket} onDeleteEmptyTicket={deleteEmptyTicket}
          onRenameTicket={(oid, label) => renameTicket(selectedTableId ?? '', oid, label)}
          onLinkCustomer={(oid: string | undefined, customer) => linkCustomer(oid!, customer)} onUnlinkCustomer={(oid) => unlinkCustomer(oid)}
          onReopenOrder={reopenOrder} onVoidTable={() => voidTable()}
          todayHistory={floor?.history?.[selectedTableId ?? ''] || []}
          combos={combos as unknown as ComandaDrawerProps['combos']} mealMenus={(catalog?.mealMenus || []) as unknown as ComandaDrawerProps['mealMenus']} colors={C}
         />
      )}

      {paying && selectedOrder && (
        <PaymentModal
          selectedTable={selectedTable} currentUser={currentUser}
          finalTotal={finalTotal} orderDiscount={orderDiscount} tipAmount={tipAmount} setTipAmount={setTipAmount}
          tipMethod={tipMethod} setTipMethod={setTipMethod}
          paymentSplits={paymentSplits} remaining={remaining} canConfirm={canConfirm}
          onAddSplit={addSplit} onUpdateSplitAmount={updateSplitAmount} onRemoveSplit={removeSplit} onToggleSplitItem={toggleSplitItem}
          onConfirm={closeBill} onStripeSuccess={(pi) => { setPaymentIntentId(pi.id); closeBill(); }}
          onCancel={() => { setPaying(false); setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail(''); }}
          onPrint={handlePrint} showToast={showToast} orderItems={selectedOrder?.items || []}
          invoiceNif={invoiceNif} setInvoiceNif={setInvoiceNif} invoiceName={invoiceName} setInvoiceName={setInvoiceName}
          invoiceAddress={invoiceAddress} setInvoiceAddress={setInvoiceAddress} invoiceEmail={invoiceEmail} setInvoiceEmail={setInvoiceEmail}
          colors={C}
        />
      )}

      {showModifierSelector && (
        <ModifierSelector product={showModifierSelector.product} modifierGroups={showModifierSelector.groups} onConfirm={confirmModifiersAndAdd as unknown as ModifierSelectorProps['onConfirm']} onCancel={() => { setShowModifierSelector(null); setEditingItemModifiers(null); }} colors={C} initialModifiers={editingItemModifiers?.item?.modifiers} />
      )}

      {toast && (
        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }} className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm shadow-lg z-50 fade-up no-print">
          {toast}
        </div>
      )}

      <SettingsModal C={C as unknown as Record<string, string>} ticketSettings={ticketSettings} setTicketSettings={setTicketSettings} showSettings={showSettings} setShowSettings={setShowSettings} showToast={showToast} catalog={catalog} />

      {showClockinModal && (
        <ClockinModal C={C} currentUser={currentUser} clockinLoading={clockinLoading} clockinSummary={clockinSummary} onAction={handleClockinAction} onClose={() => setShowClockinModal(false)} />
      )}

      <EventLog />
      <CommandPalette isOpen={showCommands} onClose={() => setShowCommands(false)} navItems={navGroups.flatMap((g) => g.items)} floor={floor} onSelectTable={(id) => { setSelectedTableId(id); setActiveCategory('Todos'); }} onNavigate={(id) => { navigateTo(id); }} onAction={(action) => { if (action === 'openDrawer') openDrawer(); else if (action === 'toggleTraining') toggleTraining(); else if (action === 'print') handlePrint(); }} C={C} />
      </div>
    </div>
  );
}
