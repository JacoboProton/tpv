"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  LayoutGrid, ChefHat, Package, BarChart3, AlertTriangle,
  LogOut, Users, ShieldCheck, Sun, Moon, ClipboardList, WifiOff, Printer, Settings, Percent, Truck, Euro, Star, Undo2, FileText, Monitor, Calendar, Bell, Clock, Loader2,
  Power, Ticket, CreditCard, Beer,
} from 'lucide-react';

import { type Theme, THEMES, seedCatalog, seedFloor, seedEmployees, euros, round2, clone } from '../components/constants';
import {
  runMigrate, fetchCatalog, saveCatalog,
  fetchFloor, saveFloor, setLastFloor,
  fetchSales, addSale,
  fetchEmployees, saveEmployees,
  logAccess,
  registerVerifactu,
  saveCancelledOrder,
  saveTurn,
  fetchModifiers,
  fetchSettings, fetchOffers, fetchCombos,
} from '../lib/api';
import { onNetworkChange, enqueueMutation, getMutations, cacheGet, cacheSet } from '../lib/offline';
import { connectRealtime, broadcastFloorUpdate, disconnectRealtime } from '../lib/realtime';
import { escposOpenDrawer, printESCPOS, isPrinterConnected } from '../lib/thermal-printer';
import { createDebtOrder } from '../domain/payments/debt';
import { normalizeTableFields, migrateTo3ColumnLayout } from '../domain/tables/floor-layout';



declare const API_KEY: string;

declare global {
  interface Window {
    __tpvToastTimer: number;
    __TPV_API_KEY?: string;
  }
}

type View = 'salon' | 'comandas' | 'cocina' | 'inventario' | 'almacen' | 'albaranes' | 'informes' | 'empleados' | 'ofertas' | 'combos' | 'menus' | 'carrusel' | 'precios' | 'reparto' | 'pedidos' | 'fiados' | 'gestoria' | 'pairing' | 'audit' | 'turnos' | 'registro-horario' | 'solicitudes' | 'pedidos-compra' | 'reservas' | 'waitlist' | 'onlineorders' | 'buffet' | 'tickets' | 'pagos' | 'kds' | 'barra' | 'carta' | 'produccion' | 'login';

interface AnyRecord { [key: string]: any }

import { useOrders }           from '../hooks/useOrders';
import { useKitchen }          from '../hooks/useKitchen';
import { useInventory }        from '../hooks/useInventory';
import { useEmployees }        from '../hooks/useEmployees';
import { useInvoice }          from '../hooks/useInvoice';
import { useSalesActions }     from '../hooks/useSalesActions';
import MenuPrincipal        from '../components/MenuPrincipal';
import LoginScreen          from '../components/LoginScreen';
import SalonView            from '../components/SalonView';
import ComandaDrawer        from '../components/ComandaDrawer';
import PaymentModal         from '../components/PaymentModal';
import ModifierSelector     from '../components/ModifierSelector';
import CommandPalette       from '../components/CommandPalette';
import { EventLog }          from '../modules/debug/EventLog';
import SettingsModal        from '../components/SettingsModal';
import DrawerModal          from '../components/DrawerModal';

const FloorEditor          = dynamic(() => import('../components/FloorEditor'), { ssr: false });
const CocinaView           = dynamic(() => import('../components/CocinaView'), { ssr: false });
const InventarioView       = dynamic(() => import('../components/InventarioView'), { ssr: false });
const AlmacenMenuView      = dynamic(() => import('../components/AlmacenMenuView'), { ssr: false });
const AlmacenDetalleView   = dynamic(() => import('../components/AlmacenDetalleView'), { ssr: false });
const InformesView         = dynamic(() => import('../components/InformesView'), { ssr: false });
const EmpleadosView        = dynamic(() => import('../components/EmpleadosView'), { ssr: false });
const ComandasAbiertasView = dynamic(() => import('../components/ComandasAbiertasView'), { ssr: false });
const OfertasPanel         = dynamic(() => import('../components/OfertasPanel'), { ssr: false });
const CombosPanel          = dynamic(() => import('../components/CombosPanel'), { ssr: false });
const MenusDelDiaPanel     = dynamic(() => import('../components/MenusDelDiaPanel'), { ssr: false });
const PreciosPanel         = dynamic(() => import('../components/PreciosPanel'), { ssr: false });
const CarruselPanel        = dynamic(() => import('../components/CarruselPanel'), { ssr: false });
const CartasView           = dynamic(() => import('../components/CartasView'), { ssr: false });
const DeliveryView         = dynamic(() => import('../components/DeliveryView'), { ssr: false });
const PedidosView          = dynamic(() => import('../components/PedidosView'), { ssr: false });
const BarraView            = dynamic(() => import('../components/BarraView'), { ssr: false });
const FiadosView           = dynamic(() => import('../components/FiadosView'), { ssr: false });
const GestoriaView         = dynamic(() => import('../components/GestoriaView'), { ssr: false });
const KDSView              = dynamic(() => import('../components/KDSView'), { ssr: false });
const PairingPanel         = dynamic(() => import('../components/PairingPanel'), { ssr: false });
const AuditView            = dynamic(() => import('../components/AuditView'), { ssr: false });
const PaymentsView         = dynamic(() => import('../components/PaymentsView'), { ssr: false });
const ReservasView         = dynamic(() => import('../components/ReservasView'), { ssr: false });
const WaitlistView         = dynamic(() => import('../components/WaitlistView'), { ssr: false });
const BuffetKioskView      = dynamic(() => import('../components/BuffetKioskView'), { ssr: false });
const OnlineOrdersView     = dynamic(() => import('../components/OnlineOrdersView'), { ssr: false });
const TurnosView           = dynamic(() => import('../components/TurnosView'), { ssr: false });
const RegistroHorarioView  = dynamic(() => import('../components/RegistroHorarioView'), { ssr: false });
const SolicitudesView      = dynamic(() => import('../components/SolicitudesView'), { ssr: false });
const PedidosCompraView    = dynamic(() => import('../components/PedidosCompraView'), { ssr: false });
const AlbaranesView        = dynamic(() => import('../components/AlbaranesView'), { ssr: false });
const ProduccionView       = dynamic(() => import('../components/ProduccionView'), { ssr: false });
const TicketsView          = dynamic(() => import('../components/TicketsView'), { ssr: false });

