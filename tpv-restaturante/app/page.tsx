"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  WifiOff, Bell,
} from 'lucide-react';

import { type Theme, THEMES, clone } from '../components/constants';
import { fetchModifiers } from '../lib/api';
import { escposOpenDrawer, printESCPOS, isPrinterConnected } from '../lib/thermal-printer';

declare global {
  interface Window {
    __tpvToastTimer: number;
    __TPV_API_KEY?: string;
  }
}

type View = 'salon' | 'comandas' | 'cocina' | 'inventario' | 'almacen' | 'albaranes' | 'informes' | 'empleados' | 'ofertas' | 'combos' | 'menus' | 'carrusel' | 'precios' | 'reparto' | 'pedidos' | 'fiados' | 'gestoria' | 'pairing' | 'audit' | 'turnos' | 'registro-horario' | 'solicitudes' | 'pedidos-compra' | 'reservas' | 'waitlist' | 'onlineorders' | 'buffet' | 'tickets' | 'pagos' | 'kds' | 'barra' | 'carta' | 'produccion' | 'login';

import { useOrders }           from '../hooks/useOrders';
import { useKitchen }          from '../hooks/useKitchen';
import { useInventory }        from '../hooks/useInventory';
import { useEmployees }        from '../hooks/useEmployees';
import { useInvoice }          from '../hooks/useInvoice';
import { useSalesActions }     from '../hooks/useSalesActions';
import { useAppInit }          from '../hooks/useAppInit';
import { useOfflineSync }      from '../hooks/useOfflineSync';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useLoginRouting }     from '../hooks/useLoginRouting';
import { useRealtimeSync }     from '../hooks/useRealtimeSync';
import { useQrPolling }        from '../hooks/useQrPolling';
import { useDebtOrder }        from '../hooks/useDebtOrder';
import MenuPrincipal        from '../components/MenuPrincipal';
import LoginScreen          from '../components/LoginScreen';
import CommandPalette       from '../components/CommandPalette';
import PaymentModal         from '../modules/payment/PaymentModal';
import ModifierSelector     from '../components/ModifierSelector';
import ComandaDrawer        from '../modules/salon/ComandaDrawer';
import ClockinModal         from '../components/ClockinModal';
import { EventLog }          from '../modules/debug/EventLog';
import SettingsModal        from '../components/SettingsModal';
import ViewRouter from '../modules/core/ViewRouter'
import Sidebar from '../modules/core/Sidebar'
import TopBar from '../modules/core/TopBar'
import { navGroups } from '../modules/core/nav-config'

