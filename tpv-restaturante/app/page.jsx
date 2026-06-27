"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  LayoutGrid, ChefHat, Package, BarChart3, AlertTriangle,
  LogOut, Users, ShieldCheck, Sun, Moon, ClipboardList, WifiOff, Printer, Settings, Percent, Truck, Euro, Star, Undo2, FileText, Monitor, Calendar, Bell, Clock, Loader2,
} from 'lucide-react';

import { THEMES, seedCatalog, seedFloor, seedEmployees, euros, round2, clone } from '../components/constants';
import {
  runMigrate, fetchCatalog, saveCatalog,
  fetchFloor, saveFloor,
  fetchSales, addSale,
  fetchEmployees, saveEmployees,
  logAccess,
  registerVerifactu,
  saveStockLog,
  saveCancelledOrder,
  saveTurn,
  fetchModifiers,
} from '../lib/api';
import { onNetworkChange, clearMutations, getMutations } from '../lib/offline';
import { escposOpenDrawer, printESCPOS, isPrinterConnected } from '../lib/thermal-printer';
import { fetchSettings, saveSettings, fetchOffers, saveOffers, fetchCombos, saveCombos, saveMealMenus, savePriceRules } from '../lib/api';
import { ALLERGENS } from '../components/constants';
import { playKitchenAlert, showKitchenNotification, requestNotificationPermission, playBeep } from '../lib/sound';

import MenuPrincipal        from '../components/MenuPrincipal';
import LoginScreen          from '../components/LoginScreen';
import SalonView            from '../components/SalonView';
import FloorEditor          from '../components/FloorEditor';
import CocinaView           from '../components/CocinaView';
import InventarioView       from '../components/InventarioView';
import AlmacenMenuView      from '../components/AlmacenMenuView';
import AlmacenDetalleView   from '../components/AlmacenDetalleView';
import InformesView         from '../components/InformesView';
import EmpleadosView        from '../components/EmpleadosView';
import ComandaDrawer        from '../components/ComandaDrawer';
import PaymentModal         from '../components/PaymentModal';
import ComandasAbiertasView from '../components/ComandasAbiertasView';
import ModifierSelector     from '../components/ModifierSelector';
import OfertasPanel         from '../components/OfertasPanel';
import CombosPanel          from '../components/CombosPanel';
import MenusDelDiaPanel     from '../components/MenusDelDiaPanel';
import PreciosPanel         from '../components/PreciosPanel';
import CarruselPanel         from '../components/CarruselPanel';
import CartasView           from '../components/CartasView';
import DeliveryView         from '../components/DeliveryView';
import CommandPalette       from '../components/CommandPalette';
import PedidosView          from '../components/PedidosView';
import GestoriaView          from '../components/GestoriaView';
import KDSView               from '../components/KDSView';
import PairingPanel           from '../components/PairingPanel';
import AuditView              from '../components/AuditView';
import ReservasView            from '../components/ReservasView';
import WaitlistView              from '../components/WaitlistView';
import OnlineOrdersView            from '../components/OnlineOrdersView';
import TurnosView                  from '../components/TurnosView';
import RegistroHorarioView         from '../components/RegistroHorarioView';
import SolicitudesView             from '../components/SolicitudesView';
import PedidosCompraView           from '../components/PedidosCompraView';
import AlbaranesView               from '../components/AlbaranesView';
import ProduccionView              from '../components/ProduccionView';