export default function App() {
  // ---------- Tema claro/oscuro ----------
  const [theme, setTheme] = useState<string>('dark');
  const C: Theme = THEMES[theme as keyof typeof THEMES];

  // ---------- Multi-tenant ----------
  const [tenants, setTenants]       = useState<any[]>([] as any[]);
  const [tenantId, setTenantId]     = useState<string>(() => {
    if (typeof window === 'undefined') return 'default';
    try { return localStorage.getItem('tpv:tenant') || 'default'; } catch { return 'default'; }
  });

  // ---------- Estado global ----------
  const [loading, setLoading]       = useState<boolean>(true);
  const [fatalError, setFatalError] = useState<boolean>(false);
  const [catalog, setCatalog]       = useState<any>(null as any);
  const [floor, setFloor]           = useState<any>(null as any);
  const [sales, setSales]           = useState<any[]>([] as any[]);
  const [employees, setEmployees]   = useState<any[]>([] as any[]);

  const [menuMode, setMenuMode]           = useState<string>('menu');
  const [entryPoint, setEntryPoint]       = useState<string>('entrada');

  // Navegacion
  const [view, setView]                         = useState<View>('salon');
  const [almacenUbicacion, setAlmacenUbicacion] = useState<any>(null as any);

  // Editor de plano
  const [showFloorEditor, setShowFloorEditor] = useState<boolean>(false);

  // UI auxiliar
  const [toast, setToast]                     = useState<string | null>(null as string | null);
  // Offline
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' && !navigator.onLine);
  const [pendingMutations, setPendingMutations] = useState<number>(0);

  // QR calls
  const [qrCalls, setQrCalls] = useState<any[]>([] as any[]);

  // Modificadores
  const [modifierData, setModifierData] = useState<any>({ groups: [], productModifiers: {} });

  // Configuración ticket
  const [ticketSettings, setTicketSettings] = useState<Record<string, any>>({
    restaurantName: 'LA COMANDA', companyCif: '78406450W', companyAddress: '', companyPhone: '', logoUrl: '', footerText: 'Gracias por su visita', ticketWidth: '80mm',
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Ofertas / Combos
  const [offers, setOffers] = useState<any[]>([] as any[]);
  const [combos, setCombos] = useState<any[]>([] as any[]);

  // Cajón y formación
  const [showCommands, setShowCommands] = useState(false);

  // 🆕 Hook de empleados
  const emp = useEmployees({
    employees, setEmployees,
    showToast,
    floor, setFloor,
  });

  // Routing al hacer login
  const prevUserRef = useRef<any>(null);
  useEffect(() => {
    if (!emp.currentUser || emp.currentUser === prevUserRef.current) return;
    prevUserRef.current = emp.currentUser;
    const employee = emp.currentUser;
    let targetView: View = 'salon';
    if (entryPoint === 'almacen') {
      if (employee.role !== 'admin') { emp.setCurrentUser(null); showToast('Solo administradores pueden acceder al almacen'); return; }
      targetView = 'almacen'; setAlmacenUbicacion(null);
    } else if (entryPoint === 'caja') {
      if (employee.role !== 'admin') { emp.setCurrentUser(null); showToast('Solo administradores pueden acceder a la caja'); return; }
      targetView = 'informes';
    } else if (entryPoint === 'config') {
      if (employee.role !== 'admin') { emp.setCurrentUser(null); showToast('Solo administradores pueden acceder a configuracion'); return; }
      targetView = 'empleados';
    }
    setView(targetView);
    setMenuMode('app');
    logAccess({ employeeId: employee.id, employeeName: employee.name, role: employee.role, entryPoint }).catch(() => {});
    const body = { employeeId: employee.id, employeeName: employee.name, action: 'entrada', turnDate: new Date().toISOString().slice(0, 10) };
    fetch('/api/turns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  }, [emp.currentUser, entryPoint]);

  // Routing al hacer logout
  useEffect(() => {
    if (emp.currentUser !== null) return;
    if (prevUserRef.current === null) return;
    prevUserRef.current = null;
    setSelectedTableId(null); setView('salon'); setMenuMode('menu');
  }, [emp.currentUser]);

  const {
    currentUser,
    loginSelected, setLoginSelected, pinInput, setPinInput,
    trainingMode, setTrainingMode, savedFloor, setSavedFloor,
    showClockinModal, setShowClockinModal, clockinSummary, clockinLoading,
    pressDigit, deleteDigit, logout,
    addEmployee, updateEmployeeField, deleteEmployee,
    toggleTraining, loadClockinSummary, handleClockinAction,
    tryRestoreSession,
  } = emp;

  // 🆕 Hook de pedidos — extraído de page.tsx
  const orders = useOrders({
    floor, setFloor,
    catalog, setCatalog,
    sales, setSales,
    employees, setEmployees,
    currentUser,
    tenantId,
    modifierData,
    ticketSettings,
    offers,
    trainingMode,
    showToast,
  });

  const {
    selectedTableId, setSelectedTableId,
    activeTicketId, setActiveTicketId,
    activeCategory, setActiveCategory,
    paying, setPaying,
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
    selectedTable,
    activeOrderId,
    selectedOrder,
    orderTotal,
    discountedTotal,
    finalTotal,
    splitsUsed,
    remaining,
    canConfirm,
    pendingBarCount,
    pendingCocinaCount,
    persistFloor,
    persistSales,
    addItem,
    confirmModifiersAndAdd,
    changeQty,
    updateItemNotes,
    removeItem,
    sendToKitchenCourse,
    sendItemToKitchen,
    updateItemCourse,
    editItemModifiers,
    toggleCuenta,
    markReady,
    voidSentItem,
    setItemDiscount,
    removeItemDiscount,
    setItemCourtesy,
    removeItemCourtesy,
    setItemPrice,
    calcPersonalDiscountAmount,
    applyPersonalDiscount,
    removePersonalDiscount,
    cancelTable,
    voidTable,
    moveTable,
    mergeTables,
    reopenOrder,
    createNewTicket,
    switchTicket,
    deleteEmptyTicket,
    renameTicket,
    linkCustomer,
    unlinkCustomer,
    addSplit,
    updateSplitAmount,
    removeSplit,
    toggleSplitItem,
    closeBill,
    handlePrint,
    debtFloorRef,
  } = orders;

  const {
    updateItemState,
    advanceOrder,
    agotarProducto,
    reprintKitchenTicket,
    handleReadyNotification,
  } = useKitchen({ floor, setFloor, persistFloor, catalog, setCatalog, showToast, handlePrint, tenantId });

  const {
    newProductOpen, setNewProductOpen,
    confirmDeleteId, setConfirmDeleteId,
    lowStockProducts,
    addProduct,
    updateProductField,
    deleteProduct,
    saveOffers: saveOffersFn,
    saveCombos: saveCombosFn,
    saveMealMenus: saveMealMenusFn,
    savePriceRules: savePriceRulesFn,
    saveCarrusel,
    saveCartas,
  } = useInventory({ catalog, setCatalog, offers, setOffers, combos, setCombos, showToast });

  const { printInvoice, handleDownloadPdf, handleSendInvoiceEmail } = useInvoice({ ticketSettings, showToast });

  const { handleRefund, handleConfirmBizum } = useSalesActions({ sales, setSales, currentUser, showToast });

  const floorHashRef = useRef<string>('');
  const salesHashRef = useRef<string>('');
  useEffect(() => {
    const ch = connectRealtime(tenantId);
    if (ch) {
      ch.on('broadcast', { event: 'floor:updated' }, ({ payload }) => {
        setFloor(payload.floor);
        setLastFloor(payload.floor);
      });
      ch.on('broadcast', { event: 'ready:notification' }, ({ payload }) => {
        handleReadyNotification(payload);
      });
    }
    const iv = setInterval(async () => {
      try {
        const data = await fetchFloor();
        if (!data) return;
        const h = JSON.stringify(data);
        if (h !== floorHashRef.current) { floorHashRef.current = h; setFloor(data); }
      } catch {}
    }, 10000);
    const ivSales = setInterval(async () => {
      try {
        const data = await fetchSales();
        if (!data) return;
        const h = JSON.stringify(data);
        if (h !== salesHashRef.current) { salesHashRef.current = h; setSales(data as any[]); }
      } catch {}
    }, 15000);
    return () => { disconnectRealtime(); clearInterval(iv); clearInterval(ivSales); };
  }, [tenantId, handleReadyNotification]);

  // ---------- Toast ----------
  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout(window.__tpvToastTimer);
    window.__tpvToastTimer = window.setTimeout(() => setToast(null), 2600);
  }

  // ---------- Carga inicial con Neon ----------
  useEffect(() => {
    loadAll();
  }, []);

  // Save tenant ID and reload when changed
  useEffect(() => {
    if (loading) return;
    try { localStorage.setItem('tpv:tenant', tenantId); } catch {}
    loadAll();
  }, [tenantId]);

  async function loadAll() {
    try {
      await runMigrate().catch(() => {});

      const tnts: any[] = await fetch('/api/tenants').then(r => r.json()).catch(() => []);

      // If current tenant not in list (deleted), reset to default
      if (tnts.length > 0 && !tnts.find((t: any) => t.id === tenantId)) {
        setTenantId('default');
        try { localStorage.setItem('tpv:tenant', 'default'); } catch {}
      }

      setTenants(tnts);

      // Leer cache local ANTES de fetchSales (que sobrescribe el cache con datos de API)
      const preFetchCache: any = cacheGet('sales');

      const [cat, flr, sls, emps]: [any, any, any, any] = await Promise.all([
        fetchCatalog(),
        fetchFloor(),
        fetchSales(),
        fetchEmployees(),
      ]);

      if (!cat?.products || cat.products.length === 0) {
        const seed = seedCatalog();
        await saveCatalog(seed);
        setCatalog(seed);
      } else {
        setCatalog(cat);
      }

      if (!flr?.tables || flr.tables.length === 0) {
        const seed = seedFloor();
        await saveFloor(seed as any);
        setFloor(seed);
      } else {
        // Normalize orderIds for backward compatibility
        const normalized = normalizeTableFields(flr.tables);
        flr.tables = normalized;

        // Migrate to 3-column layout (mesas izq, barras centro, domicilio der)
        if (flr.tables.filter((t: any) => t.type === 'barra').length < 6) {
          const migrated = migrateTo3ColumnLayout(flr);
          Object.assign(flr, migrated);
          await saveFloor(flr);
        }

        setFloor(flr);
      }

      if (!emps?.length) {
        const seed = seedEmployees();
        await saveEmployees(seed);
        setEmployees(seed);
      } else {
        setEmployees(emps);
      }

      // Auto-login: restore session from localStorage
      await tryRestoreSession(emps);

      const salesFromApi = Array.isArray(sls) ? sls : [];
      if (Array.isArray(preFetchCache) && preFetchCache.length > 0) {
        const apiIds = new Set(salesFromApi.map((s: any) => s.id));
        const missing = preFetchCache.filter((s: any) => s.id && !apiIds.has(s.id));
        if (missing.length > 0) {
          salesFromApi.push(...missing);
        }
      }
      setSales(salesFromApi);
      // Repoblar cache con los datos fusionados para futuros refrescos
      cacheSet('sales', salesFromApi);

      const stg = await fetchSettings().catch(() => null);
      if (stg) setTicketSettings(stg);
      const off: any = await fetchOffers().catch(() => []);
      setOffers(off);
      const cmb: any = cat?.combos || await fetchCombos().catch(() => []);
      setCombos(cmb);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setFatalError(true);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Offline ----------
  const processMutations = useCallback(async () => {
    const q = getMutations();
    if (q.length === 0) return;
    const now = Date.now();
    const MAX_AGE = 24 * 60 * 60 * 1000;
    const remaining = [];
    for (const m of q) {
      if (now - m.createdAt > MAX_AGE) continue;
      try {
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        const apiKey = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY
          ? process.env.NEXT_PUBLIC_TPV_API_KEY
          : (typeof window !== 'undefined' && window.__TPV_API_KEY) || '';
        if (apiKey) h['x-tpv-key'] = apiKey;
        const res = await fetch(m.key, { method: m.method || 'PUT', headers: h, body: m.payload as string });
        if (res.ok) continue;
      } catch {}
      remaining.push(m);
    }
    localStorage.setItem('tpv:mutations', JSON.stringify(remaining));
    setPendingMutations(remaining.length);
  }, []);

  useEffect(() => {
    const unsub = onNetworkChange(online => {
      setIsOffline(!online);
      if (online) processMutations();
    });
    const interval = setInterval(() => {
      const q = getMutations();
      setPendingMutations(q.length);
      if (q.length > 0 && navigator.onLine) processMutations();
    }, 10000);
    return () => { unsub(); clearInterval(interval); };
  }, [processMutations]);

  // Poll QR calls (reduced frequency)
  useEffect(() => {
    async function pollCalls() {
      try {
        const r = await fetch('/api/qr-calls');
        if (r.ok) setQrCalls(await r.json());
      } catch {}
    }
    pollCalls();
    const interval = setInterval(pollCalls, 15000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Mesa seleccionada ----------
  // Crear orden de deuda si la mesa esta en fiado sin orden activa
  useEffect(() => {
    if (!selectedTable?.isFiado || selectedTable?.orderId || !currentUser) return;
    const lastFiadoSale = [...sales]
      .filter((s: any) => s.tableId === selectedTableId && s.isFiado)
      .sort((a: any, b: any) => b.closedAt - a.closedAt)[0];
    if (!lastFiadoSale) return;
    debtFloorRef.current = createDebtOrder(floor, selectedTableId, lastFiadoSale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId, currentUser]);

  // Aplicar deuda fuera del efecto para no violar purity rules
  useEffect(() => {
    if (!debtFloorRef.current) return;
    const f = debtFloorRef.current;
    debtFloorRef.current = null;
    setFloor(f);
    saveFloor(f).catch(() => { enqueueMutation('/api/floor', JSON.stringify(f)); showToast('Sin conexión — la deuda se guardará cuando vuelva la red'); });
  }, []);

  // ---------- Acciones de comanda ----------

  // Acciones de comanda — gestionadas por useOrders hook

  // ---------- Modificadores ----------
  useEffect(() => {
    if (!catalog) return;
    fetchModifiers().then(data => {
      if (data) setModifierData(data);
    }).catch(() => {});
  }, [catalog]);

  // ── Atajos de teclado globales (usando refs para evitar TDZ) ──
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommands(p => !p);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommands(false); setShowSettings(false); setSelectedTableId(null); setActiveTicketId(null);
        return;
      }
      if (e.key === '/') {
        const input = document.querySelector('[data-search-products]');
        if (input) { e.preventDefault(); (input as HTMLElement).focus(); return; }
      }
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true);
        return;
      }
      if (e.altKey && e.key === 'e') {
        e.preventDefault();
        setPaymentSplits([{ method: 'efectivo', amount: 0 }]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true);
        return;
      }
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        setPaymentSplits([{ method: 'tarjeta', amount: 0 }]); setTipAmount(0); setTipMethod('efectivo'); setPaying(true);
        return;
      }
    }
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // AddItem / Print — gestionadas por useOrders hook

  function formatMinutes(mins: number): string {
    if (!mins && mins !== 0) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }

  function openDrawer(): void {
    if (!isPrinterConnected()) { showToast('No hay impresora conectada'); return; }
    printESCPOS(escposOpenDrawer()).then(() => {}).catch(() => {});
  }

  // ---------- Pantallas de carga / error ----------
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
        <p style={{ color: C.muted }} className="text-sm">Revisa la conexion con Neon y recarga la pagina.</p>
      </div>
    </div>
  );

  if (!currentUser) {
    const qrBlock = (
      <div
        style={{ position: 'fixed', bottom: 24, right: 24, background: '#fff', border: `3px solid ${C.brass}`, borderRadius: 16 }}
        className="p-3 flex flex-col items-center gap-1 shadow-2xl z-50"
      >
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('https://tpv-sigma.vercel.app/descargar')}`}
          alt="QR App Móvil"
          className="w-40 h-40"
        />
        <span className="text-xs font-semibold" style={{ color: '#333' }}>Descargar App</span>
      </div>
    );
    if (menuMode === 'menu') return (
      <><MenuPrincipal
        employees={employees}
        onLoginClick={() => { setEntryPoint('entrada'); setMenuMode('login'); }}
        onAlmacenClick={() => { setEntryPoint('almacen'); setMenuMode('login'); }}
        onCajaClick={() => { setEntryPoint('caja'); setMenuMode('login'); }}
        onConfigClick={() => { setEntryPoint('config'); setMenuMode('login'); }}
        colors={C}
      />{qrBlock}</>
    );
    if (menuMode === 'login') return (
      <><LoginScreen
        employees={employees} loginSelected={loginSelected} setLoginSelected={setLoginSelected}
        pinInput={pinInput} setPinInput={setPinInput}
        onDigit={pressDigit} onDelete={deleteDigit}
        onBack={() => setMenuMode('menu')} colors={C}
      />{qrBlock}</>
    );
    return (
      <><MenuPrincipal
        employees={employees}
        onLoginClick={() => { setEntryPoint('entrada'); setMenuMode('login'); }}
        onAlmacenClick={() => { setEntryPoint('almacen'); setMenuMode('login'); }}
        onCajaClick={() => { setEntryPoint('caja'); setMenuMode('login'); }}
        onConfigClick={() => { setEntryPoint('config'); setMenuMode('login'); }}
        colors={C}
      />{qrBlock}</>
    );
  }

  const navGroups = [
    {
      label: 'Sala y Cocina', color: '#4a90d9',
      items: [
        { id: 'salon',      label: 'Salon',      icon: LayoutGrid },
        { id: 'pairing',    label: 'Emparejar',  icon: Monitor },
        { id: 'comandas',   label: 'Comandas',   icon: ClipboardList },
        { id: 'cocina',     label: 'Cocina',     icon: ChefHat },
        { id: 'kds',        label: 'Cocina KDS',  icon: ChefHat },
        { id: 'barra',      label: 'Barra',       icon: Beer },
        { id: 'tickets',    label: 'Tickets',    icon: Ticket },
      ],
    },
    {
      label: 'Operaciones', color: '#4a90d9',
      adminOnly: true,
      items: [
        { id: 'pedidos',    label: 'Pedidos',    icon: Undo2 },
        { id: 'fiados',     label: 'Fiados',     icon: Clock },
        { id: 'reservas',   label: 'Reservas',   icon: Calendar },
        { id: 'waitlist',   label: 'Lista Espera', icon: Users },
      ],
    },
    {
      label: 'Canales', color: '#4caf50',
      adminOnly: true,
      items: [
        { id: 'buffet',      label: 'Buffet Kiosk', icon: ClipboardList },
        { id: 'onlineorders', label: 'Pedidos Online', icon: Truck },
        { id: 'reparto',    label: 'Reparto',    icon: Truck },
      ],
    },
    {
      label: 'Gestión', color: '#e8a838',
      adminOnly: true,
      items: [
        { id: 'inventario', label: 'Inventario', icon: Package },
        { id: 'carta',      label: 'Carta',      icon: ClipboardList },
        { id: 'informes',   label: 'Informes',   icon: BarChart3 },
        { id: 'empleados',  label: 'Equipo',     icon: Users },
        { id: 'ofertas',    label: 'Ofertas',    icon: Percent },
        { id: 'combos',     label: 'Combos',     icon: Package },
        { id: 'menus',      label: 'Menús',      icon: ChefHat },
        { id: 'carrusel',   label: 'Carrusel',   icon: Star },
        { id: 'precios',    label: 'Precios',    icon: Euro },
      ],
    },
    {
      label: 'Administración', color: '#c0392b',
      adminOnly: true,
      items: [
        { id: 'gestoria',   label: 'Gestoria',   icon: FileText },
        { id: 'pagos',      label: 'Pagos',      icon: CreditCard },
        { id: 'audit',      label: 'Auditoria',  icon: ClipboardList },
        { id: 'turnos',     label: 'Turnos',     icon: Calendar },
        { id: 'registro-horario', label: 'Reg. Horario', icon: Clock },
        { id: 'solicitudes',  label: 'Solicitudes', icon: ClipboardList },
        { id: 'pedidos-compra', label: 'Pedidos Compra', icon: FileText },
        { id: 'produccion', label: 'Producción', icon: Package },
      ],
    },
  ];

  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex">

      {menuMode === 'app' && (
        <aside style={{ background: C.surface, borderRight: `1px solid ${C.line}`, width: '160px' }} className="flex flex-col shrink-0 no-print sticky top-0 h-screen">
          <div className="p-3 text-center" style={{ borderBottom: `1px solid ${C.line}` }}>
            <h2 className="font-display text-lg" style={{ color: C.brassLight }}>LA COMANDA</h2>
            {currentUser?.role === 'admin' && tenants.length > 1 && (
              <select value={tenantId} onChange={e => setTenantId(e.target.value)}
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full mt-1 text-[10px] rounded px-1 py-0.5">
                {tenants.filter((t: any) => t.active).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
          <nav className="flex flex-col gap-3 p-2 overflow-y-auto flex-1">
            {navGroups.map((group: any) => {
              if (group.adminOnly && currentUser?.role !== 'admin') return null;
              const filtered = group.items;
              if (filtered.length === 0) return null;
              return (
                <div key={group.label}>
                  <div className="text-[9px] font-bold uppercase tracking-wider px-3 pb-1 pt-1"
                    style={{ color: group.color }}>
                    {group.label}
                  </div>
                  {filtered.map((item: any) => {
                    const Icon = item.icon;
                    const active = view === item.id;
                    return (
                      <button key={item.id} onClick={() => setView(item.id)}
                        style={{
                          background: active ? C.surfaceLight : 'transparent',
                          color: active ? group.color : C.muted,
                          borderLeft: active ? `3px solid ${group.color}` : '3px solid transparent',
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90 text-left shrink-0 w-full"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.id === 'inventario' && lowStockProducts.length > 0 && (
                          <span style={{ background: C.wine }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{lowStockProducts.length}</span>
                        )}
                        {item.id === 'barra' && pendingBarCount > 0 && (
                          <span style={{ background: C.brass }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{pendingBarCount}</span>
                        )}
                        {item.id === 'cocina' && pendingCocinaCount > 0 && (
                          <span style={{ background: C.brass }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{pendingCocinaCount}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>
      )}

      <div className="flex flex-col flex-1 min-w-0" style={{ maxHeight: '100vh', overflowY: 'auto' }}>

      {isOffline && (
        <div style={{ background: C.wine, color: C.cream }} className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium no-print">
          <WifiOff className="w-3.5 h-3.5" /> Sin conexión — los cambios se guardarán cuando vuelva la red
          {pendingMutations > 0 && <span className="ml-1">({pendingMutations} pendientes)</span>}
        </div>
      )}

      {qrCalls.length > 0 && (
        <div style={{ background: C.brass, color: '#000' }} className="flex items-center justify-between px-4 py-2 text-xs font-medium no-print">
          <span className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            {qrCalls.length === 1
              ? `Mesa ${qrCalls[0].tableName || qrCalls[0].tableId} necesita atención`
              : `${qrCalls.length} mesas llaman al camarero`}
          </span>
          <button onClick={async () => {
            for (const call of qrCalls) {
              await fetch('/api/qr-calls', { method: 'PUT', body: JSON.stringify({ id: call.id }) });
            }
            setQrCalls([]);
          }}
            className="px-2 py-0.5 rounded text-[10px] font-bold hover:opacity-80" style={{ background: 'rgba(0,0,0,0.2)' }}>
            Atender
          </button>
        </div>
      )}

      <header style={{ borderBottom: `1px solid ${C.line}`, background: C.base }} className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between gap-2 no-print">
        <div className="flex items-baseline gap-2">
          <span style={{ color: C.muted }} className="text-xs">TPV de sala</span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <div style={{ borderLeft: `1px solid ${C.line}` }} className="flex items-center gap-2 pl-2 ml-1 shrink-0">
            <DrawerModal C={C as unknown as Record<string, string>} ticketSettings={ticketSettings} showToast={showToast} />
            {/* Fichaje TPV */}
            <button onClick={() => { loadClockinSummary(); setShowClockinModal(true); }}
              title="Fichar entrada/salida"
              style={{ color: clockinSummary?.isActive ? C.sageLight : C.muted }}
              className="p-2 rounded-lg hover:opacity-80">
              <Clock className="w-4 h-4" />
            </button>
            <button onClick={handlePrint} title="Imprimir ticket" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
              <Printer className="w-4 h-4" />
            </button>
            {currentUser?.role === 'admin' && (
              <button onClick={() => setShowSettings(true)} title="Configurar ticket" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
                <Settings className="w-4 h-4" />
              </button>
            )}
            {/* Modo formación */}
            <button onClick={toggleTraining}
              title={trainingMode ? 'Salir de formación' : 'Activar modo formación'}
              style={{ color: trainingMode ? C.brassLight : C.muted, background: trainingMode ? C.brass + '20' : 'transparent' }}
              className="p-2 rounded-lg hover:opacity-80 relative">
              <span className="text-base">🎓</span>
            </button>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Tema" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span style={{ color: C.muted }} className="text-xs hidden md:flex items-center gap-1">
              {currentUser?.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.brassLight }} />}
              {currentUser?.name}
            </span>
            <button onClick={() => setMenuMode('menu')} title="Menu" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={logout} title="Cerrar sesion" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80"><LogOut className="w-4 h-4" /></button>
            <button onClick={() => { window.close(); setTimeout(() => showToast('Instala la app (icono 📲 en la barra) para cerrar automáticamente'), 300); }} title="Salir" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80"><Power className="w-4 h-4" /></button>
          </div>
        </nav>
      </header>

      {trainingMode && (
        <div style={{ background: C.brass + '25', color: C.brassLight, borderBottom: `1px solid ${C.brass}` }}
          className="px-4 py-2 text-center text-sm font-semibold no-print flex items-center justify-center gap-2 sticky top-0 z-20">
          🎓 MODO FORMACIÓN — los tickets NO afectan a la facturación real
        </div>
      )}
      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <div className="fade-up" key={view}>
          {view === 'salon' && !showFloorEditor && (
            <SalonView
              floor={floor}
              onSelect={id => { setSelectedTableId(id); setActiveCategory('Todos'); }}
              persistFloor={persistFloor}
              colors={C}
              onEditFloor={() => setShowFloorEditor(true)}
            />
          )}
          {view === 'salon' && showFloorEditor && (
            <div>
              <button
                onClick={() => setShowFloorEditor(false)}
                style={{ color: C.muted, background: C.surfaceLight, border: `1px solid ${C.line}` }}
                className="mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:opacity-80"
              >
                ← Volver a vista sala
              </button>
              <FloorEditor floor={floor} persistFloor={persistFloor} colors={C} />
            </div>
          )}
          {view === 'cocina'     && <CocinaView floor={floor} onReady={markReady} colors={C} />}
          {view === 'barra'      && <BarraView floor={floor} onReady={markReady} colors={C} />}
          {view === 'kds'        && <KDSView floor={floor} catalog={catalog} onReady={markReady} onUpdateItemState={updateItemState} onAdvanceOrder={advanceOrder} onAgotar={agotarProducto} onReprint={reprintKitchenTicket} colors={C} />}
          {view === 'comandas'   && <ComandasAbiertasView floor={floor} colors={C} />}
          {view === 'inventario' && <InventarioView catalog={catalog} colors={C as unknown as Record<string, string>} onUpdateField={updateProductField} newProductOpen={newProductOpen} setNewProductOpen={setNewProductOpen} onAddProduct={addProduct} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />}
          {view === 'carta' && (
            <CartasView
              catalog={catalog}
              onSave={saveCartas}
              colors={C}
            />
          )}
          {view === 'almacen'    && (almacenUbicacion
            ? <AlmacenDetalleView catalog={catalog} ubicacion={almacenUbicacion} onBack={() => setAlmacenUbicacion(null)} colors={C} onUpdateField={updateProductField} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />
            : <AlmacenMenuView catalog={catalog} onSelectUbicacion={setAlmacenUbicacion} onSelectAlbaranes={() => setView('albaranes')} colors={C} />
          )}
          {view === 'albaranes'  && <AlbaranesView colors={C} />}
          {view === 'produccion' && <ProduccionView catalog={catalog} colors={C} />}
          {view === 'informes'   && <InformesView sales={sales} colors={C} />}
          {view === 'ofertas'   && (
            <OfertasPanel
              offers={offers} catalog={catalog}
              onSave={saveOffersFn}
              colors={C}
            />
          )}
          {view === 'combos' && (
            <CombosPanel
              combos={combos} catalog={catalog}
              onSave={saveCombosFn}
              colors={C}
            />
          )}
          {view === 'menus' && (
            <MenusDelDiaPanel
              mealMenus={catalog?.mealMenus || []} catalog={catalog}
              onSave={saveMealMenusFn}
              colors={C}
            />
          )}
          {view === 'carrusel' && (
            <CarruselPanel
              catalog={catalog}
              onSave={saveCarrusel}
              colors={C}
            />
          )}
          {view === 'precios' && (
            <PreciosPanel
              catalog={catalog}
              priceRules={catalog?.priceRules || []}
              onSaveRules={savePriceRulesFn}
              colors={C}
            />
          )}
          {view === 'reparto'    && <DeliveryView catalog={catalog} />}
          {view === 'pedidos'    && <PedidosView sales={sales} onRefund={handleRefund} onConfirmBizum={handleConfirmBizum}   onPrintInvoice={printInvoice} onDownloadPdf={handleDownloadPdf} onSendInvoiceEmail={handleSendInvoiceEmail} colors={C} />}
          {view === 'fiados'     && <FiadosView sales={sales} floor={floor} onNavigateToTable={(tableId) => { setSelectedTableId(tableId); setView('salon'); }} colors={C} />}
          {view === 'empleados'  && <EmpleadosView employees={employees} colors={C} onAdd={addEmployee} onUpdateField={updateEmployeeField} onDelete={deleteEmployee} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />}
          {view === 'gestoria'   && <GestoriaView sales={sales} colors={C} />}
          {view === 'pairing'    && <PairingPanel colors={C} />}
          {view === 'audit'      && <AuditView colors={C} />}
          {view === 'turnos'    && <TurnosView employees={employees} colors={C} />}
          {view === 'registro-horario' && <RegistroHorarioView employees={employees} colors={C} />}
          {view === 'solicitudes'   && <SolicitudesView colors={C} />}
          {view === 'pedidos-compra' && <PedidosCompraView colors={C} />}
          {view === 'reservas'   && <ReservasView floor={floor} catalog={catalog} colors={C} />}
          {view === 'waitlist'   && <WaitlistView colors={C} />}
          {view === 'onlineorders' && <OnlineOrdersView colors={C} />}
          {view === 'buffet'    && (
            <BuffetKioskView floor={floor} currentUser={currentUser} onToast={showToast} />
          )}
          {view === 'tickets'   && <TicketsView sales={sales} colors={C} ticketSettings={ticketSettings} />}
          {view === 'pagos'     && <PaymentsView colors={C} />}
        </div>
      </main>

      {selectedTable && (
        <ComandaDrawer
          selectedTable={selectedTable} selectedOrder={selectedOrder}
          catalog={catalog} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
          orderTotal={orderTotal} orderDiscount={orderDiscount} setOrderDiscount={setOrderDiscount}
          tipAmount={tipAmount} finalTotal={finalTotal}
          onClose={() => { setSelectedTableId(null); setActiveTicketId(null); }}
          onAddItem={addItem} onChangeQty={changeQty}
          onRemoveItem={removeItem}
          onCancelTable={cancelTable}
          onSendToKitchenCourse={sendToKitchenCourse} onSendItemToKitchen={sendItemToKitchen} onToggleCuenta={toggleCuenta}
          onOpenPayment={() => { setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail(''); setPaying(true); }}
          onResetTable={() => {
            const next = clone(floor);
            const table = next.tables.find((t: any) => t.id === selectedTableId);
            table.status = 'libre';
            table.orderId = null;
            table.orderIds = [];
            persistFloor(next);
            setSelectedTableId(null);
            setActiveTicketId(null);
          }}
          onUpdateNotes={updateItemNotes}
          onUpdateItemCourse={updateItemCourse}
          onEditItemModifiers={editItemModifiers}
          onSetItemDiscount={setItemDiscount}
          onRemoveItemDiscount={removeItemDiscount}
          onSetItemCourtesy={setItemCourtesy}
          onRemoveItemCourtesy={removeItemCourtesy}
          onSetItemPrice={setItemPrice as (itemId: string, price: number | null) => void}
          onVoidSentItem={voidSentItem}
          onApplyPersonalDiscount={applyPersonalDiscount}
          onRemovePersonalDiscount={removePersonalDiscount}
          employees={employees}
          ticketSettings={ticketSettings}
          floor={floor}
          onMoveTable={moveTable as (currentId: string, destId: string | null) => void}
          onMergeTables={mergeTables}
          currentTableId={selectedTableId}
          activeTicketId={activeTicketId}
          onSwitchTicket={(tid, oid) => setActiveTicketId(oid)}
          onCreateTicket={createNewTicket}
          onDeleteEmptyTicket={deleteEmptyTicket}
          onRenameTicket={(oid, label) => renameTicket(selectedTableId, oid, label)}
          onLinkCustomer={(oid: string | undefined, customer) => linkCustomer(oid!, customer)}
          onUnlinkCustomer={(oid) => unlinkCustomer(oid)}
          onReopenOrder={reopenOrder}
          onVoidTable={() => voidTable()}
          todayHistory={floor?.history?.[selectedTableId] || []}
          combos={combos}
          mealMenus={catalog?.mealMenus || []}
          colors={C}
        />
      )}

      {paying && selectedOrder && (
        <PaymentModal
          selectedTable={selectedTable}
          currentUser={currentUser}
          finalTotal={finalTotal}
          orderDiscount={orderDiscount} tipAmount={tipAmount} setTipAmount={setTipAmount}
          tipMethod={tipMethod} setTipMethod={setTipMethod}
          paymentSplits={paymentSplits} remaining={remaining} canConfirm={canConfirm}
          onAddSplit={addSplit} onUpdateSplitAmount={updateSplitAmount} onRemoveSplit={removeSplit}
          onToggleSplitItem={toggleSplitItem}
          onConfirm={closeBill}
          onStripeSuccess={(pi) => { setPaymentIntentId(pi.id); closeBill(); }}
          onCancel={() => { setPaying(false); setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail(''); }}
          onPrint={handlePrint}
          showToast={showToast}
          orderItems={selectedOrder?.items || []}
          invoiceNif={invoiceNif} setInvoiceNif={setInvoiceNif}
          invoiceName={invoiceName} setInvoiceName={setInvoiceName}
          invoiceAddress={invoiceAddress} setInvoiceAddress={setInvoiceAddress}
          invoiceEmail={invoiceEmail} setInvoiceEmail={setInvoiceEmail}
          colors={C}
        />
      )}

      {showModifierSelector && (
        <ModifierSelector
          product={showModifierSelector.product}
          modifierGroups={showModifierSelector.groups}
          onConfirm={confirmModifiersAndAdd}
          onCancel={() => { setShowModifierSelector(null); setEditingItemModifiers(null); }}
          colors={C}
          initialModifiers={editingItemModifiers?.item?.modifiers}
        />
      )}

      {toast && (
        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }} className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm shadow-lg z-50 fade-up no-print">
          {toast}
        </div>
      )}

      <SettingsModal C={C as unknown as Record<string, string>} ticketSettings={ticketSettings} setTicketSettings={setTicketSettings} showSettings={showSettings} setShowSettings={setShowSettings} showToast={showToast} catalog={catalog} />

      {/* ── Modal Fichaje TPV ── */}
      {showClockinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowClockinModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>⏰ Fichaje</p>
            <p className="text-xs mb-4" style={{ color: C.muted }}>{currentUser?.name}</p>
            {clockinLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={{ color: C.brassLight }} /></div>
            ) : (
              <div className="space-y-3">
                {clockinSummary?.isActive && (
                  <div className="rounded-lg p-3 space-y-1" style={{ background: C.surfaceLight }}>
                    <div className="flex justify-between text-xs"><span style={{ color: C.muted }}>Entrada</span><span className="font-mono" style={{ color: C.sageLight }}>{new Date(clockinSummary.entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span></div>
                    {clockinSummary.pausas?.filter((p: any) => !p.end).length > 0 && <div className="flex justify-between text-xs"><span style={{ color: C.muted }}>En pausa</span><span className="font-mono" style={{ color: C.brassLight }}>desde {new Date(clockinSummary.pausas.find((p: any) => !p.end).start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span></div>}
                    {clockinSummary.salida && <div className="flex justify-between text-xs"><span style={{ color: C.muted }}>Salida</span><span className="font-mono" style={{ color: C.wineLight }}>{new Date(clockinSummary.salida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span></div>}
                    <div style={{ borderTop: `1px solid ${C.line}` }} className="pt-1 mt-1 flex justify-between text-xs"><span style={{ color: C.muted }}>Total</span><span className="font-mono" style={{ color: C.cream }}>{formatMinutes(clockinSummary.effectiveMinutes)}</span></div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {(!clockinSummary?.isActive || clockinSummary?.isOnPause) && (
                    <button onClick={() => { handleClockinAction(clockinSummary?.isOnPause ? 'vuelta' : 'entrada'); }}
                      className="w-full py-2.5 rounded-lg text-sm font-medium"
                      style={{ background: C.sage, color: '#fff' }}>
                      {clockinSummary?.isOnPause ? '↩ Volver de pausa' : '▶ Fichar entrada'}
                    </button>
                  )}
                  {clockinSummary?.isActive && !clockinSummary?.isOnPause && (
                    <button onClick={() => handleClockinAction('pausa')}
                      className="w-full py-2.5 rounded-lg text-sm font-medium"
                      style={{ background: C.brass, color: '#000' }}>
                      ⏸ Pausa
                    </button>
                  )}
                  {clockinSummary?.isActive && (
                    <button onClick={() => handleClockinAction('salida')}
                      className="w-full py-2.5 rounded-lg text-sm font-medium"
                      style={{ background: C.wine + '30', color: C.wineLight, border: `1px solid ${C.wine}` }}>
                      ⏹ Fichar salida
                    </button>
                  )}
                </div>
                <button onClick={() => setShowClockinModal(false)}
                  className="w-full py-2 rounded-lg text-sm" style={{ background: C.surfaceLight, color: C.muted }}>
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal confirmación abrir cajón ── */}
      <EventLog />
      <CommandPalette
        isOpen={showCommands}
        onClose={() => setShowCommands(false)}
        navItems={navGroups.flatMap((g: any) => g.items)}
        floor={floor}
        onSelectTable={(id) => { setSelectedTableId(id); setActiveCategory('Todos'); }}
        onNavigate={(id) => { setView(id as View); }}
        onAction={(action) => {
          if (action === 'openDrawer') openDrawer();
          else if (action === 'toggleTraining') toggleTraining();
          else if (action === 'print') handlePrint();
        }}
        C={C}
      />
      </div>
    </div>
  );
}
