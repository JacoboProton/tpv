"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  saveStockLog,
  saveCancelledOrder,
  saveTurn,
  fetchModifiers,
  fetchSettings, saveSettings, fetchOffers, saveOffers, fetchCombos, saveCombos, saveMealMenus, savePriceRules,
} from '../lib/api';
import { onNetworkChange, enqueueMutation, getMutations, cacheGet, cacheSet } from '../lib/offline';
import { connectRealtime, broadcastFloorUpdate, broadcastReadyNotification, disconnectRealtime } from '../lib/realtime';
import { sessionLogin, sessionKeepalive, sessionLogout, startKeepalive } from '../lib/session';
import { escposOpenDrawer, printESCPOS, isPrinterConnected } from '../lib/thermal-printer';
import { buildTicketHtml, printTicketHtml } from '../lib/ticket-template';
import { ALLERGENS } from '../components/constants';
import { playKitchenAlert, showKitchenNotification, requestNotificationPermission, playBeep } from '../lib/sound';

declare const API_KEY: string;

declare global {
  interface Window {
    __tpvToastTimer: number;
    __employeeRole?: string;
    __employeeId?: string;
    __keepaliveCleanup: (() => void) | undefined;
    __TPV_API_KEY?: string;
  }
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b: any) => b.toString(16).padStart(2, '0')).join('');
}

type View = 'salon' | 'comandas' | 'cocina' | 'inventario' | 'almacen' | 'albaranes' | 'informes' | 'empleados' | 'ofertas' | 'combos' | 'menus' | 'carrusel' | 'precios' | 'reparto' | 'pedidos' | 'fiados' | 'gestoria' | 'pairing' | 'audit' | 'turnos' | 'registro-horario' | 'solicitudes' | 'pedidos-compra' | 'reservas' | 'waitlist' | 'onlineorders' | 'buffet' | 'tickets' | 'pagos' | 'kds' | 'barra' | 'carta' | 'produccion' | 'login';

interface AnyRecord { [key: string]: any }