export default function App() {
  const [theme, setTheme] = useState<string>('dark');
  const C: Theme = THEMES[theme as keyof typeof THEMES];

  const [tenants, setTenants]       = useState<any[]>([]);
  const [tenantId, setTenantId]     = useState<string>(() => {
    if (typeof window === 'undefined') return 'default';
    try { return localStorage.getItem('tpv:tenant') || 'default'; } catch { return 'default'; }
  });

  const [catalog, setCatalog]       = useState<any>(null);
  const [floor, setFloor]           = useState<any>(null);
  const [sales, setSales]           = useState<any[]>([]);
  const [employees, setEmployees]   = useState<any[]>([]);

  const [menuMode, setMenuMode]           = useState<string>('menu');
  const [entryPoint, setEntryPoint]       = useState<string>('entrada');
  const [view, setView]                   = useState<View>('salon');
  const [almacenUbicacion, setAlmacenUbicacion] = useState<any>(null);

  const [toast, setToast]                  = useState<string | null>(null);
  const [modifierData, setModifierData]    = useState<any>({ groups: [], productModifiers: {} });
  const [ticketSettings, setTicketSettings] = useState<Record<string, any>>({
    restaurantName: 'LA COMANDA', companyCif: '78406450W', companyAddress: '', companyPhone: '', logoUrl: '', footerText: 'Gracias por su visita', ticketWidth: '80mm',
  });
  const [showSettings, setShowSettings]     = useState(false);
  const [offers, setOffers]                = useState<any[]>([]);
  const [combos, setCombos]                = useState<any[]>([]);

  const [showCommands, setShowCommands]             = useState(false);
  const [showClockinModal, setShowClockinModal]     = useState(false);
  const [clockinSummary, setClockinSummary]         = useState<any>(null);
  const [clockinLoading, setClockinLoading]         = useState(false);
  const [showFloorEditor, setShowFloorEditor]       = useState(false);

  const [qrCalls, setQrCalls] = useState<any[]>([]);

  const [paying, setPaying] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout(window.__tpvToastTimer);
    window.__tpvToastTimer = window.setTimeout(() => setToast(null), 2600);
  }

  function openDrawer(): void {
    if (!isPrinterConnected()) { showToast('No hay impresora conectada'); return; }
    printESCPOS(escposOpenDrawer()).then(() => {}).catch(() => {});
  }

  const emp = useEmployees({ employees, setEmployees, showToast, floor, setFloor });
  const {
    currentUser, setCurrentUser, loginSelected, setLoginSelected, pinInput, setPinInput,
    trainingMode, setTrainingMode, savedFloor, setSavedFloor,
    pressDigit, deleteDigit, logout,
    addEmployee, updateEmployeeField, deleteEmployee,
    toggleTraining, loadClockinSummary, handleClockinAction,
    tryRestoreSession,
  } = emp;

  const orders = useOrders({
    floor, setFloor, catalog, setCatalog, sales, setSales,
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

  const kitchen = useKitchen({ floor, setFloor, persistFloor, catalog, setCatalog, showToast, handlePrint, tenantId });
  const { updateItemState, advanceOrder, agotarProducto, reprintKitchenTicket, handleReadyNotification } = kitchen;

  const { loading, fatalError } = useAppInit({
    tenantId, setTenants, setCatalog, setFloor, setEmployees, setSales,
    setTicketSettings, setOffers, setCombos, tryRestoreSession,
  });

  useLoginRouting({
    currentUser, setCurrentUser, entryPoint,
    setView, setMenuMode, setSelectedTableId,
    setAlmacenUbicacion, showToast,
  });

  const { isOffline, pendingMutations } = useOfflineSync();

  useKeyboardShortcuts({
    onToggleCommandPalette: useCallback(() => setShowCommands(p => !p), []),
    onEscape: useCallback(() => { setShowCommands(false); setShowSettings(false); setSelectedTableId(null); setActiveTicketId(null); }, []),
    onFocusSearch: useCallback(() => {}, []),
    onOpenPayment: useCallback(() => { setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true); }, []),
    onQuickCash: useCallback(() => { setPaymentSplits([{ method: 'efectivo', amount: 0 }]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true); }, []),
    onQuickCard: useCallback(() => { setPaymentSplits([{ method: 'tarjeta', amount: 0 }]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true); }, []),
  });

  useRealtimeSync({ tenantId, setFloor, setSales, onReadyNotification: handleReadyNotification });
  useQrPolling(setQrCalls);
  useDebtOrder({ selectedTable, selectedTableId, currentUser, sales, floor, setFloor, showToast, debtFloorRef });

  const inv = useInventory({ catalog, setCatalog, offers, setOffers, combos, setCombos, showToast });
  const {
    newProductOpen, setNewProductOpen, confirmDeleteId, setConfirmDeleteId,
    lowStockProducts, addProduct, updateProductField, deleteProduct,
    saveOffers: saveOffersFn, saveCombos: saveCombosFn, saveMealMenus: saveMealMenusFn,
    savePriceRules: savePriceRulesFn, saveCarrusel, saveCartas,
  } = inv;

  const { printInvoice, handleDownloadPdf, handleSendInvoiceEmail } = useInvoice({ ticketSettings, showToast });
  const { handleRefund, handleConfirmBizum } = useSalesActions({ sales, setSales, currentUser, showToast });

  useEffect(() => {
    if (!catalog) return;
    fetchModifiers().then(data => { if (data) setModifierData(data); }).catch(() => {});
  }, [catalog]);

  if (loading) return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_: any, i) => (
          <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: C.surface }} />
        ))}
      </div>
    </div>
  );

  if (fatalError) return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertTriangle style={{ color: C.wineLight }} className="w-10 h-10 mx-auto mb-3" />
        <p className="font-semibold mb-1">No se ha podido conectar con la base de datos</p>
        <p style={{ color: C.muted }} className="text-sm">Revisa la conexion con la base de datos y recarga la pagina.</p>
      </div>
    </div>
  );

  if (!currentUser) {
    const qrBlock = (
      <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#fff', border: `3px solid ${C.brass}`, borderRadius: 16 }}
        className="p-3 flex flex-col items-center gap-1 shadow-2xl z-50">
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('https://tpv-sigma.vercel.app/descargar')}`}
          alt="QR App Móvil" className="w-40 h-40" />
        <span className="text-xs font-semibold" style={{ color: '#333' }}>Descargar App</span>
      </div>
    );
    if (menuMode === 'menu') return <><MenuPrincipal employees={employees} onLoginClick={() => { setEntryPoint('entrada'); setMenuMode('login'); }} onAlmacenClick={() => { setEntryPoint('almacen'); setMenuMode('login'); }} onCajaClick={() => { setEntryPoint('caja'); setMenuMode('login'); }} onConfigClick={() => { setEntryPoint('config'); setMenuMode('login'); }} colors={C} />{qrBlock}</>;
    if (menuMode === 'login') return <><LoginScreen employees={employees} loginSelected={loginSelected} setLoginSelected={setLoginSelected} pinInput={pinInput} setPinInput={setPinInput} onDigit={pressDigit} onDelete={deleteDigit} onBack={() => setMenuMode('menu')} colors={C} />{qrBlock}</>;
    return <><MenuPrincipal employees={employees} onLoginClick={() => { setEntryPoint('entrada'); setMenuMode('login'); }} onAlmacenClick={() => { setEntryPoint('almacen'); setMenuMode('login'); }} onCajaClick={() => { setEntryPoint('caja'); setMenuMode('login'); }} onConfigClick={() => { setEntryPoint('config'); setMenuMode('login'); }} colors={C} />{qrBlock}</>;
  }

  if (!floor) return (
    <div style={{ background: C.base, minHeight: '100vh' }}
      className="flex items-center justify-center p-6">
      <div className="animate-pulse text-sm" style={{ color: C.muted }}>Cargando datos del salón…</div>
    </div>
  );

  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex">
      <Sidebar menuMode={menuMode} currentUser={currentUser} tenants={tenants} tenantId={tenantId} setTenantId={setTenantId} view={view} setView={setView} colors={C} lowStockProducts={lowStockProducts} pendingBarCount={pendingBarCount} pendingCocinaCount={pendingCocinaCount} />

      <div className="flex flex-col flex-1 min-w-0" style={{ maxHeight: '100vh', overflowY: 'auto' }}>

      {isOffline && (
        <div style={{ background: C.wine, color: C.cream }} className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium no-print">
          <WifiOff className="w-3.5 h-3.5" /> Sin conexión — los cambios se guardarán cuando vuelva la red
          {pendingMutations > 0 && <span className="ml-1">({pendingMutations} pendientes)</span>}
        </div>
      )}

      {qrCalls.length > 0 && (
        <div style={{ background: C.brass, color: '#000' }} className="flex items-center justify-between px-4 py-2 text-xs font-medium no-print">
          <span className="flex items-center gap-2"><Bell className="w-3.5 h-3.5" />{qrCalls.length === 1 ? `Mesa ${qrCalls[0].tableName || qrCalls[0].tableId} necesita atención` : `${qrCalls.length} mesas llaman al camarero`}</span>
          <button onClick={async () => { for (const call of qrCalls) { await fetch('/api/qr-calls', { method: 'PUT', body: JSON.stringify({ id: call.id }) }); } setQrCalls([]); }}
            className="px-2 py-0.5 rounded text-[10px] font-bold hover:opacity-80" style={{ background: 'rgba(0,0,0,0.2)' }}>
            Atender
          </button>
        </div>
      )}

      <TopBar colors={C} theme={theme} toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} currentUser={currentUser} trainingMode={trainingMode} toggleTraining={toggleTraining} handlePrint={handlePrint} setShowSettings={setShowSettings} setMenuMode={setMenuMode} logout={logout} showToast={showToast} ticketSettings={ticketSettings} loadClockinSummary={loadClockinSummary} setShowClockinModal={setShowClockinModal} clockinSummary={clockinSummary} />

      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <ViewRouter view={view} handlers={{ setSelectedTableId, setActiveCategory, setShowFloorEditor, setAlmacenUbicacion, setView, markReady, updateItemState, advanceOrder, agotarProducto, reprintKitchenTicket, updateProductField, addProduct, deleteProduct, saveCartas, saveOffersFn, saveCombosFn, saveMealMenusFn, saveCarrusel, savePriceRulesFn, handleRefund, handleConfirmBizum, printInvoice, handleDownloadPdf, handleSendInvoiceEmail, addEmployee, updateEmployeeField, deleteEmployee }} data={{ floor, catalog, sales, employees, offers, combos, colors: C, ticketSettings, currentUser, showToast, almacenUbicacion, showFloorEditor, persistFloor, newProductOpen, setNewProductOpen, confirmDeleteId, setConfirmDeleteId }} />
      </main>

      {selectedTable && (
        <ComandaDrawer
          selectedTable={selectedTable} selectedOrder={selectedOrder}
          catalog={catalog} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
          orderTotal={orderTotal} orderDiscount={orderDiscount} setOrderDiscount={setOrderDiscount}
          tipAmount={tipAmount} finalTotal={finalTotal}
          onClose={() => { setSelectedTableId(null); setActiveTicketId(null); }}
          onAddItem={addItem} onChangeQty={changeQty} onRemoveItem={removeItem}
          onCancelTable={cancelTable}
          onSendToKitchenCourse={sendToKitchenCourse} onSendItemToKitchen={sendItemToKitchen} onToggleCuenta={toggleCuenta}
          onOpenPayment={() => { setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail(''); setPaying(true); }}
          onResetTable={() => { const next = clone(floor); const table = next?.tables?.find((t: any) => t.id === selectedTableId); if (!table) return; table.status = 'libre'; table.orderId = null; table.orderIds = []; persistFloor(next); setSelectedTableId(null); setActiveTicketId(null); }}
          onUpdateNotes={updateItemNotes} onUpdateItemCourse={updateItemCourse} onEditItemModifiers={editItemModifiers}
          onSetItemDiscount={setItemDiscount} onRemoveItemDiscount={removeItemDiscount} onSetItemCourtesy={setItemCourtesy} onRemoveItemCourtesy={removeItemCourtesy} onSetItemPrice={setItemPrice as (itemId: string, price: number | null) => void}
          onVoidSentItem={voidSentItem}
          onApplyPersonalDiscount={applyPersonalDiscount} onRemovePersonalDiscount={removePersonalDiscount}
          employees={employees} ticketSettings={ticketSettings} floor={floor}
          onMoveTable={moveTable as (currentId: string, destId: string | null) => void} onMergeTables={mergeTables}
          currentTableId={selectedTableId} activeTicketId={activeTicketId}
          onSwitchTicket={(tid, oid) => setActiveTicketId(oid)} onCreateTicket={createNewTicket} onDeleteEmptyTicket={deleteEmptyTicket}
          onRenameTicket={(oid, label) => renameTicket(selectedTableId, oid, label)}
          onLinkCustomer={(oid: string | undefined, customer) => linkCustomer(oid!, customer)} onUnlinkCustomer={(oid) => unlinkCustomer(oid)}
          onReopenOrder={reopenOrder} onVoidTable={() => voidTable()}
          todayHistory={floor?.history?.[selectedTableId] || []}
          combos={combos} mealMenus={catalog?.mealMenus || []} colors={C}
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
        <ModifierSelector product={showModifierSelector.product} modifierGroups={showModifierSelector.groups} onConfirm={confirmModifiersAndAdd} onCancel={() => { setShowModifierSelector(null); setEditingItemModifiers(null); }} colors={C} initialModifiers={editingItemModifiers?.item?.modifiers} />
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
      <CommandPalette isOpen={showCommands} onClose={() => setShowCommands(false)} navItems={navGroups.flatMap((g: any) => g.items)} floor={floor} onSelectTable={(id) => { setSelectedTableId(id); setActiveCategory('Todos'); }} onNavigate={(id) => { setView(id as View); }} onAction={(action) => { if (action === 'openDrawer') openDrawer(); else if (action === 'toggleTraining') toggleTraining(); else if (action === 'print') handlePrint(); }} C={C} />
      </div>
    </div>
  );
}