export default function App() {
  // ---------- Tema claro/oscuro ----------
  const [theme, setTheme] = useState('dark');
  const C = THEMES[theme];

  // ---------- Estado global ----------
  const [loading, setLoading]       = useState(true);
  const [fatalError, setFatalError] = useState(false);
  const [catalog, setCatalog]       = useState(null);
  const [floor, setFloor]           = useState(null);
  const [sales, setSales]           = useState([]);
  const [employees, setEmployees]   = useState([]);

  // Sesion
  const [currentUser, setCurrentUser]     = useState(null);
  const [loginSelected, setLoginSelected] = useState(null);
  const [pinInput, setPinInput]           = useState('');
  const [menuMode, setMenuMode]           = useState('menu');
  const [entryPoint, setEntryPoint]       = useState('entrada');

  // Clock-in TPV
  const [showClockinModal, setShowClockinModal] = useState(false);
  const [clockinSummary, setClockinSummary] = useState(null);
  const [clockinLoading, setClockinLoading] = useState(false);

  // Navegacion
  const [view, setView]                         = useState('salon');
  const [almacenUbicacion, setAlmacenUbicacion] = useState(null);

  // Comanda / pago
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [activeCategory, setActiveCategory]   = useState('Todos');
  const [paying, setPaying]                   = useState(false);
  const [paymentSplits, setPaymentSplits]     = useState([]);
  const [orderDiscount, setOrderDiscount]     = useState(0);
  const [tipAmount, setTipAmount]             = useState(0);
  const [tipMethod, setTipMethod]             = useState('efectivo');
  const [invoiceNif, setInvoiceNif]           = useState('');
  const [invoiceName, setInvoiceName]         = useState('');
  const [invoiceAddress, setInvoiceAddress]   = useState('');
  const [invoiceEmail, setInvoiceEmail]       = useState('');

  // Editor de plano
  const [showFloorEditor, setShowFloorEditor] = useState(false);

  // UI auxiliar
  const [toast, setToast]                     = useState(null);
  const [newProductOpen, setNewProductOpen]   = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Offline
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const [pendingMutations, setPendingMutations] = useState(0);

  // QR calls
  const [qrCalls, setQrCalls] = useState([]);

  // Modificadores
  const [modifierData, setModifierData] = useState({ groups: [], productModifiers: {} });
  const [showModifierSelector, setShowModifierSelector] = useState(null);
  const [editingItemModifiers, setEditingItemModifiers] = useState(null); // { item, product, groups }

  // Configuración ticket
  const [ticketSettings, setTicketSettings] = useState({
    restaurantName: 'LA COMANDA', logoUrl: '', footerText: 'Gracias por su visita', ticketWidth: '80mm',
  });
  const [showSettings, setShowSettings] = useState(false);

  // Ofertas
  const [offers, setOffers] = useState([]);
  // Combos
  const [combos, setCombos] = useState([]);

  // Impresora

  // Detectar nuevos items en cocina para sonido + notificación
  const prevPendingRef = useRef(0);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!floor) return;
    const pending = Object.values(floor.orders || {}).reduce((sum, o) =>
      sum + o.items.filter(i => i.sent && !i.ready).length, 0
    );
    if (pending > prevPendingRef.current && prevPendingRef.current > 0) {
      playKitchenAlert();
      showKitchenNotification(pending - prevPendingRef.current);
    }
    prevPendingRef.current = pending;
  }, [floor]);

  // ---------- Toast ----------
  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__tpvToastTimer);
    window.__tpvToastTimer = window.setTimeout(() => setToast(null), 2600);
  }

  // ---------- Carga inicial con Neon ----------
  useEffect(() => {
    async function loadAll() {
      try {
        await runMigrate();

        const [cat, flr, sls, emps] = await Promise.all([
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
          await saveFloor(seed);
          setFloor(seed);
        } else {
          // Normalize orderIds for backward compatibility
          flr.tables.forEach(t => {
            if (!t.orderIds && t.orderId) t.orderIds = [t.orderId];
            if (!t.orderIds) t.orderIds = [];
          });
          setFloor(flr);
        }

        if (!emps?.length) {
          const seed = seedEmployees();
          await saveEmployees(seed);
          setEmployees(seed);
        } else {
          setEmployees(emps);
        }

        setSales(Array.isArray(sls) ? sls : []);

        const stg = await fetchSettings().catch(() => null);
        if (stg) setTicketSettings(stg);
        const off = await fetchOffers().catch(() => []);
        setOffers(off);
        const cmb = cat?.combos || await fetchCombos().catch(() => []);
        setCombos(cmb);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setFatalError(true);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ---------- Offline ----------
  const processMutations = useCallback(async () => {
    const q = getMutations();
    if (q.length === 0) return;
    for (const m of q) {
      try {
        const h = { 'Content-Type': 'application/json' };
        const apiKey = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY
          ? process.env.NEXT_PUBLIC_TPV_API_KEY
          : (typeof window !== 'undefined' && window.__TPV_API_KEY) || '';
        if (apiKey) h['x-tpv-key'] = apiKey;
        await fetch(m.key, { method: 'PUT', headers: h, body: m.payload });
      } catch {}
    }
    clearMutations();
    setPendingMutations(0);
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

  // Poll QR calls
  useEffect(() => {
    async function pollCalls() {
      try {
        const r = await fetch('/api/qr-calls');
        if (r.ok) setQrCalls(await r.json());
      } catch {}
    }
    pollCalls();
    const interval = setInterval(pollCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Persistencia → Neon ----------
  async function persistCatalog(next) {
    setCatalog(next);
    try { await saveCatalog(next); }
    catch { showToast('No se ha podido guardar el catalogo'); }
  }
  async function persistFloor(next) {
    setFloor(next);
    if (trainingMode) return;
    try { await saveFloor(next); }
    catch { showToast('No se ha podido guardar la sala'); }
  }
  const salesQueue = useRef([]);
  const salesProcessing = useRef(false);

  async function processSalesQueue() {
    if (salesProcessing.current || salesQueue.current.length === 0) return;
    salesProcessing.current = true;
    while (salesQueue.current.length > 0) {
      const sale = salesQueue.current[0];
      try {
        await addSale(sale);
        salesQueue.current.shift();
      } catch {
        showToast('No se ha podido guardar la venta. Reintentando...');
        await new Promise(r => setTimeout(r, 2000));
        try {
          await addSale(sale);
          salesQueue.current.shift();
        } catch {
          showToast('No se ha podido guardar la venta tras reintentar');
          salesQueue.current.shift();
        }
      }
    }
    salesProcessing.current = false;
  }

  async function persistSales(next) {
    setSales(next);
    const newSale = next[next.length - 1];
    salesQueue.current.push(newSale);
    processSalesQueue();
  }
  async function persistEmployees(next) {
    setEmployees(next);
    try { await saveEmployees(next); }
    catch { showToast('No se ha podido guardar el equipo'); }
  }

  // ---------- Stock bajo ----------
  const lowStockProducts = useMemo(
    () => (catalog ? catalog.products.filter(p => p.stock <= p.lowStock) : []),
    [catalog]
  );

  // ---------- Login ----------
  function pressDigit(d) {
    if (pinInput.length >= 4) return;
    const next = pinInput + d;
    setPinInput(next);
    if (next.length === 4) {
      if (loginSelected.pin === next) {
        setCurrentUser(loginSelected);
        setLoginSelected(null);
        setPinInput('');

        // Turno de entrada
        saveTurn({ employeeId: loginSelected.id, employeeName: loginSelected.name, action: 'entrada', turnDate: new Date().toISOString().slice(0, 10) }).catch(() => {});

        // Determinar la vista destino según el punto de entrada
        let targetView = 'salon';
        if (entryPoint === 'almacen') {
          if (loginSelected.role !== 'admin') { showToast('Solo administradores pueden acceder al almacen'); setCurrentUser(null); return; }
          targetView = 'almacen'; setAlmacenUbicacion(null);
        } else if (entryPoint === 'caja') {
          if (loginSelected.role !== 'admin') { showToast('Solo administradores pueden acceder a la caja'); setCurrentUser(null); return; }
          targetView = 'informes';
        } else if (entryPoint === 'config') {
          if (loginSelected.role !== 'admin') { showToast('Solo administradores pueden acceder a configuracion'); setCurrentUser(null); return; }
          targetView = 'empleados';
        }
        setView(targetView);
        setMenuMode('app');

        // Registrar la entrada en la BD (fire-and-forget, no bloquea la UI)
        logAccess({
          employeeId:   loginSelected.id,
          employeeName: loginSelected.name,
          role:         loginSelected.role,
          entryPoint,
        }).catch(err => console.warn('No se pudo registrar la entrada:', err));

      } else {
        showToast('PIN incorrecto');
        setTimeout(() => setPinInput(''), 300);
      }
    }
  }
  function deleteDigit() { setPinInput(p => p.slice(0, -1)); }
  function logout() {
    if (currentUser) {
      saveTurn({ employeeId: currentUser.id, employeeName: currentUser.name, action: 'salida', turnDate: new Date().toISOString().slice(0, 10) }).catch(() => {});
    }
    setCurrentUser(null); setLoginSelected(null); setPinInput('');
    setSelectedTableId(null); setView('salon'); setMenuMode('menu');
  }

  // ---------- Mesa seleccionada ----------
  const selectedTable = floor ? floor.tables.find(t => t.id === selectedTableId) : null;
  const activeOrderId = activeTicketId || selectedTable?.orderIds?.[0] || selectedTable?.orderId;
  const selectedOrder = activeOrderId ? floor?.orders?.[activeOrderId] : null;

  // Crear orden de deuda si la mesa esta en fiado sin orden activa
  const debtFloorRef = useRef(null);
  useEffect(() => {
    if (!selectedTable?.isFiado || selectedTable?.orderId || !currentUser) return;
    const lastFiadoSale = [...sales]
      .filter(s => s.tableId === selectedTableId && s.isFiado)
      .sort((a, b) => b.closedAt - a.closedAt)[0];
    if (!lastFiadoSale) return;
    const nextFloor = clone(floor);
    const table = nextFloor.tables.find(t => t.id === selectedTableId);
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
    saveFloor(f).catch(() => showToast('No se ha podido guardar la deuda'));
  }, []);

  const orderTotal = selectedOrder ? selectedOrder.items.reduce((s, i) => {
    if (i.voided) return s;
    const p = catalog?.products?.find(pr => pr.id === i.productId);
    const disc = p?.discount || 0;
    const effectivePrice = i.overridePrice != null ? i.overridePrice : i.price;
    const lineDisc = i.lineDiscount || 0;
    const lineTotal = effectivePrice * (1 - (lineDisc > 0 ? lineDisc : disc) / 100) * i.qty;
    return s + (i.isCourtesy ? 0 : lineTotal);
  }, 0) : 0;
  const discountedTotal = round2(orderTotal * (1 - orderDiscount / 100));
  const finalTotal      = round2(discountedTotal + tipAmount);
  const splitsUsed      = round2(paymentSplits.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const remaining       = round2(finalTotal - splitsUsed);
  const canConfirm      = paymentSplits.length > 0 && Math.abs(remaining) < 0.005;

  // ---------- Acciones de comanda ----------
  function changeQty(itemId, delta) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    const item = order.items.find(i => i.id === itemId);
    if (!item || item.sent) return;
    item.qty += delta;
    if (item.qty <= 0) order.items = order.items.filter(i => i.id !== itemId);
    persistFloor(next);
  }

  function updateItemNotes(itemId, notes) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    const item = order.items.find(i => i.id === itemId);
    if (item) item.notes = notes;
    persistFloor(next);
  }

  function sendToKitchenCourse(course) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    let count = 0;
    order.items.forEach(i => {
      if (!i.sent && i.course === course) { i.sent = true; i.sentAt = Date.now(); count++; }
    });
    persistFloor(next);
    if (count) showToast(`${course} enviado a cocina (${count} ${count === 1 ? 'linea' : 'lineas'})`);
  }

  function updateItemCourse(itemId, course) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    const item = order.items.find(i => i.id === itemId);
    if (item) item.course = course;
    persistFloor(next);
  }

  function editItemModifiers(item, product) {
    const groups = getModifierGroupsForProduct(product.id);
    if (groups.length === 0) return;
    setEditingItemModifiers({ item, product, groups });
    setShowModifierSelector({ product, groups });
  }

  function toggleCuenta() {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    table.status = table.status === 'cuenta' ? 'ocupada' : 'cuenta';
    persistFloor(next);
  }

  function markReady(orderId) {
    const next = clone(floor);
    next.orders[orderId].items.forEach(i => { if (i.sent) i.ready = true; });
    persistFloor(next);
  }

  // ----- KDS (Kitchen Display System) -----
  function updateItemState(nextFloor, action) {
    setFloor(nextFloor);
    persistFloor(nextFloor);
    if (action?.previousState === 'ready') {
      const order = floor.orders?.[action.orderId];
      const item = order?.items?.find(i => i.id === action.itemId);
      const table = floor.tables?.find(t => t.id === order?.tableId);
      logKDSAuditFn('undo_ready', { tableName: table?.name, itemName: item?.name, orderId: action.orderId, itemId: action.itemId });
    }
  }

  function advanceOrder(nextFloor, action) {
    setFloor(nextFloor);
    persistFloor(nextFloor);
    if (!action) return;
    const order = floor.orders?.[action.orderId];
    const table = floor.tables?.find(t => t.id === order?.tableId);
    const isUndo = action.previousState === 'ready' || action.previousState === 'preparing';
    logKDSAuditFn(isUndo ? 'order_undo' : 'order_bump', { tableName: table?.name, orderId: action.orderId, previousState: action.previousState, itemCount: order?.items?.filter(i => i.sent && !i.served).length });
  }

  async function agotarProducto(productId, agotado) {
    const next = clone(catalog);
    const p = next.products.find(x => x.id === productId);
    if (p) p.agotado = agotado;
    setCatalog(next);
    try { await saveCatalog(next); } catch { showToast('No se pudo actualizar el stock'); }
    logKDSAuditFn('item_86', { productName: p?.name, productId, agotado });
  }

  async function logKDSAuditFn(action, details) {
    try {
      const { logKDSAudit } = await import('../lib/api');
      await logKDSAudit(action, details);
    } catch {}
  }

  async function reprintKitchenTicket(orderId) {
    const order = floor.orders?.[orderId];
    if (!order?.items?.length) { showToast('No hay items para reimprimir'); return; }
    const table = floor.tables?.find(t => t.id === order.tableId);
    try {
      const { printESCPOS } = await import('../lib/thermal-printer');
      const lines = [];
      lines.push('--- REIMPRESIÓN ---');
      lines.push(`Mesa: ${table?.name || order.tableId}`);
      const courses = [...new Set(order.items.filter(i => i.sent).map(i => i.course).filter(Boolean))];
      for (const course of courses) {
        lines.push(`--- ${course} ---`);
        order.items.filter(i => i.sent && i.course === course).forEach(i => lines.push(`${i.qty}x ${i.name}${i.notes ? ` (${i.notes})` : ''}`));
      }
      const noCourse = order.items.filter(i => i.sent && !i.course);
      if (noCourse.length) noCourse.forEach(i => lines.push(`${i.qty}x ${i.name}${i.notes ? ` (${i.notes})` : ''}`));
      lines.push('────────────────');
      lines.push(new Date().toLocaleString('es-ES'));
      await printESCPOS(lines.join('\n'));
      showToast('Comanda reimpresa');
    } catch (e) { showToast('Error al reimprimir: ' + e.message); }
  }

  // Elimina una línea del ticket (incluidas las ya enviadas a cocina)
  function removeItem(itemId) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    if (!order) return;
    order.items = order.items.filter(i => i.id !== itemId);
    if (order.items.length === 0 && (table.orderIds?.length || 0) <= 1) {
      delete next.orders[activeOid];
      table.orderIds = (table.orderIds || []).filter(id => id !== activeOid);
      table.orderId = table.orderIds?.[0] || null;
      if (!table.orderId) table.status = 'libre';
    }
    persistFloor(next);
  }

  // Descuento por línea y cortesía
  function setItemDiscount(itemId, pct) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find(i => i.id === itemId);
    if (item) { item.lineDiscount = pct; item.isCourtesy = false; }
    persistFloor(next);
  }

  function removeItemDiscount(itemId) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find(i => i.id === itemId);
    if (item) item.lineDiscount = 0;
    persistFloor(next);
  }

  function setItemCourtesy(itemId) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find(i => i.id === itemId);
    if (item) { item.isCourtesy = true; item.lineDiscount = 0; }
    persistFloor(next);
  }

  function removeItemCourtesy(itemId) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find(i => i.id === itemId);
    if (item) item.isCourtesy = false;
    persistFloor(next);
  }

  function setItemPrice(itemId, newPrice) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find(i => i.id === itemId);
    if (item) { item.overridePrice = Math.max(0, newPrice); }
    persistFloor(next);
  }

  // Anular artículo enviado con motivo
  function voidSentItem(itemId, reason) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId;
    const order = activeOid ? next.orders[activeOid] : null;
    const item = order?.items.find(i => i.id === itemId);
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
  function calcPersonalDiscountAmount(order, rates) {
    let totalDiscount = 0;
    for (const item of order.items) {
      if (item.voided) continue;
      const p = catalog?.products?.find(pr => pr.id === item.productId);
      if (!p) continue;
      const rate = rates[p.category] || 0;
      if (rate <= 0) continue;
      const effectivePrice = item.overridePrice != null ? item.overridePrice : item.price;
      const full = effectivePrice * item.qty;
      totalDiscount += full * rate / 100;
    }
    return round2(totalDiscount);
  }

  function applyPersonalDiscount(orderId, employeePin) {
    const emp = employees.find(e => e.pin === employeePin);
    if (!emp) { showToast('PIN incorrecto'); return false; }
    if (!emp.personalDiscountEnabled) { showToast(`${emp.name} no tiene activado el descuento de personal`); return false; }

    const next = clone(floor);
    const order = next.orders[orderId];
    if (!order) return false;

    const ratesRaw = ticketSettings.personalDiscountRates;
    let rates = {};
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
      const p = catalog?.products?.find(pr => pr.id === item.productId);
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
    const empNext = employees.map(e => {
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

  function removePersonalDiscount(orderId) {
    const next = clone(floor);
    const order = next.orders[orderId];
    if (!order || !order.personalDiscountApplied) return;

    const empId = order.personalDiscountEmployeeId;
    const ratesRaw = ticketSettings.personalDiscountRates;
    let rates = {};
    try { rates = typeof ratesRaw === 'string' ? JSON.parse(ratesRaw) : ratesRaw || {}; }
    catch { rates = {}; }

    // Devolver el descuento al empleado
    const discountAmount = calcPersonalDiscountAmount(order, rates);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const empNext = employees.map(e => {
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
      const p = catalog?.products?.find(pr => pr.id === item.productId);
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
  function cancelTable() {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    if (table.orderId) {
      const order = next.orders[table.orderId];
      saveCancelledOrder({
        tableId: table.id,
        tableName: table.name,
        orderId: table.orderId,
        items: order.items,
        total: order.items.reduce((s, i) => s + i.price * i.qty, 0),
        employeeName: currentUser?.name,
        cancelledAt: Date.now(),
      }).catch(() => {});
      delete next.orders[table.orderId];
    }
    table.status  = 'libre';
    table.isFiado = false;
    persistFloor(next);
    setSelectedTableId(null);
    showToast(`${table.name} cancelada y liberada`);
  }

  // Mover pedido a otra mesa
  function moveTable(tableId, destTableId) {
    if (tableId === destTableId) { showToast('No puedes mover una mesa sobre sí misma'); return; }
    const next = clone(floor);
    const src = next.tables.find(t => t.id === tableId);
    const dst = next.tables.find(t => t.id === destTableId);
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
  function mergeTables(tableId, sourceTableIds) {
    const next = clone(floor);
    const dst = next.tables.find(t => t.id === tableId);
    if (!dst) return;
    let dstOrder = dst.orderId ? next.orders[dst.orderId] : null;
    if (!dstOrder) {
      const newOrderId = 'ord_' + Date.now();
      dstOrder = { id: newOrderId, tableId, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '' };
      next.orders[newOrderId] = dstOrder;
      dst.orderId = newOrderId;
    }
    dst.status = 'unidas';
    dst.mergedTableIds = sourceTableIds.filter(id => id !== tableId);

    for (const srcId of sourceTableIds) {
      if (srcId === tableId) continue;
      const src = next.tables.find(t => t.id === srcId);
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
      .filter(id => id !== tableId)
      .map(id => next.tables.find(t => t.id === id)?.name || id)
      .filter(Boolean);
    if (mergedNames.length > 0) {
      dstOrder._mergedFrom = [tableId, ...sourceTableIds.filter(id => id !== tableId)];
      dstOrder._mergedLabel = `Unidas: ${dst.name} + ${mergedNames.join(' + ')}`;
    }

    persistFloor(next);
    showToast(`Pedidos fusionados en ${dst.name}`);
  }

  // ---------- Multi-ticket ----------
  function createNewTicket(tableId) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === tableId);
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

  function switchTicket(tableId, orderId) {
    setActiveTicketId(orderId);
  }

  function deleteEmptyTicket(tableId, orderId) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === tableId);
    const order = next.orders[orderId];
    if (!table || !order || order.items.length > 0) return;
    delete next.orders[orderId];
    table.orderIds = (table.orderIds || []).filter(id => id !== orderId);
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

  function renameTicket(tableId, orderId, label) {
    const next = clone(floor);
    const order = next.orders[orderId];
    if (order) order.label = label;
    persistFloor(next);
  }

  function linkCustomer(orderId, customer) {
    const next = clone(floor);
    const order = next.orders[orderId];
    if (order) order.customer = customer;
    persistFloor(next);
  }

  function unlinkCustomer(orderId) {
    const next = clone(floor);
    const order = next.orders[orderId];
    if (order) order.customer = null;
    persistFloor(next);
  }

  // ---------- Historial de mesa ----------
  function reopenOrder(tableId, historyEntry) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === tableId);
    if (!table) return;
    const reopenedId = historyEntry.id + '_reopened';
    next.orders[reopenedId] = {
      ...historyEntry,
      id: reopenedId,
      tableId,
      reopenedAt: Date.now(),
      items: historyEntry.items.map(i => ({ ...i, sent: false, ready: false })),
    };
    if (!table.orderIds) table.orderIds = [];
    table.orderIds.push(reopenedId);
    table.orderId = reopenedId;
    table.status = 'ocupada';
    // Remove from history
    if (next.history?.[tableId]) {
      next.history[tableId] = next.history[tableId].filter(h => h.id !== historyEntry.id);
    }
    persistFloor(next);
    setActiveTicketId(reopenedId);
    showToast('Pedido reabierto');
  }

  // ---------- Vaciar / liberar mesa ----------
  function voidTable(reason = '') {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    if (!table) return;
    const orderIds = [...(table.orderIds || [])];
    for (const oid of orderIds) {
      const order = next.orders[oid];
      if (order) {
        // Track cancelled items that were sent to kitchen
        const sentItems = order.items.filter(i => i.sent);
        if (sentItems.length > 0) {
          saveCancelledOrder({
            tableId: table.id, tableName: table.name, orderId: oid,
            items: sentItems, total: sentItems.reduce((s, i) => s + i.price * i.qty, 0),
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
  function addSplit(method) {
    if (method === 'fiado') {
      setPaymentSplits([{ id: 'sp_fiado', method: 'fiado', amount: finalTotal }]);
    } else {
      const used = round2(paymentSplits.reduce((s, p) => s + (p.method === 'fiado' ? 0 : p.amount), 0));
      const rem  = round2(finalTotal - used);
      if (rem <= 0) return;
      setPaymentSplits(prev => [...prev.filter(p => p.method !== 'fiado'), { id: 'sp_' + Date.now(), method, amount: rem, itemIds: [] }]);
    }
  }
  function updateSplitAmount(id, value) {
    const amount = value === '' ? 0 : Math.max(0, parseFloat(value));
    setPaymentSplits(prev => prev.map(p => p.id === id ? { ...p, amount: isNaN(amount) ? 0 : amount } : p));
  }
  function removeSplit(id) { setPaymentSplits(prev => prev.filter(p => p.id !== id)); }
  function toggleSplitItem(splitId, itemId) {
    setPaymentSplits(prev => prev.map(p => {
      if (p.id !== splitId) return p;
      const ids = p.itemIds || [];
      const next = ids.includes(itemId) ? ids.filter(id => id !== itemId) : [...ids, itemId];
      const itemAmount = (selectedOrder?.items || [])
        .filter(i => next.includes(i.id))
        .reduce((s, i) => s + i.price * i.qty, 0);
      return { ...p, itemIds: next, amount: itemAmount > 0 ? itemAmount : p.amount };
    }));
  }

  function closeBill() {
    const nextFloor   = clone(floor);
    const table       = nextFloor.tables.find(t => t.id === selectedTableId);
    const order       = nextFloor.orders[table.orderId];
    const wasDebt     = table.isFiado && order.items.length === 1 && order.items[0].productId === null;
    const nextCatalog = clone(catalog);
    order.items.forEach(item => {
      if (item.productId) {
        const p = nextCatalog.products.find(p => p.id === item.productId);
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

    // Stock log (fire-and-forget)
    order.items.forEach(item => {
      if (item.productId) {
        const p = nextCatalog.products.find(pr => pr.id === item.productId);
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
    const subtotal        = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmount  = round2(round2(subtotal * (orderDiscount / 100)) + offerDiscountAmount);
    const total           = round2(subtotal - discountAmount);
    const totalWithTip   = round2(total + tipAmount);
    const payments       = paymentSplits.map(s => ({ method: s.method, amount: round2(s.amount) }));
    const isFiado        = payments.some(p => p.method === 'fiado');
    const methodLabel    = payments.map(p => ({ efectivo:'Efectivo', tarjeta:'Tarjeta', bizum:'Bizum', fiado:'Fiado' }[p.method] || p.method)).join(' + ');

    const wantInvoice = invoiceNif.trim() && invoiceName.trim();
    const invNum = wantInvoice ? 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5) : '';
    const sale = {
      id: 's_' + Date.now(), tableId: table.id, tableName: table.name,
      items: order.items.map(i => ({ id: i.id, productId: i.productId, name: i.name, qty: i.qty, price: i.price, voided: !!i.voided })),
      subtotal, discount: orderDiscount, discountAmount, total, tip: tipAmount, tipMethod, totalWithTip,
      invoiceNif: wantInvoice ? invoiceNif : '',
      invoiceName: wantInvoice ? invoiceName : '',
      invoiceAddress: wantInvoice ? invoiceAddress : '',
      invoiceEmail: wantInvoice ? invoiceEmail : '',
      invoiceNumber: invNum,
      invoiceCreated: wantInvoice,
      invoiceCreatedAt: wantInvoice ? Date.now() : null,
      payments: isFiado ? [{ method: 'fiado', amount: totalWithTip }] : payments,
      paymentMethod: methodLabel, isFiado, isDebtPayment: wasDebt,
      offerDiscount: offerDiscountAmount,
      employeeId: currentUser?.id || null, employeeName: currentUser?.name || 'Sin asignar',
      closedAt: Date.now(),
    };

    // Save to history before removing
    const closedOrder = { ...order, closedAt: Date.now() };
    if (!nextFloor.history) nextFloor.history = {};
    if (!nextFloor.history[table.id]) nextFloor.history[table.id] = [];
    nextFloor.history[table.id].push(closedOrder);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    nextFloor.history[table.id] = nextFloor.history[table.id].filter(h => (h.closedAt || h.createdAt) >= todayStart.getTime());

    const closedOid = table.orderId;
    delete nextFloor.orders[closedOid];
    table.orderId = null;
    table.orderIds = (table.orderIds || []).filter(id => id !== closedOid);
    if (table.orderIds.length === 0) {
      table.status = 'libre'; table.isFiado = false;
    } else {
      table.orderId = table.orderIds[0];
      table.status = table.orderIds.length > 1 ? 'unidas' : 'ocupada';
    }

    if (trainingMode) {
    setPaying(false); setPaymentSplits([]); setOrderDiscount(0); setTipAmount(0); setTipMethod('efectivo');
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
    registerVerifactu(sale.id, sale).catch(err => console.warn('Verifactu:', err));

    setPaying(false); setPaymentSplits([]); setOrderDiscount(0); setTipAmount(0); setTipMethod('efectivo');
    setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail('');
    setSelectedTableId(null);

    const tipStr  = tipAmount > 0 ? ` (+${euros(tipAmount)} propina)` : '';
    const discStr = orderDiscount > 0 ? ` (${orderDiscount}% desc)` : '';
    const offerStr = offerDiscountAmount > 0 ? ` (oferta -${euros(offerDiscountAmount)})` : '';
    showToast(
      wasDebt ? `Deuda pagada: ${euros(totalWithTip)}${discStr}${offerStr}${tipStr}`
      : isFiado ? `Fiado: ${euros(totalWithTip)}${discStr}${offerStr}${tipStr}`
      : `Cobrado: ${euros(totalWithTip)}${discStr}${offerStr}${tipStr}`
    );

    playBeep(880, 0.15); setTimeout(() => playBeep(1100, 0.15), 150);

    // Abrir cajón si hay pago en efectivo e impresora conectada
    if (payments.some(p => p.method === 'efectivo') && isPrinterConnected()) {
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
    function handleGlobalKey(e) {
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
        if (input) { e.preventDefault(); input.focus(); return; }
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

  function getModifierGroupsForProduct(productId) {
    const groupIds = modifierData.productModifiers[productId] || [];
    return modifierData.groups.filter(g => groupIds.includes(g.id));
  }

  function handleAddItemWithModifiers(product) {
    const groups = getModifierGroupsForProduct(product.id);
    if (groups.length > 0) {
      setShowModifierSelector({ product, groups });
    } else {
      addItemWithPrice(product, [], 0);
    }
  }

  function confirmModifiersAndAdd(modifiers) {
    const product = showModifierSelector.product;
    const extraPrice = modifiers.reduce((s, m) => s + m.priceDelta, 0);
    setShowModifierSelector(null);

    // If editing an existing item, update it in place
    if (editingItemModifiers) {
      const next = clone(floor);
      const table = next.tables.find(t => t.id === selectedTableId);
      const order = next.orders[table.orderId];
      const item = order.items.find(i => i.id === editingItemModifiers.item.id);
      if (item) {
        item.modifiers = modifiers;
        item.price = round2(product.price + extraPrice);
      }
      persistFloor(next);
      setEditingItemModifiers(null);
      return;
    }
    addItemWithPrice(product, modifiers, extraPrice);
  }

  function addItemWithPrice(product, modifiers, extraPrice) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
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
    const effectivePrice = round2(product.price + extraPrice);
    const existing = order.items.find(i => i.productId === product.id && !i.sent && JSON.stringify(i.modifiers) === JSON.stringify(modifiers));
    if (existing) existing.qty += 1;
    else {
      const notes = window.prompt('Notas para ' + product.name + '?', '') || '';
      order.items.push({
        id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
        productId: product.id, name: product.name, price: effectivePrice,
        qty: 1, sent: false, ready: false, sentAt: null, notes, modifiers,
        course: product.course || '',
      });
    }
    persistFloor(next);
  }

  // Quitamos la antigua addItem (window.prompt + sin modifiers)
  function addItem(product) {
    if (product.isMenu && product.menuData) {
      const menu = product.menuData;
      const sel = product.menuSel;
      const next = clone(floor);
      const table = next.tables.find(t => t.id === selectedTableId);
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
          const p = catalog.products.find(pr => pr.id === s.productId);
          if (!p) continue;
          const existing = order.items.find(i => i.productId === p.id && !i.sent && !i.isCombo && !i.isMenuItem);
          if (existing) existing.qty += 1;
          else {
            order.items.push({
              id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
              productId: p.id, name: p.name + ` (${menu.name})`, price: 0,
              qty: 1, sent: false, ready: false, sentAt: null, notes: '', modifiers: [],
              course: p.course || '', isMenuItem: true,
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
      const table = next.tables.find(t => t.id === selectedTableId);
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
          const p = catalog.products.find(pr => pr.id === s.productId);
          if (!p) continue;
          const existing = order.items.find(i => i.productId === p.id && !i.sent && !i.isCombo);
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
          const p = catalog.products.find(pr => pr.id === item.product_id);
          if (!p) continue;
          const qty = item.quantity || 1;
          const existing = order.items.find(i => i.productId === p.id && !i.sent && !i.isCombo);
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
  function handlePrint() {
    const order = selectedOrder;
    if (!order) return;
    const items = order.items.filter(i => i.productId);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmount = round2(subtotal * (orderDiscount / 100));
    const total = subtotal - discountAmount;
    const totalWithTip = total + tipAmount;
    const date = new Date().toLocaleString('es-ES');
    const { restaurantName, logoUrl, footerText, ticketWidth } = ticketSettings;

    function row(item) {
      const mods = item.modifiers?.length
        ? item.modifiers.map(m => `  + ${m.optionName}`).join('<br>') + '<br>'
        : '';
      const product = catalog?.products?.find(p => p.id === item.productId);
      const itemAllergens = product?.allergens || [];
      const aIcons = itemAllergens.map(aid => {
        const a = ALLERGENS.find(x => x.id === aid);
        return a ? `<span style="font-size:8px;color:#888;margin-right:2px">[${a.abbr}]</span>` : '';
      }).join('');
      return `<div style="font-size:10px;margin-bottom:4px">
        <b>${item.name}</b> ${aIcons}<br>${mods}
        <span>${item.qty} x ${item.price.toFixed(2)}€</span>
        <span style="float:right">${(item.qty * item.price).toFixed(2)}€</span>
      </div>`;
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { margin:0; size:${ticketWidth} auto; }
  body { width:${ticketWidth}; padding:2mm 3mm; font-family:'Courier New',monospace; font-size:10px; line-height:1.3; color:#222; background:#fff; }
  .c { text-align:center; }
  .b { font-weight:bold; }
  .d { border-top:1px dashed #999; margin:4px 0; }
  .r { display:flex; justify-content:space-between; }
</style></head><body>
  ${logoUrl ? `<div class="c"><img src="${logoUrl}" style="max-width:60%;max-height:40px;margin-bottom:4px" /></div>` : ''}
  <div class="c b" style="font-size:14px">${restaurantName}</div>
  <div class="c" style="font-size:9px;margin-bottom:4px">
    CIF: 78406450W<br>${date}<br>Mesa: ${selectedTable?.name || ''}
  </div>
  <div class="d"></div>
  ${items.map(row).join('')}
  <div class="d"></div>
  <div class="r" style="font-size:9px"><span>Subtotal</span><span>${euros(subtotal)}</span></div>
  ${orderDiscount > 0 ? `<div class="r" style="font-size:9px;color:#777"><span>Dto. ${orderDiscount}%</span><span>-${euros(discountAmount)}</span></div>` : ''}
  ${tipAmount > 0 ? `<div class="r" style="font-size:9px;color:#777"><span>Propina · NO fiscal${tipMethod === 'efectivo' ? ' (efectivo)' : ' (tarjeta)'}</span><span>+${euros(tipAmount)}</span></div>` : ''}
  <div class="r b" style="font-size:12px;border-top:1px solid #333;padding-top:4px;margin-top:4px">
    <span>TOTAL</span><span>${euros(totalWithTip)}</span>
  </div>
  <div class="d"></div>
  <div class="c" style="font-size:9px;margin-top:4px">${footerText}</div>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }

  // ---------- Catalogo ----------
  function addProduct(p) {
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
  function updateProductField(id, field, value) {
    const next = clone(catalog);
    const p = next.products.find(p => p.id === id);
    if (field === 'stockByLocation') {
      p.stockByLocation = value;
    } else {
      p[field] = (field === 'name' || field === 'category' || field === 'ubicacion') ? value : Number(value);
    }
    persistCatalog(next);
  }
  function deleteProduct(id) {
    const next = clone(catalog);
    next.products = next.products.filter(p => p.id !== id);
    persistCatalog(next); setConfirmDeleteId(null);
  }

  // ---------- Empleados ----------
  function addEmployee(emp)                  { persistEmployees([...employees, { id: 'e_' + Date.now(), ...emp }]); }
  function updateEmployeeField(id, f, value) { persistEmployees(employees.map(e => e.id === id ? { ...e, [f]: value } : e)); }
  function deleteEmployee(id) {
    const admins = employees.filter(e => e.role === 'admin');
    const target = employees.find(e => e.id === id);
    if (target?.role === 'admin' && admins.length <= 1) { showToast('Tiene que quedar al menos un administrador'); return; }
    persistEmployees(employees.filter(e => e.id !== id));
  }

  // ---------- Cajón y formación ----------
  const [trainingMode, setTrainingMode] = useState(false);
  const [savedFloor, setSavedFloor] = useState(null);
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
      const tables = (floor?.tables || []).map(t => ({
        ...t, orderId: null, orderIds: [], status: 'libre', reserved: null, isFiado: false,
      }));
      const training = { ...clone(floor), tables, orders: {}, history: {} };
      setFloor(training);
      setTrainingMode(true);
      showToast('🎓 Modo formación activado — los tickets no afectan a facturación real');
    }
  }

  async function loadClockinSummary() {
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

  async function handleClockinAction(action) {
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

  function formatMinutes(mins) {
    if (!mins && mins !== 0) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }

  function openDrawer() {
    if (!isPrinterConnected()) { showToast('No hay impresora conectada'); return; }
    printESCPOS(escposOpenDrawer())
      .then(() => showToast('Cajón abierto'))
      .catch(() => showToast('No se pudo abrir el cajón'));
  }

  function handleDrawerAction() {
    const policy = ticketSettings.drawerOpenPolicy || 'confirm';
    if (policy === 'quick') { openDrawer(); }
    else if (policy === 'confirm') { setShowDrawerConfirm(true); }
    else if (policy === 'pin') { setDrawerPinInput(''); setShowDrawerPIN(true); }
  }

  // ---------- Factura ----------
  function printInvoice(sale) {
    if (!sale) return;
    const { restaurantName, footerText } = ticketSettings;
    const itemsHtml = (sale.items || []).filter(i => !i.voided).map(i =>
      `<tr><td style="padding:2px 0">${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${euros(i.price)}</td><td style="text-align:right">${euros((i.price || 0) * (i.qty || 0))}</td></tr>`
    ).join('');
    const html = `<html><head><meta charset="utf-8"><style>
      @page { margin:10mm; size: A4; }
      body { font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#222; padding:0; margin:0; }
      .h { text-align:center; margin-bottom:20px; }
      .h h1 { margin:0; font-size:22px; }
      .h p { margin:2px 0; font-size:11px; color:#555; }
      table { width:100%; border-collapse:collapse; margin:15px 0; }
      th { border-bottom:2px solid #222; padding:6px 4px; text-align:left; font-size:11px; }
      td { padding:4px; border-bottom:1px solid #ddd; font-size:11px; }
      .r { text-align:right; }
      .total td { border-top:2px solid #222; font-weight:bold; font-size:13px; }
      .f { margin-top:25px; font-size:10px; color:#888; text-align:center; }
      .meta { font-size:10px; color:#555; margin:10px 0; }
    </style></head><body>
      <div class="h">
        <h1>${restaurantName || 'FACTURA'}</h1>
        <p><strong>${sale.invoiceNumber || sale.id}</strong></p>
        <p>${new Date(sale.closedAt).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
      </div>
      <div class="meta">
        <p><strong>Cliente:</strong> ${sale.invoiceName || '—'}</p>
        <p><strong>NIF:</strong> ${sale.invoiceNif || '—'}</p>
        ${sale.invoiceAddress ? `<p><strong>Dirección:</strong> ${sale.invoiceAddress}</p>` : ''}
        <p><strong>Mesa:</strong> ${sale.tableName}</p>
      </div>
      <table>
        <tr><th>Artículo</th><th style="text-align:center">Ud.</th><th style="text-align:right">Precio</th><th style="text-align:right">Importe</th></tr>
        ${itemsHtml}
        <tr class="total"><td colspan="3">TOTAL</td><td class="r">${euros(sale.totalWithTip || sale.total || 0)}</td></tr>
      </table>
      ${sale.tip > 0 ? `<p style="font-size:10px;color:#888;text-align:right">Propina (NO fiscal): +${euros(sale.tip)}</p>` : ''}
      <div class="f">${footerText || 'Gracias por su visita'}</div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    else showToast('Permite ventanas emergentes para imprimir la factura');
  }

  // ---------- Devoluciones ----------
  function handleRefund(saleId, refund) {
    const next = clone(sales);
    const sale = next.find(s => s.id === saleId);
    if (!sale) return;
    if (!sale.refunds) sale.refunds = [];
    sale.refunds.push(refund);
    setSales(next);
    // Fire-and-forget persist
    fetch('/api/sales/refund', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleId, refund }),
    }).catch(() => showToast('No se pudo guardar la devolución'));
    showToast(`Devolución de ${euros(refund.amount)} registrada`);
  }

  // ---------- Pantallas de carga / error ----------
  if (loading) return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
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
    if (menuMode === 'menu') return (
      <MenuPrincipal
        employees={employees}
        onLoginClick={() => { setEntryPoint('entrada'); setMenuMode('login'); }}
        onAlmacenClick={() => { setEntryPoint('almacen'); setMenuMode('login'); }}
        onCajaClick={() => { setEntryPoint('caja'); setMenuMode('login'); }}
        onConfigClick={() => { setEntryPoint('config'); setMenuMode('login'); }}
        colors={C}
      />
    );
    if (menuMode === 'login') return (
      <LoginScreen
        employees={employees} loginSelected={loginSelected} setLoginSelected={setLoginSelected}
        pinInput={pinInput} setPinInput={setPinInput}
        onDigit={pressDigit} onDelete={deleteDigit}
        onBack={() => setMenuMode('menu')} colors={C}
      />
    );
  }

  const navItems = [
    { id: 'salon',      label: 'Salon',      icon: LayoutGrid,    adminOnly: false },
    { id: 'cocina',     label: 'Cocina',     icon: ChefHat,       adminOnly: false },
    { id: 'comandas',   label: 'Comandas',   icon: ClipboardList, adminOnly: false },
    { id: 'kds',        label: 'Cocina KDS',  icon: ChefHat,       adminOnly: false },
    { id: 'pedidos',    label: 'Pedidos',    icon: Undo2,         adminOnly: false },
    { id: 'inventario', label: 'Inventario', icon: Package,       adminOnly: true  },
    { id: 'carta',      label: 'Carta',      icon: ClipboardList, adminOnly: true  },
    { id: 'informes',   label: 'Informes',   icon: BarChart3,     adminOnly: true  },
    { id: 'empleados',  label: 'Equipo',     icon: Users,         adminOnly: true  },
    { id: 'ofertas',    label: 'Ofertas',    icon: Percent,       adminOnly: true  },
    { id: 'combos',     label: 'Combos',     icon: Package,       adminOnly: true  },
    { id: 'menus',      label: 'Menús',      icon: ChefHat,       adminOnly: true  },
    { id: 'carrusel',   label: 'Carrusel',   icon: Star,          adminOnly: true  },
    { id: 'precios',    label: 'Precios',    icon: Euro,          adminOnly: true  },
  { id: 'reparto',    label: 'Reparto',    icon: Truck,         adminOnly: true  },
  { id: 'gestoria',   label: 'Gestoria',   icon: FileText,      adminOnly: true  },
  { id: 'pairing',    label: 'Emparejar',  icon: Monitor,       adminOnly: true  },
  { id: 'audit',      label: 'Auditoria',  icon: ClipboardList, adminOnly: true  },
  { id: 'turnos',     label: 'Turnos',     icon: Calendar,      adminOnly: true  },
  { id: 'registro-horario', label: 'Reg. Horario', icon: Clock, adminOnly: true  },
  { id: 'solicitudes',  label: 'Solicitudes', icon: ClipboardList,  adminOnly: true  },
  { id: 'pedidos-compra', label: 'Pedidos Compra', icon: FileText, adminOnly: true },
  { id: 'produccion', label: 'Producción', icon: Package, adminOnly: true  },
  { id: 'reservas',   label: 'Reservas',   icon: Calendar,      adminOnly: true  },
  { id: 'waitlist',   label: 'Lista Espera', icon: Users,        adminOnly: true  },
  { id: 'onlineorders', label: 'Pedidos Online', icon: Truck,     adminOnly: true  },
].filter(item => !item.adminOnly || currentUser.role === 'admin');

  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex">

      {menuMode === 'app' && (
        <aside style={{ background: C.surface, borderRight: `1px solid ${C.line}`, width: '160px' }} className="flex flex-col shrink-0 no-print sticky top-0 h-screen">
          <div className="p-3 text-center" style={{ borderBottom: `1px solid ${C.line}` }}>
            <h2 className="font-display text-lg" style={{ color: C.brassLight }}>LA COMANDA</h2>
          </div>
          <nav className="flex flex-col gap-1 p-2 overflow-y-auto flex-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button key={item.id} onClick={() => setView(item.id)}
                  style={{
                    background: active ? C.surfaceLight : 'transparent',
                    color: active ? C.brassLight : C.muted,
                    borderLeft: active ? `3px solid ${C.brassLight}` : '3px solid transparent',
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90 text-left shrink-0"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'inventario' && lowStockProducts.length > 0 && (
                    <span style={{ background: C.wine }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{lowStockProducts.length}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      <div className="flex flex-col flex-1 min-w-0" style={{ maxHeight: '100vh', overflow: 'hidden' }}>

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
          {view === 'kds'        && <KDSView floor={floor} catalog={catalog} onReady={markReady} onUpdateItemState={updateItemState} onAdvanceOrder={advanceOrder} onAgotar={agotarProducto} onReprint={reprintKitchenTicket} colors={C} />}
          {view === 'comandas'   && <ComandasAbiertasView floor={floor} colors={C} />}
          {view === 'inventario' && <InventarioView catalog={catalog} colors={C} onUpdateField={updateProductField} newProductOpen={newProductOpen} setNewProductOpen={setNewProductOpen} onAddProduct={addProduct} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />}
          {view === 'carta' && (
            <CartasView
              catalog={catalog}
              onSave={async (next) => {
                const { categories, products, combos } = next;
                await saveCatalog({ categories, products, combos: combos || catalog.combos || [] });
                setCatalog(next);
              }}
              onUpdateField={updateProductField}
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
              onSave={async (next) => { setOffers(next); await saveOffers(next).catch(() => showToast('No se pudieron guardar las ofertas')); }}
              colors={C}
            />
          )}
          {view === 'combos' && (
            <CombosPanel
              combos={combos} catalog={catalog}
              onSave={async (next) => { setCombos(next); await saveCombos(next).catch(() => showToast('No se pudieron guardar los combos')); }}
              colors={C}
            />
          )}
          {view === 'menus' && (
            <MenusDelDiaPanel
              mealMenus={catalog?.mealMenus || []} catalog={catalog}
              onSave={async (next) => { await saveMealMenus(next).catch(() => showToast('No se pudieron guardar los menús')); setCatalog(prev => ({ ...prev, mealMenus: next })); }}
              colors={C}
            />
          )}
          {view === 'carrusel' && (
            <CarruselPanel
              catalog={catalog}
              onSave={async (data) => {
                await fetch('/api/catalog', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'reorder-carousel', data }),
                }).catch(() => showToast('No se pudo guardar el carrusel'));
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
                await savePriceRules(rules).catch(() => showToast('No se pudieron guardar las reglas'));
                setCatalog(prev => ({ ...prev, priceRules: rules }));
              }}
              colors={C}
            />
          )}
          {view === 'reparto'    && <DeliveryView catalog={catalog} colors={C} />}
          {view === 'pedidos'    && <PedidosView sales={sales} onRefund={handleRefund} onPrintInvoice={(sale) => { printInvoice(sale); }} colors={C} />}
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
          onSendToKitchenCourse={sendToKitchenCourse} onToggleCuenta={toggleCuenta}
          onOpenPayment={() => { setPaymentSplits([]); setTipAmount(0); setTipMethod('efectivo'); setInvoiceNif(''); setInvoiceName(''); setInvoiceAddress(''); setInvoiceEmail(''); setPaying(true); }}
          onResetTable={() => {
            const next = clone(floor);
            const table = next.tables.find(t => t.id === selectedTableId);
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
          onSetItemPrice={setItemPrice}
          onVoidSentItem={voidSentItem}
          onApplyPersonalDiscount={applyPersonalDiscount}
          onRemovePersonalDiscount={removePersonalDiscount}
          employees={employees}
          ticketSettings={ticketSettings}
          floor={floor}
          onMoveTable={moveTable}
          onMergeTables={mergeTables}
          currentTableId={selectedTableId}
          activeTicketId={activeTicketId}
          onSwitchTicket={(tid, oid) => setActiveTicketId(oid)}
          onCreateTicket={createNewTicket}
          onDeleteEmptyTicket={deleteEmptyTicket}
          onRenameTicket={(oid, label) => renameTicket(selectedTableId, oid, label)}
          onLinkCustomer={(oid, customer) => linkCustomer(oid, customer)}
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
          <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="w-full max-w-sm rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-4" style={{ color: C.cream }}>Configuración</p>
            <div className="flex flex-col gap-3">
              {['restaurantName', 'logoUrl', 'footerText', 'ticketWidth'].map(field => (
                <div key={field}>
                  <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">
                    {field === 'restaurantName' ? 'Nombre del restaurante' : field === 'logoUrl' ? 'URL del logo' : field === 'footerText' ? 'Texto del pie' : 'Ancho del ticket'}
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
                let rates = {};
                try { rates = typeof raw === 'string' ? JSON.parse(raw) : raw || {}; }
                catch { rates = {}; }
                const cats = catalog?.categories?.map(c => typeof c === 'string' ? c : c.name) || [];
                const allKeys = [...new Set([...cats, ...Object.keys(rates)])];
                return allKeys.map(catName => (
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
                onClick={() => {
                  saveSettings(ticketSettings).catch(() => showToast('No se pudo guardar la configuración'));
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
                    {clockinSummary.pausas?.filter(p => !p.end).length > 0 && <div className="flex justify-between text-xs"><span style={{ color: C.muted }}>En pausa</span><span className="font-mono" style={{ color: C.brassLight }}>desde {new Date(clockinSummary.pausas.find(p => !p.end).start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span></div>}
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
              {[1,2,3,4,5,6,7,8,9].map(n => (
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
              <button onClick={() => {
                const admin = employees.find(e => e.role === 'admin' && e.pin === drawerPinInput);
                if (!admin) { showToast('PIN de administrador incorrecto'); setDrawerPinInput(''); return; }
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
        navItems={navItems}
        floor={floor}
        onSelectTable={(id) => { setSelectedTableId(id); setActiveCategory('Todos'); }}
        onNavigate={(id) => { setView(id); }}
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