import MenuPrincipal        from '../components/MenuPrincipal';
import LoginScreen          from '../components/LoginScreen';
import SalonView            from '../components/SalonView';
import ComandaDrawer        from '../components/ComandaDrawer';
import PaymentModal         from '../components/PaymentModal';
import ModifierSelector     from '../components/ModifierSelector';
import CommandPalette       from '../components/CommandPalette';

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

  // Sesion
  const [currentUser, setCurrentUser]     = useState<any>(null as any);
  const [loginSelected, setLoginSelected] = useState<any>(null as any);
  const [pinInput, setPinInput]           = useState<string>('');
  const [menuMode, setMenuMode]           = useState<string>('menu');
  const [entryPoint, setEntryPoint]       = useState<string>('entrada');

  // Clock-in TPV
  const [showClockinModal, setShowClockinModal] = useState<boolean>(false);
  const [clockinSummary, setClockinSummary] = useState<any>(null as any);
  const [clockinLoading, setClockinLoading] = useState<boolean>(false);

  // Navegacion
  const [view, setView]                         = useState<View>('salon');
  const [almacenUbicacion, setAlmacenUbicacion] = useState<any>(null as any);

  // Comanda / pago
  const [selectedTableId, setSelectedTableId] = useState<any>(null as any);
  const [activeTicketId, setActiveTicketId] = useState<any>(null as any);
  const [activeCategory, setActiveCategory]   = useState<string>('Todos');
  const [paying, setPaying]                   = useState<boolean>(false);
  const [paymentSplits, setPaymentSplits]     = useState<any[]>([] as any[]);
  const [orderDiscount, setOrderDiscount]     = useState<number>(0);
  const [tipAmount, setTipAmount]             = useState<number>(0);
  const [tipMethod, setTipMethod]             = useState<string>('efectivo');
  const [paymentIntentId, setPaymentIntentId]   = useState<string>('');
  const [invoiceNif, setInvoiceNif]           = useState<string>('');
  const [invoiceName, setInvoiceName]         = useState<string>('');
  const [invoiceAddress, setInvoiceAddress]   = useState<string>('');
  const [invoiceEmail, setInvoiceEmail]       = useState<string>('');

  // Editor de plano
  const [showFloorEditor, setShowFloorEditor] = useState<boolean>(false);

  // UI auxiliar
  const [toast, setToast]                     = useState<string | null>(null as string | null);
  const [newProductOpen, setNewProductOpen]   = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<any>(null as any);

  // Offline
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' && !navigator.onLine);
  const [pendingMutations, setPendingMutations] = useState<number>(0);

  // QR calls
  const [qrCalls, setQrCalls] = useState<any[]>([] as any[]);

  // Modificadores
  const [modifierData, setModifierData] = useState<any>({ groups: [], productModifiers: {} });
  const [showModifierSelector, setShowModifierSelector] = useState<any>(null as any);
  const [editingItemModifiers, setEditingItemModifiers] = useState<any>(null as any); // { item, product, groups }

  // Configuración ticket
  const [ticketSettings, setTicketSettings] = useState<Record<string, any>>({
    restaurantName: 'LA COMANDA', companyCif: '78406450W', companyAddress: '', companyPhone: '', logoUrl: '', footerText: 'Gracias por su visita', ticketWidth: '80mm',
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Ofertas
  const [offers, setOffers] = useState<any[]>([] as any[]);
  // Combos
  const [combos, setCombos] = useState<any[]>([] as any[]);

  // Impresora

  // Detectar nuevos items en cocina para sonido + notificación
  const prevPendingRef = useRef<number>(0);

  const floorHashRef = useRef<string>('');
  const salesHashRef = useRef<string>('');
  useEffect(() => {
    requestNotificationPermission();
    const ch = connectRealtime(tenantId);
    if (ch) {
      ch.on('broadcast', { event: 'floor:updated' }, ({ payload }) => {
        setFloor(payload.floor);
        setLastFloor(payload.floor);
      });
      ch.on('broadcast', { event: 'ready:notification' }, ({ payload }) => {
        const items = payload.itemNames.slice(0, 3).join(', ');
        const suffix = payload.itemNames.length > 3 ? ` y ${payload.itemNames.length - 3} más` : '';
        showToast(`🍽️ ${payload.tableName}: ${items}${suffix}`);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🍽️ Plato listo', { body: `${payload.tableName}: ${items}${suffix}` });
        }
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
  }, [tenantId]);

  useEffect(() => {
    if (!floor) return;
    const pending = (Object.values(floor.orders || {}) as any[]).reduce((sum: any, o: any) =>
      sum + o.items.filter((i: any) => i.sent && !i.ready).length, 0
    );
    if (pending > prevPendingRef.current && prevPendingRef.current > 0) {
      playKitchenAlert();
      showKitchenNotification(pending - prevPendingRef.current);
    }
    prevPendingRef.current = pending;
  }, [floor]);

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
      await runMigrate();

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
        flr.tables.forEach((t: any) => {
          if (!t.orderIds && t.orderId) t.orderIds = [t.orderId];
          if (!t.orderIds) t.orderIds = [];
        });

        // Migrate to 3-column layout (mesas izq, barras centro, domicilio der)
        if (flr.tables.filter((t: any) => t.type === 'barra').length < 6) {
          const mesas = flr.tables.filter((t: any) => t.type === 'mesa');
          const barras = flr.tables.filter((t: any) => t.type === 'barra');
          const others = flr.tables.filter((t: any) => t.type !== 'mesa' && t.type !== 'barra' && t.type !== 'llevar' && t.type !== 'domicilio');

          // Reposition existing mesas
          mesas.forEach((t: any, i: any) => {
            t.x = 60 + (i % 4) * 140;
            t.y = 60 + Math.floor(i / 4) * 140;
          });
          for (let i = mesas.length; i < 9; i++) {
            mesas.push({
              id: `t${i + 1}`, name: `Mesa ${i + 1}`, status: 'libre', orderId: null, orderIds: [],
              reserved: null, isFiado: false, type: 'mesa',
              x: 60 + (i % 4) * 140, y: 60 + Math.floor(i / 4) * 140,
              width: 80, height: 80, radius: 40, shape: 'rect', rotation: 0,
              seats: 4, zone: 'z1', layer: 0, color: '',
            });
          }

          // Reposition existing barras
          barras.forEach((t: any, i: any) => {
            t.x = 600; t.y = 60 + i * 80; t.width = 140; t.height = 50; t.radius = 25;
          });
          // Add missing barras up to 6
          for (let i = barras.length; i < 6; i++) {
            barras.push({
              id: `t${10 + i}`, name: `Barra ${i + 1}`, status: 'libre', orderId: null, orderIds: [],
              reserved: null, isFiado: false, type: 'barra',
              x: 600, y: 60 + i * 80, width: 140, height: 50, radius: 25,
              shape: 'rect', rotation: 0, seats: 4, zone: 'z3', layer: 0, color: '',
            });
          }

          // Replace delivery items with new layout
          const newDelivery = [
            { id: 't16', name: 'Para llevar', type: 'llevar', x: 810, y: 60 },
            { id: 't17', name: 'Domicilio', type: 'domicilio', x: 810, y: 140 },
            { id: 't18', name: 'Domicilio 2', type: 'domicilio', x: 810, y: 220 },
            { id: 't19', name: 'Domicilio 3', type: 'domicilio', x: 810, y: 300 },
          ].map((d: any) => ({
            ...d, status: 'libre', orderId: null, orderIds: [], reserved: null, isFiado: false,
            width: 90, height: 50, radius: 25, shape: 'rect', rotation: 0, seats: 0,
            zone: '', layer: 0, color: '',
          }));

          flr.tables = [...mesas, ...barras, ...newDelivery, ...others];
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
      const storedUserId = localStorage.getItem('tpv:current_user');
      if (storedUserId && !currentUser) {
        const emp = (emps || employees).find((e: any) => e.id === storedUserId);
        if (emp) {
          try {
            const data: any = await sessionKeepalive(emp.id);
            if (data.ok) {
              setCurrentUser(emp);
              try { window.__employeeRole = emp.role; window.__employeeId = emp.id; } catch {}
              window.__keepaliveCleanup = startKeepalive(emp.id, () => {
                showToast('Sesión cerrada en otro terminal');
                logout();
              });
              setMenuMode('app');
              setView('salon');
            } else {
              localStorage.removeItem('tpv:current_user');
            }
          } catch {
            localStorage.removeItem('tpv:current_user');
          }
        } else {
          localStorage.removeItem('tpv:current_user');
        }
      }

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

  // ---------- Persistencia → Neon ----------
  async function persistCatalog(next: any) {
    setCatalog(next);
    try { await saveCatalog(next); }
    catch {
      enqueueMutation('/api/catalog', JSON.stringify(next));
      showToast('Sin conexión — el catálogo se guardará cuando vuelva la red');
    }
  }
  async function persistFloor(next: any) {
    setFloor(next);
    if (trainingMode) return;
    try { await saveFloor(next); broadcastFloorUpdate(next, tenantId); }
    catch {
      enqueueMutation('/api/floor', JSON.stringify(next));
      showToast('Sin conexión — la sala se guardará cuando vuelva la red');
    }
  }
  const salesQueue = useRef<any[]>([]);
  const salesProcessing = useRef<boolean>(false);

  async function processSalesQueue() {
    if (salesProcessing.current || salesQueue.current.length === 0) return;
    salesProcessing.current = true;
    while (salesQueue.current.length > 0) {
      const sale = salesQueue.current[0];
      let ok = false;
      let lastErr = '';
      let ticketNumber = null;
      try {
        const res: any = await addSale(sale);
        ok = res && res.ok;
        if (res && res.ticketNumber) ticketNumber = res.ticketNumber;
        if (!ok) lastErr = 'respuesta vacía';
      } catch (e) {
        lastErr = e && (e as Error).message ? (e as Error).message : String(e);
        console.warn('addSale error:', lastErr);
      }
      if (ok) {
        if (ticketNumber) {
          setSales(prev => prev.map((s: any) => s.id === sale.id ? { ...s, ticketNumber } : s));
          cacheSet('sales', null);  // invalidate cache so next poll gets fresh data
        }
        salesQueue.current.shift();
      } else {
        showToast(`Error venta: ${lastErr}. Reintentando...`);
        await new Promise(r => setTimeout(r, 2000));
        try {
          const res: any = await addSale(sale);
          if (res && res.ok) {
            salesQueue.current.shift();
          } else {
            showToast(`Error venta: ${lastErr}. No se pudo guardar`);
            salesQueue.current.shift();
          }
        } catch (e2) {
          showToast(`Error venta: ${e2 && (e2 as Error).message ? (e2 as Error).message : String(e2)}. No se pudo guardar`);
          salesQueue.current.shift();
        }
      }
    }
    salesProcessing.current = false;
  }

  async function persistSales(next: any) {
    setSales(next);
    cacheSet('sales', next);
    const newSale = next[next.length - 1];
    salesQueue.current.push(newSale);
    processSalesQueue();
  }
  async function persistEmployees(next: any) {
    setEmployees(next);
    try { await saveEmployees(next); }
    catch {
      enqueueMutation('/api/employees', JSON.stringify(next));
      showToast('Sin conexión — el equipo se guardará cuando vuelva la red');
    }
  }

  // ---------- Stock bajo ----------
  const lowStockProducts = useMemo(
    () => (catalog ? catalog.products.filter((p: any) => p.stock <= p.lowStock) : []),
    [catalog]
  );

  // ---------- Comandas pendientes (barra / cocina) ----------
  const pendingBarCount = useMemo(() =>
    floor ? (Object.values(floor.orders) as any[]).reduce((s: any, o: any) =>
      s + o.items.filter((i: any) => i.sent && !i.ready && i.ubicacion === 'Bar').length, 0) : 0,
  [floor]);

  const pendingCocinaCount = useMemo(() =>
    floor ? (Object.values(floor.orders) as any[]).reduce((s: any, o: any) =>
      s + o.items.filter((i: any) => i.sent && !i.ready && i.ubicacion !== 'Bar').length, 0) : 0,
  [floor]);

  // Parpadeo de pestaña cuando hay pendientes
  const pendingTotal = pendingBarCount + pendingCocinaCount;
  useEffect(() => {
    if (pendingTotal > 0) {
      document.title = `(${pendingTotal}) LA COMANDA`;
    } else {
      document.title = 'LA COMANDA';
    }
  }, [pendingTotal]);

  // ---------- Login ----------
  async function pressDigit(d: string) {
    if (pinInput.length >= 4) return;
    const next = pinInput + d;
    setPinInput(next);
    if (next.length === 4) {
      setPinInput('');
      try {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', pin: next, pinHash: await sha256(next) }),
        });
        if (!res.ok) { showToast('PIN incorrecto'); return; }
        const emp = await res.json();
        if (!emp || !emp.id) { showToast('PIN incorrecto'); return; }

        // Check session for non-admin users
        if (emp.role !== 'admin') {
          const sessionRes: any = await sessionLogin(emp.id, emp.role);
          if (sessionRes.conflict) {
            const forceLogin = window.confirm(`${emp.name} ya está conectado en otro terminal. ¿Cerrar esa sesión y continuar aquí?`);
            if (!forceLogin) { setPinInput(''); return; }
            await sessionLogin(emp.id, emp.role, true);
          }
        } else {
          // Admins can login everywhere, just register the session
          sessionLogin(emp.id, emp.role).catch(() => {});
        }

        // Clean up previous keepalive
        if (window.__keepaliveCleanup) window.__keepaliveCleanup();

        setCurrentUser(emp);
        try { localStorage.setItem('tpv:current_user', emp.id); window.__employeeRole = emp.role; window.__employeeId = emp.id; } catch {}
        setLoginSelected(null);
        setPinInput('');

        // Start keepalive
        window.__keepaliveCleanup = startKeepalive(emp.id, () => {
          showToast('Sesión cerrada en otro terminal');
          logout();
        });

        // Turno de entrada
        saveTurn({ employeeId: emp.id, employeeName: emp.name, action: 'entrada', turnDate: new Date().toISOString().slice(0, 10) }).catch(() => {});

        // Determinar la vista destino según el punto de entrada
        let targetView: View = 'salon';
        if (entryPoint === 'almacen') {
          if (emp.role !== 'admin') { showToast('Solo administradores pueden acceder al almacen'); setCurrentUser(null); return; }
          targetView = 'almacen'; setAlmacenUbicacion(null);
        } else if (entryPoint === 'caja') {
          if (emp.role !== 'admin') { showToast('Solo administradores pueden acceder a la caja'); setCurrentUser(null); return; }
          targetView = 'informes';
        } else if (entryPoint === 'config') {
          if (emp.role !== 'admin') { showToast('Solo administradores pueden acceder a configuracion'); setCurrentUser(null); return; }
          targetView = 'empleados';
        }
        setView(targetView);
        setMenuMode('app');

        // Registrar la entrada en la BD (fire-and-forget, no bloquea la UI)
        logAccess({
          employeeId:   emp.id,
          employeeName: emp.name,
          role:         emp.role,
          entryPoint,
        }).catch(err => console.warn('No se pudo registrar la entrada:', err));

      } catch {
        showToast('Error de conexión');
      }
    }
  }
  function deleteDigit() { setPinInput(p => p.slice(0, -1)); }
  function logout() {
    if (currentUser) {
      saveTurn({ employeeId: currentUser.id, employeeName: currentUser.name, action: 'salida', turnDate: new Date().toISOString().slice(0, 10) }).catch(() => {});
      sessionLogout(currentUser.id).catch(() => {});
    }
    if (window.__keepaliveCleanup) window.__keepaliveCleanup();
    setCurrentUser(null); try { localStorage.removeItem('tpv:current_user'); window.__employeeRole = ''; window.__employeeId = ''; } catch {} setLoginSelected(null); setPinInput('');
    setSelectedTableId(null); setView('salon'); setMenuMode('menu');
  }

  // ---------- Mesa seleccionada ----------
  const selectedTable = floor ? floor.tables.find((t: any) => t.id === selectedTableId) : null;
  const activeOrderId = activeTicketId || selectedTable?.orderIds?.[0] || selectedTable?.orderId;
  const selectedOrder = activeOrderId ? floor?.orders?.[activeOrderId] : null;

  // Crear orden de deuda si la mesa esta en fiado sin orden activa
  const debtFloorRef = useRef<any>(null as any);
  useEffect(() => {
    if (!selectedTable?.isFiado || selectedTable?.orderId || !currentUser) return;
    const lastFiadoSale = [...sales]
      .filter((s: any) => s.tableId === selectedTableId && s.isFiado)
      .sort((a: any, b: any) => b.closedAt - a.closedAt)[0];
    if (!lastFiadoSale) return;
    const nextFloor = clone(floor);
    const table = nextFloor.tables.find((t: any) => t.id === selectedTableId);
    const debtOrderId = 'debt_' + Date.now();
    nextFloor.orders[debtOrderId] = {
      id: debtOrderId, tableId: selectedTableId,
      items: [{ id: 'debt_item', productId: null, name: 'Deuda fiada', price: lastFiadoSale.totalWithTip, qty: 1, sent: true, ready: true, sentAt: null, notes: '' }],
      createdAt: Date.now(), employeeName: 'Deuda anterior',
    };
    table.orderId = debtOrderId;
    debtFloorRef.current = nextFloor;
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

  const orderTotal = selectedOrder ? selectedOrder.items.reduce((s: any, i: any) => {
    if (i.voided) return s;
    const p = catalog?.products?.find((pr: any) => pr.id === i.productId);
    const disc = p?.discount || 0;
    const effectivePrice = i.overridePrice != null ? i.overridePrice : i.price;
    const lineDisc = i.lineDiscount || 0;
    const lineTotal = effectivePrice * (1 - (lineDisc > 0 ? lineDisc : disc) / 100) * i.qty;
    return s + (i.isCourtesy ? 0 : lineTotal);
  }, 0) : 0;
  const discountedTotal = round2(orderTotal * (1 - orderDiscount / 100));
  const finalTotal      = round2(discountedTotal + tipAmount);
  const splitsUsed      = round2(paymentSplits.reduce((s: any, p: any) => s + (Number(p.amount) || 0), 0));
  const remaining       = round2(finalTotal - splitsUsed);
  const canConfirm      = paymentSplits.length > 0 && Math.abs(remaining) < 0.005;

  // ---------- Acciones de comanda ----------
  function changeQty(itemId: string, delta: number) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    const item = order.items.find((i: any) => i.id === itemId);
    if (!item || item.sent) return;
    item.qty += delta;
    if (item.qty <= 0) order.items = order.items.filter((i: any) => i.id !== itemId);
    persistFloor(next);
  }

  function updateItemNotes(itemId: string, notes: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    const item = order.items.find((i: any) => i.id === itemId);
    if (item) item.notes = notes;
    persistFloor(next);
  }

  function sendToKitchenCourse(course?: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    let count = 0;
    order.items.forEach((i: any) => {
      if (!i.sent && (!course || i.course === course)) { i.sent = true; i.sentAt = Date.now(); count++; }
    });
    persistFloor(next);
    if (count) showToast(`${course || 'Todo'} enviado a cocina (${count} ${count === 1 ? 'linea' : 'lineas'})`);
  }

  function sendItemToKitchen(itemId: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    const item = order.items.find((i: any) => i.id === itemId);
    if (item && !item.sent) { item.sent = true; item.sentAt = Date.now(); persistFloor(next); showToast(`${item.name} enviado a cocina`); }
  }

  function updateItemCourse(itemId: string, course?: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    const item = order.items.find((i: any) => i.id === itemId);
    if (item) item.course = course;
    persistFloor(next);
  }

  function editItemModifiers(item: any, product: any) {
    const groups = getModifierGroupsForProduct(product.id);
    if (groups.length === 0) return;
    setEditingItemModifiers({ item, product, groups });
    setShowModifierSelector({ product, groups });
  }

  function toggleCuenta() {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    table.status = table.status === 'cuenta' ? 'ocupada' : 'cuenta';
    persistFloor(next);
  }

  function markReady(orderId: string, ubicacion?: string) {
    const next = clone(floor);
    const order = next.orders[orderId];
    let readyItems = order.items.filter((i: any) => i.sent && !i.ready);
    if (ubicacion) readyItems = readyItems.filter((i: any) => (i.ubicacion || 'Cocina') === ubicacion);
    if (readyItems.length === 0) return;
    readyItems.forEach((i: any) => i.ready = true);
    persistFloor(next);
    const table = next.tables.find((t: any) => t.id === order.tableId);
    const names: string[] = [...new Set(readyItems.map((i: any) => i.name))] as string[];
    broadcastReadyNotification(table?.name || order.tableId, names, order.employeeName, tenantId);
  }

  // ----- KDS (Kitchen Display System) -----
  function updateItemState(nextFloor: any, action?: any) {
    setFloor(nextFloor);
    persistFloor(nextFloor);
    if (action?.previousState === 'ready') {
      const order = floor.orders?.[action.orderId];
      const item = order?.items?.find((i: any) => i.id === action.itemId);
      const table = floor.tables?.find((t: any) => t.id === order?.tableId);
      logKDSAuditFn('undo_ready', { tableName: table?.name, itemName: item?.name, orderId: action.orderId, itemId: action.itemId });
    }
  }

  function advanceOrder(nextFloor: any, action?: any) {
    setFloor(nextFloor);
    persistFloor(nextFloor);
    if (!action) return;
    const order = floor.orders?.[action.orderId];
    const table = floor.tables?.find((t: any) => t.id === order?.tableId);
    const isUndo = action.previousState === 'ready' || action.previousState === 'preparing';
    logKDSAuditFn(isUndo ? 'order_undo' : 'order_bump', { tableName: table?.name, orderId: action.orderId, previousState: action.previousState, itemCount: order?.items?.filter((i: any) => i.sent && !i.served).length });
  }

  async function agotarProducto(productId: string, agotado: boolean) {
    const next = clone(catalog);
    const p = next.products.find((x: any) => x.id === productId);
    if (p) p.agotado = agotado;
    setCatalog(next);
    try { await saveCatalog(next); } catch { enqueueMutation('/api/catalog', JSON.stringify(next)); showToast('Sin conexión — el stock se actualizará cuando vuelva la red'); }
    logKDSAuditFn('item_86', { productName: p?.name, productId, agotado });
  }

  async function logKDSAuditFn(action: string, details: any) {
    try {
      const { logKDSAudit } = await import('../lib/api');
      await logKDSAudit(action, details);
    } catch {}
  }

  async function reprintKitchenTicket(orderId: string) {
    const order = floor.orders?.[orderId];
    if (!order?.items?.length) { showToast('No hay items para reimprimir'); return; }
    const table = floor.tables?.find((t: any) => t.id === order.tableId);
    try {
      const { printESCPOS } = await import('../lib/thermal-printer');
      const lines = [];
      lines.push('--- REIMPRESIÓN ---');
      lines.push(`Mesa: ${table?.name || order.tableId}`);
      const courses = [...new Set(order.items.filter((i: any) => i.sent).map((i: any) => i.course).filter(Boolean))];
      for (const course of courses) {
        lines.push(`--- ${course} ---`);
        order.items.filter((i: any) => i.sent && i.course === course).forEach((i: any) => lines.push(`${i.qty}x ${i.name}${i.notes ? ` (${i.notes})` : ''}`));
      }
      const noCourse = order.items.filter((i: any) => i.sent && !i.course);
      if (noCourse.length) noCourse.forEach((i: any) => lines.push(`${i.qty}x ${i.name}${i.notes ? ` (${i.notes})` : ''}`));
      lines.push('────────────────');
      lines.push(new Date().toLocaleString('es-ES'));
      await printESCPOS(lines.join('\n') as any);
      showToast('Comanda reimpresa');
    } catch (e) { showToast('Error al reimprimir: ' + (e as Error).message); }
  }

  // Elimina una línea del ticket (incluidas las ya enviadas a cocina)
  function removeItem(itemId: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    if (!order) return;
    order.items = order.items.filter((i: any) => i.id !== itemId);
    if (order.items.length === 0 && (table.orderIds?.length || 0) <= 1) {
      delete next.orders[activeOid];
      table.orderIds = (table.orderIds || []).filter((id: any) => id !== activeOid);
      table.orderId = table.orderIds?.[0] || null;
      if (!table.orderId) table.status = 'libre';
    }
    persistFloor(next);
  }

  // Descuento por línea y cortesía
  function setItemDiscount(itemId: string, pct: number) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find((i: any) => i.id === itemId);
    if (item) { item.lineDiscount = pct; item.isCourtesy = false; }
    persistFloor(next);
  }

  function removeItemDiscount(itemId: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find((i: any) => i.id === itemId);
    if (item) item.lineDiscount = 0;
    persistFloor(next);
  }

  function setItemCourtesy(itemId: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find((i: any) => i.id === itemId);
    if (item) { item.isCourtesy = true; item.lineDiscount = 0; }
    persistFloor(next);
  }

  function removeItemCourtesy(itemId: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find((i: any) => i.id === itemId);
    if (item) item.isCourtesy = false;
    persistFloor(next);
  }

  function setItemPrice(itemId: string, newPrice: number) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find((i: any) => i.id === itemId);
    if (item) { item.overridePrice = Math.max(0, newPrice); }
    persistFloor(next);
  }

  // Anular artículo enviado con motivo
  function voidSentItem(itemId: string, reason: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find((i: any) => i.id === itemId);
    if (item) {
      item.voided = true;
      item.voidReason = reason;
      item.voidedBy = currentUser?.name;
      item.voidedAt = Date.now();
    }
    persistFloor(next);
  }

  // ---------- Descuento personal ----------
  // Calcula el descuento total que recibiría un pedido según las tasas por categoría
  function calcPersonalDiscountAmount(order: any, rates: Record<string, number>) {
    let totalDiscount = 0;
    for (const item of order.items) {
      if (item.voided) continue;
      const p = catalog?.products?.find((pr: any) => pr.id === item.productId);
      if (!p) continue;
      const rate = rates[p.category] || 0;
      if (rate <= 0) continue;
      const effectivePrice = item.overridePrice != null ? item.overridePrice : item.price;
      const full = effectivePrice * item.qty;
      totalDiscount += full * rate / 100;
    }
    return round2(totalDiscount);
  }

  async function applyPersonalDiscount(orderId: string, employeePin: string): Promise<boolean> {
    const r = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tpv-key': API_KEY },
      body: JSON.stringify({ action: 'verify', pin: employeePin, pinHash: await sha256(employeePin) }),
    });
    if (!r.ok) { showToast('PIN incorrecto'); return false; }
    const emp = await r.json();
    if (!emp.personalDiscountEnabled) { showToast(`${emp.name} no tiene activado el descuento de personal`); return false; }

    const next = clone(floor);
    const order = next.orders[orderId];
    if (!order) return false;

    const ratesRaw = ticketSettings.personalDiscountRates;
    let rates: Record<string, number> = {};
    try { rates = typeof ratesRaw === 'string' ? JSON.parse(ratesRaw) : ratesRaw || {}; }
    catch { rates = {}; }

    // Calcular descuento total
    const discountAmount = calcPersonalDiscountAmount(order, rates);
    if (discountAmount <= 0) { showToast('Ningún artículo recibe descuento según las tasas configuradas'); return false; }

    // Verificar límite mensual del empleado
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const used = emp.monthlyUsedMonth === currentMonth ? (emp.monthlyUsed || 0) : 0;
    const remaining = emp.monthlyLimit - used;
    if (discountAmount > remaining) {
      showToast(`${emp.name} no tiene suficiente saldo: necesita ${euros(discountAmount)} pero le queda ${euros(remaining)}`);
      return false;
    }

    // Aplicar descuento a cada línea según su categoría
    for (const item of order.items) {
      if (item.voided) continue;
      const p = catalog?.products?.find((pr: any) => pr.id === item.productId);
      if (!p) continue;
      const rate = rates[p.category] || 0;
      if (rate <= 0) { item.lineDiscount = 0; continue; }
      item.lineDiscount = rate;
      item.isCourtesy = false;
    }

    // Marcar la orden con descuento personal
    order.personalDiscountEmployeeId = emp.id;
    order.personalDiscountEmployeeName = emp.name;
    order.personalDiscountApplied = true;

    // Actualizar el contador del empleado
    const empNext = employees.map((e: any) => {
      if (e.id === emp.id) {
        return {
          ...e,
          monthlyUsedMonth: currentMonth,
          monthlyUsed: (used + discountAmount),
        };
      }
      return e;
    });
    persistFloor(next);
    persistEmployees(empNext);
    showToast(`Descuento personal aplicado — ${emp.name} (${euros(discountAmount)})`);
    return true;
  }

  function removePersonalDiscount(orderId: string) {
    const next = clone(floor);
    const order = next.orders[orderId];
    if (!order || !order.personalDiscountApplied) return;

    const empId = order.personalDiscountEmployeeId;
    const ratesRaw = ticketSettings.personalDiscountRates;
    let rates: Record<string, number> = {};
    try { rates = typeof ratesRaw === 'string' ? JSON.parse(ratesRaw) : ratesRaw || {}; }
    catch { rates = {}; }

    // Devolver el descuento al empleado
    const discountAmount = calcPersonalDiscountAmount(order, rates);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const empNext = employees.map((e: any) => {
      if (e.id === empId) {
        const used = e.monthlyUsedMonth === currentMonth ? (e.monthlyUsed || 0) : 0;
        return {
          ...e,
          monthlyUsedMonth: currentMonth,
          monthlyUsed: Math.max(0, used - discountAmount),
        };
      }
      return e;
    });

    // Quitar descuento de línea de cada artículo que lo tenga por categoría
    for (const item of order.items) {
      const p = catalog?.products?.find((pr: any) => pr.id === item.productId);
      if (!p) continue;
      const rate = rates[p.category] || 0;
      if (rate > 0 && item.lineDiscount === rate) {
        item.lineDiscount = 0;
      }
    }

    delete order.personalDiscountApplied;
    delete order.personalDiscountEmployeeId;
    delete order.personalDiscountEmployeeName;

    persistFloor(next);
    persistEmployees(empNext);
    showToast('Descuento personal retirado');
  }

  // Cancela toda la mesa: elimina la orden y la deja libre
  function cancelTable(): void {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    if (table.orderId) {
      const order = next.orders[table.orderId];
      saveCancelledOrder({
        tableId: table.id,
        tableName: table.name,
        orderId: table.orderId,
        items: order.items,
        total: order.items.reduce((s: any, i: any) => s + i.price * i.qty, 0),
        employeeName: currentUser?.name,
        cancelledAt: Date.now(),
      }).catch(() => {});
      delete next.orders[table.orderId];
    }
    table.status  = 'libre';
    table.isFiado = false;
    table.orderId = null;
    table.orderIds = [];
    persistFloor(next);
    setSelectedTableId(null);
    showToast(`${table.name} cancelada y liberada`);
  }

  // Mover pedido a otra mesa
  function moveTable(tableId: string, destTableId: string) {
    if (tableId === destTableId) { showToast('No puedes mover una mesa sobre sí misma'); return; }
    const next = clone(floor);
    const src = next.tables.find((t: any) => t.id === tableId);
    const dst = next.tables.find((t: any) => t.id === destTableId);
    if (!src || !dst || !src.orderId) { showToast('La mesa origen no tiene pedido'); return; }
    if (!next.orders[src.orderId]) { showToast('Pedido no encontrado'); return; }
    if (dst.orderId) {
      // Merge: move all items from src to dst
      const srcOrder = next.orders[src.orderId];
      const dstOrder = next.orders[dst.orderId];
      dstOrder.items = [...dstOrder.items, ...srcOrder.items];
      delete next.orders[src.orderId];
    } else {
      next.orders[src.orderId].tableId = destTableId;
      dst.orderId = src.orderId;
    }
    src.orderId = null;
    src.status = 'libre';
    src.mergedTableIds = null;
    dst.status = dst.orderId ? 'unidas' : 'ocupada';
    persistFloor(next);
    setSelectedTableId(destTableId);
    showToast(`Pedido movido a ${dst.name}`);
  }

  // Unir (fusionar) pedidos de varias mesas en el ticket actual
  function mergeTables(tableId: string, sourceTableIds: string[]) {
    const next = clone(floor);
    const dst = next.tables.find((t: any) => t.id === tableId);
    if (!dst) return;
    let dstOrder = dst.orderId ? next.orders[dst.orderId] : null;
    if (!dstOrder) {
      const newOrderId = 'ord_' + Date.now();
      dstOrder = { id: newOrderId, tableId, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '' };
      next.orders[newOrderId] = dstOrder;
      dst.orderId = newOrderId;
    }
    dst.status = 'unidas';
    dst.mergedTableIds = sourceTableIds.filter((id: any) => id !== tableId);

    for (const srcId of sourceTableIds) {
      if (srcId === tableId) continue;
      const src = next.tables.find((t: any) => t.id === srcId);
      if (!src || !src.orderId) continue;
      const srcOrder = next.orders[src.orderId];
      if (!srcOrder) continue;
      dstOrder.items = [...dstOrder.items, ...srcOrder.items];
      delete next.orders[src.orderId];
      src.orderId = null;
      src.status = 'libre';
    }

    // Mark as merged if multiple tables
    const mergedNames = sourceTableIds
      .filter((id: any) => id !== tableId)
      .map((id: any) => next.tables.find((t: any) => t.id === id)?.name || id)
      .filter(Boolean);
    if (mergedNames.length > 0) {
      dstOrder._mergedFrom = [tableId, ...sourceTableIds.filter((id: any) => id !== tableId)];
      dstOrder._mergedLabel = `Unidas: ${dst.name} + ${mergedNames.join(' + ')}`;
    }

    persistFloor(next);
    showToast(`Pedidos fusionados en ${dst.name}`);
  }

  // ---------- Multi-ticket ----------
  function createNewTicket(tableId: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === tableId);
    if (!table) return;
    const orderId = 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const ticketNum = (table.orderIds?.length || 0) + 1;
    next.orders[orderId] = {
      id: orderId, tableId, items: [], createdAt: Date.now(),
      employeeName: currentUser?.name || '', label: `#${ticketNum}`,
    };
    if (!table.orderIds) table.orderIds = [];
    table.orderIds.push(orderId);
    table.orderId = orderId;
    if (table.status === 'libre') table.status = 'ocupada';
    persistFloor(next);
    setActiveTicketId(orderId);
    showToast(`Nuevo ticket #${ticketNum} creado`);
  }

  function switchTicket(tableId: string, orderId: string) {
    setActiveTicketId(orderId);
  }

  function deleteEmptyTicket(tableId: string, orderId: string) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === tableId);
    const order = next.orders[orderId];
    if (!table || !order || order.items.length > 0) return;
    delete next.orders[orderId];
    table.orderIds = (table.orderIds || []).filter((id: any) => id !== orderId);
    if (table.orderIds.length === 0) {
      table.orderId = null;
      if (!table.reserved) table.status = 'libre';
    } else {
      table.orderId = table.orderIds[0];
    }
    persistFloor(next);
    setActiveTicketId(table.orderId || null);
    showToast('Ticket vacío eliminado');
  }

  function renameTicket(tableId: string, orderId: string, label: string) {
    const next = clone(floor);
    const order = next.orders[orderId];
    if (order) order.label = label;
    persistFloor(next);
  }

  function linkCustomer(orderId: string, customer: any) {
    const next = clone(floor);
    const order = next.orders[orderId];
    if (order) order.customer = customer;
    persistFloor(next);
  }

  function unlinkCustomer(orderId: string) {
    const next = clone(floor);
    const order = next.orders[orderId];
    if (order) order.customer = null;
    persistFloor(next);
  }

  // ---------- Historial de mesa ----------
  function reopenOrder(tableId: string, historyEntry: any) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === tableId);
    if (!table) return;
    const reopenedId = historyEntry.id + '_reopened';
    next.orders[reopenedId] = {
      ...historyEntry,
      id: reopenedId,
      tableId,
      reopenedAt: Date.now(),
      items: historyEntry.items.map((i: any) => ({ ...i, sent: false, ready: false })),
    };
    if (!table.orderIds) table.orderIds = [];
    table.orderIds.push(reopenedId);
    table.orderId = reopenedId;
    table.status = 'ocupada';
    // Remove from history
    if (next.history?.[tableId]) {
      next.history[tableId] = next.history[tableId].filter((h: any) => h.id !== historyEntry.id);
    }
    persistFloor(next);
    setActiveTicketId(reopenedId);
    showToast('Pedido reabierto');
  }

  // ---------- Vaciar / liberar mesa ----------
  function voidTable(reason: string = '') {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    if (!table) return;
    const orderIds = [...(table.orderIds || [])];
    for (const oid of orderIds) {
      const order = next.orders[oid];
      if (order) {
        // Track cancelled items that were sent to kitchen
        const sentItems = order.items.filter((i: any) => i.sent);
        if (sentItems.length > 0) {
          saveCancelledOrder({
            tableId: table.id, tableName: table.name, orderId: oid,
            items: sentItems, total: sentItems.reduce((s: any, i: any) => s + i.price * i.qty, 0),
            employeeName: currentUser?.name, reason: reason || 'vaciar mesa', cancelledAt: Date.now(),
          }).catch(() => {});
        }
        delete next.orders[oid];
      }
    }
    table.orderIds = [];
    table.orderId = null;
    table.status = 'libre';
    table.isFiado = false;
    persistFloor(next);
    setSelectedTableId(null);
    setActiveTicketId(null);
    showToast(`${table.name} liberada`);
  }

  // ---------- Acciones de pago ----------
  function addSplit(method: string) {
    if (method === 'fiado') {
      setPaymentSplits([{ id: 'sp_fiado', method: 'fiado', amount: finalTotal }]);
    } else {
      const used = round2(paymentSplits.reduce((s: any, p: any) => s + (p.method === 'fiado' ? 0 : p.amount), 0));
      const rem  = round2(finalTotal - used);
      if (rem <= 0) return;
      setPaymentSplits(prev => [...prev.filter((p: any) => p.method !== 'fiado'), { id: 'sp_' + Date.now(), method, amount: rem, itemIds: [] }]);
    }
  }
  function updateSplitAmount(id: string, value: string) {
    const amount = value === '' ? 0 : Math.max(0, parseFloat(value));
    setPaymentSplits(prev => prev.map((p: any) => p.id === id ? { ...p, amount: isNaN(amount) ? 0 : amount } : p));
  }
  function removeSplit(id: string) { setPaymentSplits(prev => prev.filter((p: any) => p.id !== id)); }
  function toggleSplitItem(splitId: string, itemId: string) {
    setPaymentSplits(prev => prev.map((p: any) => {
      if (p.id !== splitId) return p;
      const ids = p.itemIds || [];
      const next = ids.includes(itemId) ? ids.filter((id: any) => id !== itemId) : [...ids, itemId];
      const itemAmount = (selectedOrder?.items || [])
        .filter((i: any) => next.includes(i.id))
        .reduce((s: any, i: any) => s + i.price * i.qty, 0);
      return { ...p, itemIds: next, amount: itemAmount > 0 ? itemAmount : p.amount };
    }));
  }

  function closeBill() {
    const nextFloor   = clone(floor);
    const table       = nextFloor.tables.find((t: any) => t.id === selectedTableId);
    const order       = nextFloor.orders[table.orderId];
    const wasDebt     = table.isFiado && order.items.length === 1 && order.items[0].productId === null;

    // Warn if there are items not sent or still pending in kitchen
    const unsentItems = order.items.filter((i: any) => !i.sent && !i.voided);
    const pendingItems = order.items.filter((i: any) => i.sent && !i.ready && !i.voided && !i.served);
    if (unsentItems.length > 0 || pendingItems.length > 0) {
      const parts = [];
      if (unsentItems.length > 0) parts.push(`${unsentItems.length} artículo(s) sin enviar a cocina`);
      if (pendingItems.length > 0) parts.push(`${pendingItems.length} artículo(s) en preparación`);
      if (!window.confirm(`Hay ${parts.join(' y ')}. ¿Seguro que quieres cobrar?`)) return;
    }

    const nextCatalog = clone(catalog);
    order.items.forEach((item: any) => {
      if (item.productId) {
        const p = nextCatalog.products.find((p: any) => p.id === item.productId);
        if (p) {
          // Determinar la ubicación de descuento: si el producto tiene stockByLocation, usar la primera disponible o la de la mesa
          const locs = Object.keys(p.stockByLocation || {});
          const location = locs.length > 0 ? locs[0] : (p.ubicacion || 'Bar');
          const entry = (p.stockByLocation || {})[location] || { stock: p.stock || 0 };
          entry.stock = Math.max(0, (entry.stock || 0) - item.qty);
          if (!p.stockByLocation) p.stockByLocation = {};
          p.stockByLocation[location] = entry;
        }
      }
    });

    // Deduct modifier ingredients
    const modOptMap: Record<string, any> = {};
    for (const g of modifierData.groups) {
      for (const o of g.options || []) {
        modOptMap[o.id] = o;
      }
    }
    order.items.forEach((item: any) => {
      if (item.modifiers) {
        for (const m of item.modifiers) {
          const opt = modOptMap[m.optionId];
          if (opt?.stockDeduct && opt.stockArticleId) {
            const p = nextCatalog.products.find((pr: any) => pr.id === opt.stockArticleId);
            if (p) {
              const locs = Object.keys(p.stockByLocation || {});
              const location = locs.length > 0 ? locs[0] : (p.ubicacion || 'Bar');
              const entry = (p.stockByLocation || {})[location] || { stock: p.stock || 0 };
              entry.stock = Math.max(0, (entry.stock || 0) - (opt.stockQuantity || 0) * item.qty);
              if (!p.stockByLocation) p.stockByLocation = {};
              p.stockByLocation[location] = entry;
            }
          }
        }
      }
    });

    // Stock log (fire-and-forget)
    order.items.forEach((item: any) => {
      if (item.productId) {
        const p = nextCatalog.products.find((pr: any) => pr.id === item.productId);
        if (p) {
          const locs = Object.keys(p.stockByLocation || {});
          const location = locs.length > 0 ? locs[0] : (p.ubicacion || 'Bar');
          const entry = p.stockByLocation?.[location] || { stock: 0 };
          saveStockLog({
            productId: item.productId,
            productName: item.name,
            oldStock: (entry.stock || 0) + item.qty,
            newStock: entry.stock || 0,
            reason: 'venta',
            employeeName: currentUser?.name,
            createdAt: Date.now(),
          }).catch(() => {});
        }
      }
    });

    // Stock log for modifier ingredients
    order.items.forEach((item: any) => {
      if (item.modifiers) {
        for (const m of item.modifiers) {
          const opt = modOptMap[m.optionId];
          if (opt?.stockDeduct && opt.stockArticleId) {
            const p = nextCatalog.products.find((pr: any) => pr.id === opt.stockArticleId);
            if (p) {
              const locs = Object.keys(p.stockByLocation || {});
              const location = locs.length > 0 ? locs[0] : (p.ubicacion || 'Bar');
              const entry = p.stockByLocation?.[location] || { stock: 0 };
              const qty = (opt.stockQuantity || 0) * item.qty;
              saveStockLog({
                productId: opt.stockArticleId,
                productName: p.name,
                oldStock: (entry.stock || 0) + qty,
                newStock: entry.stock || 0,
                reason: 'venta (modificador)',
                employeeName: currentUser?.name,
                createdAt: Date.now(),
              }).catch(() => {});
            }
          }
        }
      }
    });

    // Aplicar descuentos de ofertas activas a los productos que correspondan
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // 1=lunes..7=domingo
    const currentHour = now.getHours();
    let offerDiscountAmount = 0;
    for (const offer of offers) {
      if (!offer.active) continue;
      if (!offer.days.includes(currentDay)) continue;
      if (currentHour < offer.startHour || currentHour >= offer.endHour) continue;
      for (const item of order.items) {
        if (item.productId && offer.productIds.includes(item.productId)) {
          offerDiscountAmount += round2(item.price * item.qty * (offer.discountPct / 100));
        }
      }
    }
    const subtotal        = order.items.reduce((s: any, i: any) => s + i.price * i.qty, 0);
    const discountAmount  = round2(round2(subtotal * (orderDiscount / 100)) + offerDiscountAmount);
    const total           = round2(subtotal - discountAmount);
    const totalWithTip   = round2(total + tipAmount);
    const payments       = paymentSplits.map((s: any) => {
      const p: { method: string; amount: number; confirmed?: boolean } = { method: s.method, amount: round2(s.amount) };
      if (s.method === 'bizum') p.confirmed = false;
      return p;
    });
    const isFiado        = payments.some((p: any) => p.method === 'fiado');
    const hasPendingBizum = payments.some((p: any) => p.method === 'bizum' && p.confirmed === false);
    const methodLabels: Record<string, string> = { efectivo:'Efectivo', tarjeta:'Tarjeta', bizum:'Bizum', fiado:'Fiado' };
    const methodLabel    = payments.map((p: any) => methodLabels[p.method] || p.method).join(' + ');

    const wantInvoice = invoiceNif.trim() && invoiceName.trim();
    const invNum = wantInvoice ? 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5) : '';
    const sale = {
      id: 's_' + Date.now(), tableId: table.id, tableName: table.name,
      items: order.items.map((i: any) => ({ id: i.id, productId: i.productId, name: i.name, qty: i.qty, price: i.price || 0, voided: !!i.voided })),
      subtotal, discount: orderDiscount, discountAmount, total, tip: tipAmount, tipMethod, totalWithTip,
      invoiceNif: wantInvoice ? invoiceNif : '',
      invoiceName: wantInvoice ? invoiceName : '',
      invoiceAddress: wantInvoice ? invoiceAddress : '',
      invoiceEmail: wantInvoice ? invoiceEmail : '',
      invoiceNumber: invNum,
      invoiceCreated: wantInvoice,
      invoiceCreatedAt: wantInvoice ? Date.now() : null,
      paymentIntentId: paymentIntentId,
      payments: isFiado ? [{ method: 'fiado', amount: totalWithTip }] : payments,
      paymentMethod: methodLabel, isFiado, hasPendingBizum, isDebtPayment: wasDebt,
      offerDiscount: offerDiscountAmount,
      employeeId: currentUser?.id || null, employeeName: currentUser?.name || 'Sin asignar',
      closedAt: Date.now(),
      ticketNumber: Date.now(),  // provisional, se asigna en backend
    };

    // Save to history before removing
    const closedOrder = { ...order, closedAt: Date.now() };
    if (!nextFloor.history) nextFloor.history = {};
    if (!nextFloor.history[table.id]) nextFloor.history[table.id] = [];
    nextFloor.history[table.id].push(closedOrder);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    nextFloor.history[table.id] = nextFloor.history[table.id].filter((h: any) => (h.closedAt || h.createdAt) >= todayStart.getTime());

    const closedOid = table.orderId;
    delete nextFloor.orders[closedOid];
    table.orderId = null;
    table.orderIds = (table.orderIds || []).filter((id: any) => id !== closedOid);
    if (table.orderIds.length === 0) {
      table.status = 'libre'; table.isFiado = false;
    } else {
      table.orderId = table.orderIds[0];
      table.status = table.orderIds.length > 1 ? 'unidas' : 'ocupada';
    }

    const tipStr  = tipAmount > 0 ? ` (+${euros(tipAmount)} propina)` : '';
    const discStr = orderDiscount > 0 ? ` (${orderDiscount}% desc)` : '';
    const offerStr = offerDiscountAmount > 0 ? ` (oferta -${euros(offerDiscountAmount)})` : '';
    if (trainingMode) {
    setPaying(false); setPaymentSplits([]); setOrderDiscount(0); setTipAmount(0); setTipMethod('efectivo');
    setPaymentIntentId('');
    setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail('');
    setSelectedTableId(null);
      showToast(`🎓 Formación — Cobrado: ${euros(totalWithTip)}${tipStr}${discStr}${offerStr}`);
      playBeep(880, 0.15); setTimeout(() => playBeep(1100, 0.15), 150);
      return;
    }

    persistFloor(nextFloor);
    persistCatalog(nextCatalog);
    persistSales([...sales, sale]);

    // Auto-registrar en Verifactu (fire-and-forget)
    registerVerifactu(sale.id, sale).then(() => {
      showToast(`✅ Factura electrónica registrada (${sale.invoiceNumber || sale.id})`);
    }).catch(err => {
      console.warn('Verifactu:', err);
      showToast('⚠️ Error al registrar factura electrónica — revisa Gestoría');
    });

    setPaying(false); setPaymentSplits([]); setOrderDiscount(0); setTipAmount(0); setTipMethod('efectivo');
    setPaymentIntentId('');
    setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail('');
    setSelectedTableId(null);

    showToast(
      wasDebt ? `Deuda pagada: ${euros(totalWithTip)}${discStr}${offerStr}${tipStr}`
      : isFiado ? `Fiado: ${euros(totalWithTip)}${discStr}${offerStr}${tipStr}`
      : `Cobrado: ${euros(totalWithTip)}${discStr}${offerStr}${tipStr}`
    );

    playBeep(880, 0.15); setTimeout(() => playBeep(1100, 0.15), 150);

    // Abrir cajón si hay pago en efectivo e impresora conectada
    if (payments.some((p: any) => p.method === 'efectivo') && isPrinterConnected()) {
      printESCPOS(escposOpenDrawer()).catch(() => {});
    }
  }

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
        setShowCommands(false); setShowDrawerPIN(false); setShowDrawerConfirm(false);
        setShowSettings(false); setSelectedTableId(null); setActiveTicketId(null);
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

  function getModifierGroupsForProduct(productId: string) {
    const groupIds = modifierData.productModifiers[productId] || [];
    return modifierData.groups.filter((g: any) => groupIds.includes(g.id));
  }

  function handleAddItemWithModifiers(product: any) {
    const groups = getModifierGroupsForProduct(product.id);
    if (groups.length > 0) {
      setShowModifierSelector({ product, groups });
    } else {
      addItemWithPrice(product, [], 0);
    }
  }

  function confirmModifiersAndAdd(modifiers: any[]) {
    const product = showModifierSelector.product;
    const extraPrice = modifiers.reduce((s: any, m: any) => s + (m.priceDelta || 0), 0);
    setShowModifierSelector(null);

    // If editing an existing item, update it in place
    if (editingItemModifiers) {
      const next = clone(floor);
      const table = next.tables.find((t: any) => t.id === selectedTableId);
      const order = next.orders[table.orderId];
      const item = order.items.find((i: any) => i.id === editingItemModifiers.item.id);
      if (item) {
        item.modifiers = modifiers;
        const basePrice = product.price || catalog?.products?.find((p: any) => p.id === product.id)?.price || 0;
        item.price = round2(basePrice + extraPrice);
      }
      persistFloor(next);
      setEditingItemModifiers(null);
      return;
    }
    addItemWithPrice(product, modifiers, extraPrice);
  }

  function addItemWithPrice(product: any, modifiers: any[], extraPrice: number) {
    const next = clone(floor);
    const table = next.tables.find((t: any) => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    let order = activeOid ? next.orders[activeOid] : null;

    if (!order) {
      const orderId = 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      order = { id: orderId, tableId: table.id, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '-' };
      next.orders[orderId] = order;
      if (!table.orderIds) table.orderIds = [];
      table.orderIds.push(orderId);
      table.orderId = orderId;
      table.status = 'ocupada';
      setActiveTicketId(orderId);
    }
    const basePrice = product.price || catalog?.products?.find((p: any) => p.id === product.id)?.price || 0;
    const effectivePrice = round2(basePrice + extraPrice);
    const existing = order.items.find((i: any) => i.productId === product.id && !i.sent && JSON.stringify(i.modifiers) === JSON.stringify(modifiers));
    if (existing) existing.qty += 1;
    else {
      const notes = '';
      const prod = catalog?.products?.find((p: any) => p.id === product.id);
      order.items.push({
        id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
        productId: product.id, name: product.name, price: effectivePrice,
        qty: 1, sent: false, ready: false, sentAt: null, notes, modifiers,
        course: product.course || '',
        ubicacion: (product.ubicacion || prod?.ubicacion || 'Bar'),
      });
    }
    persistFloor(next);
  }

  // Quitamos la antigua addItem (window.prompt + sin modifiers)
  function addItem(product: any) {
    if (product.isMenu && product.menuData) {
      const menu = product.menuData;
      const sel = product.menuSel;
      const next = clone(floor);
      const table = next.tables.find((t: any) => t.id === selectedTableId);
      let order = table.orderId ? next.orders[table.orderId] : null;
      if (!order) {
        const orderId = 'o_' + Date.now();
        order = { id: orderId, tableId: table.id, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '-' };
        next.orders[orderId] = order;
        table.orderId = orderId;
        table.status = 'ocupada';
      }
      if (sel && sel.length > 0) {
        for (const s of sel) {
          const p = catalog.products.find((pr: any) => pr.id === s.productId);
          if (!p) continue;
          const existing = order.items.find((i: any) => i.productId === p.id && !i.sent && !i.isCombo && !i.isMenuItem);
          if (existing) existing.qty += 1;
          else {
            order.items.push({
              id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
              productId: p.id, name: p.name + ` (${menu.name})`, price: 0,
              qty: 1, sent: false, ready: false, sentAt: null, notes: '', modifiers: [],
              course: p.course || '', isMenuItem: true,
              ubicacion: p.ubicacion || 'Bar',
            });
          }
        }
      }
      order.items.push({
        id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
        productId: null, name: `→ Menú: ${menu.name}`, price: menu.price,
        qty: 1, sent: true, ready: true, sentAt: Date.now(), notes: '', modifiers: [],
        course: '', isMenuPrice: true,
      });
      persistFloor(next);
      return;
    }
    if (product.isCombo && product.comboData) {
      const combo = product.comboData;
      const next = clone(floor);
      const table = next.tables.find((t: any) => t.id === selectedTableId);
      let order = table.orderId ? next.orders[table.orderId] : null;
      if (!order) {
        const orderId = 'o_' + Date.now();
        order = { id: orderId, tableId: table.id, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '-' };
        next.orders[orderId] = order;
        table.orderId = orderId;
        table.status = 'ocupada';
      }

      // New slot-based combo selections
      const sel = product.comboSel;
      if (sel && sel.length > 0) {
        for (const s of sel) {
          const p = catalog.products.find((pr: any) => pr.id === s.productId);
          if (!p) continue;
          const existing = order.items.find((i: any) => i.productId === p.id && !i.sent && !i.isCombo);
          if (existing) existing.qty += 1;
          else {
            order.items.push({
              id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
              productId: p.id, name: p.name + ` (${combo.name})`, price: 0,
              qty: 1, sent: false, ready: false, sentAt: null, notes: '', modifiers: [],
              course: p.course || '', isComboItem: true,
            });
          }
        }
      } else if (combo.slots && combo.slots.length > 0) {
        // combo has slots but no selections were made - this shouldn't happen via UI, but handle gracefully
        // fall through to add just the price line
      } else {
        // Legacy fixed-items combos
        for (const item of combo.items || []) {
          const p = catalog.products.find((pr: any) => pr.id === item.product_id);
          if (!p) continue;
          const qty = item.quantity || 1;
          const existing = order.items.find((i: any) => i.productId === p.id && !i.sent && !i.isCombo);
          if (existing) existing.qty += qty;
          else {
            order.items.push({
              id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
              productId: p.id, name: p.name + (combo.name ? ` (${combo.name})` : ''), price: 0,
              qty, sent: false, ready: false, sentAt: null, notes: '', modifiers: [],
              course: p.course || '', isComboItem: true,
            });
          }
        }
      }
      order.items.push({
        id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
        productId: null, name: `→ Combo: ${combo.name}`, price: combo.price,
        qty: 1, sent: true, ready: true, sentAt: Date.now(), notes: '', modifiers: [],
        course: '', isComboPrice: true,
      });
      persistFloor(next);
      return;
    }
    handleAddItemWithModifiers(product);
  }

  // ---------- Impresora térmica ----------
  function handlePrint(): void {
    const order = selectedOrder;
    if (!order) return;
    const items = order.items.filter((i: any) => i.productId);
    const subtotal = items.reduce((s: any, i: any) => s + i.price * i.qty, 0);
    const discountAmount = round2(subtotal * (orderDiscount / 100));
    const totalConIgic = subtotal - discountAmount;
    const baseImponible = round2(totalConIgic / 1.07);
    const cuotaIgic = round2(totalConIgic - baseImponible);
    const totalWithTip = totalConIgic + tipAmount;
    const { restaurantName, companyCif, companyAddress, companyPhone, logoUrl, footerText, ticketWidth } = ticketSettings;
    const html = buildTicketHtml({
      items, subtotal, discountAmount, totalConIgic, baseImponible, cuotaIgic,
      tip: tipAmount, tipMethod, totalWithTip,
      restaurantName, companyCif, companyAddress, companyPhone, logoUrl, footerText, ticketWidth,
      tableName: selectedTable?.name || '',
      employeeName: currentUser?.name || '',
      ticketLabel: order.label ? `Comanda ${order.label}` : '',
      ticketNumber: selectedTable?.orderId ? String(selectedTable.orderId).slice(-6).toUpperCase() : '',
      date: new Date().toLocaleString('es-ES'),
      catalog, allergensList: ALLERGENS,
    });
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none';
    document.body.appendChild(iframe);
    const w = iframe.contentWindow!;
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 300);
  }

  // ---------- Catalogo ----------
  function addProduct(p: any) {
    const next = clone(catalog);
    const loc = p.ubicacion || 'Bar';
    next.products.push({
      id: 'p_' + Date.now(), name: p.name, category: p.category, price: Number(p.price),
      ubicacion: loc, discount: 0,
      stockByLocation: { [loc]: { stock: Number(p.stock), lowStock: Number(p.lowStock) } },
    });
    if (!next.categories.includes(p.category)) next.categories.push(p.category);
    persistCatalog(next); setNewProductOpen(false);
  }
  function updateProductField(id: string, field: string, value: any) {
    const next = clone(catalog);
    const p = next.products.find((p: any) => p.id === id);
    if (field === 'stockByLocation') {
      p.stockByLocation = value;
    } else {
      p[field] = (field === 'name' || field === 'category' || field === 'ubicacion') ? value : Number(value);
    }
    persistCatalog(next);
  }
  function deleteProduct(id: string) {
    const next = clone(catalog);
    next.products = next.products.filter((p: any) => p.id !== id);
    persistCatalog(next); setConfirmDeleteId(null);
  }

  // ---------- Empleados ----------
  function addEmployee(emp: any) { persistEmployees([...employees, { id: 'e_' + Date.now(), ...emp }]); }
  function updateEmployeeField(id: string, f: string, value: any) { persistEmployees(employees.map((e: any) => e.id === id ? { ...e, [f]: value } : e)); }
  function deleteEmployee(id: string) {
    const admins = employees.filter((e: any) => e.role === 'admin');
    const target = employees.find((e: any) => e.id === id);
    if (target?.role === 'admin' && admins.length <= 1) { showToast('Tiene que quedar al menos un administrador'); return; }
    persistEmployees(employees.filter((e: any) => e.id !== id));
  }

  // ---------- Cajón y formación ----------
  const [trainingMode, setTrainingMode] = useState(false);
  const [savedFloor, setSavedFloor] = useState<any>(null as any);
  const [showDrawerConfirm, setShowDrawerConfirm] = useState(false);
  const [showDrawerPIN, setShowDrawerPIN] = useState(false);
  const [drawerPinInput, setDrawerPinInput] = useState('');
  const [showCommands, setShowCommands] = useState(false);

  function toggleTraining() {
    if (trainingMode) {
      if (savedFloor) {
        setFloor(savedFloor);
        setSavedFloor(null);
      }
      setTrainingMode(false);
      showToast('Modo formación desactivado');
    } else {
      setSavedFloor(clone(floor));
      const tables = (floor?.tables || []).map((t: any) => ({
        ...t, orderId: null, orderIds: [], status: 'libre', reserved: null, isFiado: false,
      }));
      const training = { ...clone(floor), tables, orders: {}, history: {} };
      setFloor(training);
      setTrainingMode(true);
      showToast('🎓 Modo formación activado — los tickets no afectan a facturación real');
    }
  }

  async function loadClockinSummary(): Promise<void> {
    if (!currentUser) return;
    setClockinLoading(true);
    try {
      const r = await fetch(`/api/clockin?employeeId=${currentUser.id}&date=${new Date().toISOString().slice(0, 10)}`);
      if (r.ok) {
        const data = await r.json();
        setClockinSummary(data.summary || null);
      }
    } catch {}
    setClockinLoading(false);
  }

  async function handleClockinAction(action: string) {
    if (!currentUser) return;
    try {
      const r = await fetch('/api/clockin', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          method: 'tpc',
          action,
        }),
      });
      const data = await r.json();
      if (data.ok) {
        showToast(`✅ ${action} registrada`);
        loadClockinSummary();
      } else {
        showToast('❌ ' + (data.error || 'Error'));
      }
    } catch {
      showToast('❌ Error de conexión');
    }
  }

  function formatMinutes(mins: number): string {
    if (!mins && mins !== 0) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }

  function openDrawer(): void {
    if (!isPrinterConnected()) { showToast('No hay impresora conectada'); return; }
    printESCPOS(escposOpenDrawer())
      .then(() => showToast('Cajón abierto'))
      .catch(() => showToast('No se pudo abrir el cajón'));
  }

  function handleDrawerAction(): void {
    const policy = ticketSettings.drawerOpenPolicy || 'confirm';
    if (policy === 'quick') { openDrawer(); }
    else if (policy === 'confirm') { setShowDrawerConfirm(true); }
    else if (policy === 'pin') { setDrawerPinInput(''); setShowDrawerPIN(true); }
  }

  // ---------- Factura ----------
  async function printInvoice(sale: any) {
    if (!sale) return;
    const { restaurantName, companyCif, companyAddress, companyPhone, footerText } = ticketSettings;
    const totalConIva = sale.total || 0;
    const baseImponible = round2(totalConIva / 1.07);
    const cuotaIgic = round2(totalConIva - baseImponible);
    const itemsHtml = (sale.items || []).filter((i: any) => !i.voided).map((i: any) =>
      `<tr><td style="padding:3px 0">${i.name.replace(/</g,'&lt;')}</td><td style="text-align:center;width:40px">${i.qty}</td><td style="text-align:right;width:70px">${euros(i.price)}</td><td style="text-align:right;width:80px">${euros((i.price || 0) * (i.qty || 0))}</td></tr>`
    ).join('');
    const html = `<html><head><meta charset="utf-8"><style>
      @page { margin:8mm 12mm; size: A4; }
      body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#222; margin:0; padding:0; }
      .header { text-align:center; margin-bottom:18px; border-bottom:2px solid #222; padding-bottom:12px; }
      .header h1 { margin:0; font-size:20px; letter-spacing:1px; }
      .header .info { font-size:10px; color:#555; margin-top:4px; }
      .header .numero { font-size:13px; font-weight:bold; margin-top:4px; }
      table { width:100%; border-collapse:collapse; margin:12px 0; }
      th { border-bottom:2px solid #222; padding:5px 4px; text-align:left; font-size:10px; text-transform:uppercase; }
      td { padding:3px 4px; border-bottom:1px solid #ddd; font-size:11px; }
      .r { text-align:right; }
      .g { border-top:2px solid #222; font-weight:bold; font-size:12px; }
      .igic-line { font-size:10px; color:#555; }
      .footer { margin-top:20px; font-size:9px; color:#888; text-align:center; border-top:1px solid #ddd; padding-top:10px; }
      .client-box { background:#f5f5f5; padding:8px 10px; border-radius:4px; margin:10px 0; font-size:10px; }
      .client-box p { margin:2px 0; }
    </style></head><body>
      <div class="header">
        <h1>${restaurantName || 'FACTURA'}</h1>
        <div class="info">
          ${companyCif ? `CIF/NIF: ${companyCif}<br>` : ''}
          ${companyAddress ? `${companyAddress}<br>` : ''}
          ${companyPhone ? `Tel: ${companyPhone}` : ''}
        </div>
        <div class="numero">${sale.invoiceNumber || sale.id} · Ticket #${sale.ticketNumber || '-'}</div>
        <div class="info">${new Date(sale.closedAt).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
      </div>
      <div class="client-box">
        <p><strong>Cliente:</strong> ${sale.invoiceName || '—'}</p>
        <p><strong>NIF:</strong> ${sale.invoiceNif || '—'}</p>
        ${sale.invoiceAddress ? `<p><strong>Dirección:</strong> ${sale.invoiceAddress}</p>` : ''}
        <p><strong>Mesa:</strong> ${sale.tableName} · <strong>Camarero:</strong> ${sale.employeeName || '—'}</p>
      </div>
      <table>
        <tr><th>Artículo</th><th style="text-align:center">Ud.</th><th style="text-align:right">Precio</th><th style="text-align:right">Importe</th></tr>
        ${itemsHtml}
        <tr><td colspan="3" style="border:none;padding:3px 4px;font-size:10px;color:#555;text-align:right">Base Imponible</td><td class="r igic-line">${euros(baseImponible)}</td></tr>
        <tr><td colspan="3" style="border:none;padding:1px 4px;font-size:10px;color:#555;text-align:right">IGIC 7%</td><td class="r igic-line">${euros(cuotaIgic)}</td></tr>
        <tr class="g"><td colspan="3" style="text-align:right;font-size:12px">TOTAL</td><td class="r" style="font-size:13px">${euros(totalConIva)}</td></tr>
      </table>
      ${sale.tip > 0 ? `<p style="font-size:10px;color:#888;text-align:right">Propina (NO fiscal): +${euros(sale.tip)}</p>` : ''}
      ${sale.discount > 0 ? `<p style="font-size:10px;color:#888;text-align:right">Descuento aplicado: ${sale.discount}%</p>` : ''}
      ${sale.invoiceEmail ? `<p style="font-size:9px;color:#888;margin-top:8px">Enviada a: ${sale.invoiceEmail}</p>` : ''}
      <div class="footer">${footerText || 'Gracias por su visita'}</div>
    </body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentWindow!.document.open();
    iframe.contentWindow!.document.write(html);
    iframe.contentWindow!.document.close();
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }

  async function handleDownloadPdf(sale: any) {
    if (!sale) return;
    try {
      const res = await fetch('/api/invoice/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale }),
      });
      if (!res.ok) { showToast('Error al generar PDF'); return; }
      const data = await res.json();
      const blob = b64ToBlob(data.pdf, 'application/pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = data.filename;
      a.click(); URL.revokeObjectURL(url);
      showToast('PDF descargado');
    } catch { showToast('Error al descargar PDF'); }
  }

  async function handleSendInvoiceEmail(sale: any) {
    if (!sale || !sale.invoiceEmail) { showToast('El cliente no tiene email registrado'); return; }
    try {
      const pdfRes = await fetch('/api/invoice/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale }),
      });
      if (!pdfRes.ok) { showToast('Error al generar PDF'); return; }
      const pdfData = await pdfRes.json();
      const sendRes = await fetch('/api/invoice/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId: sale.id, pdfBase64: pdfData.pdf, filename: pdfData.filename, to: sale.invoiceEmail }),
      });
      const sendData = await sendRes.json();
      if (sendData.method === 'smtp') showToast('Factura enviada por email');
      else if (sendData.method === 'download') { handleDownloadPdf(sale); showToast('Email no configurado — PDF descargado'); }
      else showToast('Error al enviar: ' + (sendData.error || 'desconocido'));
    } catch { showToast('Error al enviar factura'); }
  }

  function btoa(str: string): string { if (typeof window.btoa === 'function') return window.btoa(str); return Buffer.from(str).toString('base64'); }
  function b64ToBlob(b64: string, mime: string): Blob {
    const byteChars = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    return new Blob([new Uint8Array(byteNums)], { type: mime });
  }

  // ---------- Devoluciones ----------
  function handleRefund(saleId: string, refund: any) {
    const next = clone(sales);
    const sale = next.find((s: any) => s.id === saleId);
    if (!sale) return;
    if (!sale.refunds) sale.refunds = [];
    const refundWithEmployee = { ...refund, employeeName: currentUser?.name || '—' };
    sale.refunds.push(refundWithEmployee);
    setSales(next);
    // Persist + Stripe refund
    const refundBody = JSON.stringify({ saleId, refund: refundWithEmployee });
    fetch('/api/sales/refund', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: refundBody,
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json();
        showToast(`Error en devolución: ${data.error}`);
      } else {
        const data = await res.json();
        if (data.stripeRefundId) {
          showToast(`Devolución de ${euros(refundWithEmployee.amount)} procesada en Stripe (${data.stripeRefundId})`);
        } else {
          showToast(`Devolución de ${euros(refundWithEmployee.amount)} registrada (efectivo/offline)`);
        }
      }
    }).catch(() => {
      enqueueMutation('/api/sales/refund', refundBody);
      showToast('Sin conexión — la devolución se guardará cuando vuelva la red');
    });
  }

  // ---------- Bizum ----------
  function handleConfirmBizum(saleId: string) {
    const next = clone(sales);
    const sale = next.find((s: any) => s.id === saleId);
    if (!sale) return;
    const confirmed = (sale.payments || []).map((p: any) =>
      p.method === 'bizum' ? { ...p, confirmed: true } : p
    );
    sale.payments = confirmed;
    delete sale.hasPendingBizum;
    setSales(next);
    fetch('/api/sales', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleId, payments: confirmed }),
    }).catch(() => enqueueMutation('/api/sales', JSON.stringify({ saleId, payments: confirmed })));
    showToast('Bizum confirmado');
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
              if (group.adminOnly && currentUser.role !== 'admin') return null;
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
            {/* Cajón */}
            <button onClick={handleDrawerAction} title="Abrir cajón" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
              <span className="text-base">🪙</span>
            </button>
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
              {currentUser.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.brassLight }} />}
              {currentUser.name}
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
              onSave={async (next: any) => {
                setCatalog(next);
                const { categories, products, combos } = next;
                try {
                  await saveCatalog({ categories, products, combos: combos || catalog.combos || [] });
                  showToast('✓ Guardado');
                } catch (e) {
                  showToast('Error: ' + ((e as Error)?.message || 'desconocido'));
                }
              }}
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
              onSave={async (next) => { setOffers(next); try { await saveOffers(next); } catch { enqueueMutation('/api/offers', JSON.stringify(next)); showToast('Sin conexión — las ofertas se guardarán cuando vuelva la red'); } }}
              colors={C}
            />
          )}
          {view === 'combos' && (
            <CombosPanel
              combos={combos} catalog={catalog}
              onSave={async (next) => { setCombos(next); try { await saveCombos(next); } catch { enqueueMutation('/api/combos', JSON.stringify(next)); showToast('Sin conexión — los combos se guardarán cuando vuelva la red'); } }}
              colors={C}
            />
          )}
          {view === 'menus' && (
            <MenusDelDiaPanel
              mealMenus={catalog?.mealMenus || []} catalog={catalog}
              onSave={async (next: any) => { try { await saveMealMenus(next); } catch { enqueueMutation('/api/meal-menus', JSON.stringify(next)); showToast('Sin conexión — los menús se guardarán cuando vuelva la red'); } setCatalog((prev: any) => ({ ...prev, mealMenus: next })); }}
              colors={C}
            />
          )}
          {view === 'carrusel' && (
            <CarruselPanel
              catalog={catalog}
              onSave={async (data) => {
                const payload = JSON.stringify({ action: 'reorder-carousel', data });
                try {
                  await fetch('/api/catalog', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                  });
                } catch { enqueueMutation('/api/catalog', payload, 'PATCH'); showToast('Sin conexión — el carrusel se guardará cuando vuelva la red'); }
                const updated = await fetch('/api/catalog').then(r => r.json());
                setCatalog(updated);
              }}
              colors={C}
            />
          )}
          {view === 'precios' && (
            <PreciosPanel
              catalog={catalog}
              priceRules={catalog?.priceRules || []}
              onSaveRules={async (rules) => {
                try { await savePriceRules(rules); } catch { enqueueMutation('/api/price-rules', JSON.stringify(rules)); showToast('Sin conexión — las reglas se guardarán cuando vuelva la red'); }
                setCatalog((prev: any) => ({ ...prev, priceRules: rules }));
              }}
              colors={C}
            />
          )}
          {view === 'reparto'    && <DeliveryView catalog={catalog} />}
          {view === 'pedidos'    && <PedidosView sales={sales} onRefund={handleRefund} onConfirmBizum={handleConfirmBizum} onPrintInvoice={(sale) => { printInvoice(sale); }} onDownloadPdf={handleDownloadPdf} onSendInvoiceEmail={handleSendInvoiceEmail} colors={C} />}
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

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="w-full max-w-sm rounded-xl p-5 fade-up max-h-[85vh] overflow-y-auto">
            <p className="font-display text-lg mb-4" style={{ color: C.cream }}>Configuración</p>
            <div className="flex flex-col gap-3">
              {['restaurantName', 'companyCif', 'companyAddress', 'companyPhone', 'logoUrl', 'footerText', 'ticketWidth'].map((field: any) => (
                <div key={field}>
                  <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">
                    {field === 'restaurantName' ? 'Nombre del restaurante' : field === 'companyCif' ? 'CIF/NIF' : field === 'companyAddress' ? 'Dirección' : field === 'companyPhone' ? 'Teléfono' : field === 'logoUrl' ? 'URL del logo' : field === 'footerText' ? 'Texto del pie' : 'Ancho del ticket'}
                  </label>
                  <input
                    value={ticketSettings[field]}
                    onChange={e => setTicketSettings(s => ({ ...s, [field]: e.target.value }))}
                    style={{ background: C.surfaceLight, color: C.cream }}
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    placeholder={field === 'ticketWidth' ? '80mm' : ''}
                  />
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
              <p className="font-display text-sm" style={{ color: C.cream }}>Política de apertura de cajón</p>
              <select
                value={ticketSettings.drawerOpenPolicy || 'confirm'}
                onChange={e => setTicketSettings(s => ({ ...s, drawerOpenPolicy: e.target.value }))}
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="quick">Apertura rápida (sin confirmación)</option>
                <option value="confirm">Con confirmación</option>
                <option value="pin">Requiere PIN de administrador</option>
              </select>
              <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
              <p className="font-display text-sm" style={{ color: C.cream }}>Descuento de personal</p>
              <p style={{ color: C.muted }} className="text-[10px] -mt-2">Porcentaje por categoría (0 = sin descuento)</p>
              {(() => {
                const raw = ticketSettings.personalDiscountRates;
                let rates: Record<string, number> = {};
                try { rates = typeof raw === 'string' ? JSON.parse(raw) : raw || {}; }
                catch { rates = {}; }
                const cats = catalog?.categories?.map((c: any) => typeof c === 'string' ? c : c.name) || [];
                const allKeys = [...new Set([...cats, ...Object.keys(rates)])];
                return allKeys.map((catName: any) => (
                  <div key={catName} className="flex items-center gap-2">
                    <span style={{ color: C.cream }} className="text-xs flex-1">{catName}</span>
                    <input
                      value={rates[catName] ?? 0}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 0;
                        const updated = { ...rates, [catName]: v };
                        setTicketSettings(s => ({ ...s, personalDiscountRates: JSON.stringify(updated) }));
                      }}
                      type="number" min="0" max="100" step="1"
                      style={{ background: C.surfaceLight, color: C.cream, width: 64 }}
                      className="rounded-md px-2 py-1.5 text-sm text-right"
                    />
                    <span style={{ color: C.muted }} className="text-xs">%</span>
                  </div>
                ));
              })()}
              <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
              <p className="font-display text-sm" style={{ color: C.cream }}>Pedido por QR</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.cream }}>Activar pedido QR en mesa</span>
                <button onClick={() => setTicketSettings(s => ({ ...s, qrOrderingEnabled: s.qrOrderingEnabled === 'false' ? 'true' : 'false' }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: (ticketSettings.qrOrderingEnabled || 'true') === 'true' ? C.brass : C.line }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: (ticketSettings.qrOrderingEnabled || 'true') === 'true' ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.cream }}>Requerir pago al pedir</span>
                <button onClick={() => setTicketSettings(s => ({ ...s, qrRequirePayment: s.qrRequirePayment === 'false' ? 'true' : 'false' }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: (ticketSettings.qrRequirePayment || 'false') === 'true' ? C.brass : C.line }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: (ticketSettings.qrRequirePayment || 'false') === 'true' ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
                </button>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Color primario QR</label>
                <input value={ticketSettings.qrThemePrimary || '#c4a04a'} onChange={e => setTicketSettings(s => ({ ...s, qrThemePrimary: e.target.value }))}
                  style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm" placeholder="#c4a04a" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Color secundario QR</label>
                <input value={ticketSettings.qrThemeSecondary || '#1a1a1a'} onChange={e => setTicketSettings(s => ({ ...s, qrThemeSecondary: e.target.value }))}
                  style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm" placeholder="#1a1a1a" />
              </div>
              <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
              <p className="font-display text-sm" style={{ color: C.cream }}>Pedido Online (recogida/domicilio)</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.cream }}>Activar pedidos online</span>
                <button onClick={() => setTicketSettings(s => ({ ...s, onlineOrderingEnabled: s.onlineOrderingEnabled === 'false' ? 'true' : 'false' }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: (ticketSettings.onlineOrderingEnabled || 'true') === 'true' ? C.brass : C.line }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: (ticketSettings.onlineOrderingEnabled || 'true') === 'true' ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.cream }}>Requerir pago online</span>
                <button onClick={() => setTicketSettings(s => ({ ...s, onlinePaymentRequired: s.onlinePaymentRequired === 'false' ? 'true' : 'false' }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: (ticketSettings.onlinePaymentRequired || 'true') === 'true' ? C.brass : C.line }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: (ticketSettings.onlinePaymentRequired || 'true') === 'true' ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.cream }}>Aceptar automáticamente</span>
                <button onClick={() => setTicketSettings(s => ({ ...s, onlineAutoAccept: s.onlineAutoAccept === 'false' ? 'true' : 'false' }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: (ticketSettings.onlineAutoAccept || 'true') === 'true' ? C.brass : C.line }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: (ticketSettings.onlineAutoAccept || 'true') === 'true' ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
                </button>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Tiempo preparación (min)</label>
                <input value={ticketSettings.onlinePrepTime || '20'} onChange={e => setTicketSettings(s => ({ ...s, onlinePrepTime: e.target.value }))}
                  type="number" min={5} max={120}
                  style={{ background: C.surfaceLight, color: C.cream }}
                  className="w-full rounded-lg px-3 py-2 text-sm" />
              </div>
              <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
              <p className="font-display text-sm" style={{ color: C.cream }}>Fichaje (clock-in)</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.cream }}>Activar fichaje de empleados</span>
                <button onClick={() => setTicketSettings(s => ({ ...s, clockinEnabled: s.clockinEnabled === 'false' ? 'true' : 'false' }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: (ticketSettings.clockinEnabled || 'true') === 'true' ? C.brass : C.line }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: (ticketSettings.clockinEnabled || 'true') === 'true' ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.cream }}>Requerir PIN para fichar</span>
                <button onClick={() => setTicketSettings(s => ({ ...s, clockinPinRequired: s.clockinPinRequired === 'false' ? 'true' : 'false' }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: (ticketSettings.clockinPinRequired || 'true') === 'true' ? C.brass : C.line }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: (ticketSettings.clockinPinRequired || 'true') === 'true' ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.cream }}>Geolocalización requerida</span>
                <button onClick={() => setTicketSettings(s => ({ ...s, clockinGeolocation: s.clockinGeolocation === 'true' ? 'false' : 'true' }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: (ticketSettings.clockinGeolocation || 'false') === 'true' ? C.brass : C.line }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: (ticketSettings.clockinGeolocation || 'false') === 'true' ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  try { await saveSettings(ticketSettings); } catch { enqueueMutation('/api/settings', JSON.stringify(ticketSettings)); showToast('Sin conexión — la configuración se guardará cuando vuelva la red'); }
                  setShowSettings(false);
                }}
                style={{ background: C.sage, color: '#fff' }}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowSettings(false)}
                style={{ color: C.muted, background: C.surfaceLight }}
                className="flex-1 rounded-lg py-2.5 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
      {showDrawerConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowDrawerConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-3" style={{ color: C.cream }}>🪙 Abrir cajón</p>
            <p style={{ color: C.muted }} className="text-sm mb-4">¿Abrir el cajón portamonedas?</p>
            <div className="flex gap-2">
              <button onClick={() => { openDrawer(); setShowDrawerConfirm(false); }}
                style={{ background: C.brass, color: C.base }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold">Abrir</button>
              <button onClick={() => setShowDrawerConfirm(false)}
                style={{ color: C.muted, background: C.surfaceLight }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal PIN abrir cajón ── */}
      {showDrawerPIN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowDrawerPIN(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>🪙 Abrir cajón</p>
            <p style={{ color: C.muted }} className="text-xs mb-3">Introduce el PIN de administrador</p>
            <div className="text-center mb-4">
              <div style={{ background: C.surfaceLight, color: C.brassLight }}
                className="text-3xl font-mono font-bold px-6 py-3 rounded-xl inline-block tracking-[0.3em]">
                {drawerPinInput.padEnd(4, '·')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1,2,3,4,5,6,7,8,9].map((n: any) => (
                <button key={n} onClick={() => { if (drawerPinInput.length < 4) setDrawerPinInput(p => p + n); }}
                  style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                  className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">{n}</button>
              ))}
              <button onClick={() => setDrawerPinInput(p => p.slice(0, -1))}
                style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">⌫</button>
              <button onClick={() => setDrawerPinInput('')}
                style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.muted }}
                className="rounded-lg py-3 text-lg font-mono hover:opacity-80">C</button>
              <button onClick={async () => {
                const r = await fetch('/api/employees', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-tpv-key': API_KEY },
                  body: JSON.stringify({ action: 'verify', pin: drawerPinInput, pinHash: await sha256(drawerPinInput) }),
                });
                if (!r.ok) { showToast('PIN de administrador incorrecto'); setDrawerPinInput(''); return; }
                const admin = await r.json();
                if (admin.role !== 'admin') { showToast('PIN de administrador incorrecto'); setDrawerPinInput(''); return; }
                openDrawer(); setShowDrawerPIN(false);
              }}
                disabled={drawerPinInput.length < 4}
                style={{
                  background: drawerPinInput.length === 4 ? C.brass : C.surfaceLight,
                  color: drawerPinInput.length === 4 ? C.base : C.muted,
                }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80 disabled:cursor-not-allowed">
                OK
              </button>
            </div>
            <button onClick={() => setShowDrawerPIN(false)}
              style={{ color: C.muted, background: C.surfaceLight }}
              className="w-full rounded-lg py-2.5 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={showCommands}
        onClose={() => setShowCommands(false)}
        navItems={navGroups.flatMap((g: any) => g.items)}
        floor={floor}
        onSelectTable={(id) => { setSelectedTableId(id); setActiveCategory('Todos'); }}
        onNavigate={(id) => { setView(id as View); }}
        onAction={(action) => {
          if (action === 'openDrawer') handleDrawerAction();
          else if (action === 'toggleTraining') toggleTraining();
          else if (action === 'print') handlePrint();
        }}
        C={C}
      />
      </div>
    </div>
  );
}
