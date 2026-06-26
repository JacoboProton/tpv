"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  LayoutGrid, ChefHat, Package, BarChart3, AlertTriangle,
  LogOut, Users, ShieldCheck, Sun, Moon, ClipboardList, WifiOff, Printer, Settings, Percent, Truck,
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
import { fetchSettings, saveSettings, fetchOffers, saveOffers } from '../lib/api';
import { ALLERGENS } from '../components/constants';
import { playKitchenAlert, showKitchenNotification, requestNotificationPermission, playBeep } from '../lib/sound';

import MenuPrincipal        from '../components/MenuPrincipal';
import LoginScreen          from '../components/LoginScreen';
import SalonView            from '../components/SalonView';
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
import DeliveryView         from '../components/DeliveryView';

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

  // Navegacion
  const [view, setView]                         = useState('salon');
  const [almacenUbicacion, setAlmacenUbicacion] = useState(null);

  // Comanda / pago
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [activeCategory, setActiveCategory]   = useState('Todos');
  const [paying, setPaying]                   = useState(false);
  const [paymentSplits, setPaymentSplits]     = useState([]);
  const [orderDiscount, setOrderDiscount]     = useState(0);
  const [tipAmount, setTipAmount]             = useState(0);

  // UI auxiliar
  const [toast, setToast]                     = useState(null);
  const [newProductOpen, setNewProductOpen]   = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Offline
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const [pendingMutations, setPendingMutations] = useState(0);

  // Modificadores
  const [modifierData, setModifierData] = useState({ groups: [], productModifiers: {} });
  const [showModifierSelector, setShowModifierSelector] = useState(null);

  // Configuración ticket
  const [ticketSettings, setTicketSettings] = useState({
    restaurantName: 'LA COMANDA', logoUrl: '', footerText: 'Gracias por su visita', ticketWidth: '80mm',
  });
  const [showSettings, setShowSettings] = useState(false);

  // Ofertas
  const [offers, setOffers] = useState([]);

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

        if (!cat.products || cat.products.length === 0) {
          const seed = seedCatalog();
          await saveCatalog(seed);
          setCatalog(seed);
        } else {
          setCatalog(cat);
        }

        if (!flr.tables || flr.tables.length === 0) {
          const seed = seedFloor();
          await saveFloor(seed);
          setFloor(seed);
        } else {
          setFloor(flr);
        }

        if (!emps || emps.length === 0) {
          const seed = seedEmployees();
          await saveEmployees(seed);
          setEmployees(seed);
        } else {
          setEmployees(emps);
        }

        setSales(sls);

        const stg = await fetchSettings().catch(() => null);
        if (stg) setTicketSettings(stg);
        const off = await fetchOffers().catch(() => []);
        setOffers(off);
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

  // ---------- Persistencia → Neon ----------
  async function persistCatalog(next) {
    setCatalog(next);
    try { await saveCatalog(next); }
    catch { showToast('No se ha podido guardar el catalogo'); }
  }
  async function persistFloor(next) {
    setFloor(next);
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
  const selectedOrder = selectedTable?.orderId ? floor.orders[selectedTable.orderId] : null;

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
    const p = catalog?.products?.find(pr => pr.id === i.productId);
    const disc = p?.discount || 0;
    return s + i.price * (1 - disc / 100) * i.qty;
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

  // Elimina una línea del ticket (incluidas las ya enviadas a cocina)
  function removeItem(itemId) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    order.items = order.items.filter(i => i.id !== itemId);
    if (order.items.length === 0) {
      delete next.orders[table.orderId];
      table.orderId = null;
      table.status  = 'libre';
    }
    persistFloor(next);
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

    const sale = {
      id: 's_' + Date.now(), tableId: table.id, tableName: table.name,
      items: order.items.filter(i => i.productId).map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal, discount: orderDiscount, discountAmount, total, tip: tipAmount, totalWithTip,
      payments: isFiado ? [{ method: 'fiado', amount: totalWithTip }] : payments,
      paymentMethod: methodLabel, isFiado, isDebtPayment: wasDebt,
      offerDiscount: offerDiscountAmount,
      employeeId: currentUser?.id || null, employeeName: currentUser?.name || 'Sin asignar',
      closedAt: Date.now(),
    };

    delete nextFloor.orders[table.orderId];
    table.orderId = null; table.status = 'libre'; table.isFiado = false;

    persistFloor(nextFloor);
    persistCatalog(nextCatalog);
    persistSales([...sales, sale]);

    // Auto-registrar en Verifactu (fire-and-forget)
    registerVerifactu(sale.id, sale).catch(err => console.warn('Verifactu:', err));

    setPaying(false); setPaymentSplits([]); setOrderDiscount(0); setTipAmount(0); setSelectedTableId(null);

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
    addItemWithPrice(product, modifiers, extraPrice);
  }

  function addItemWithPrice(product, modifiers, extraPrice) {
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
  function addItem(product) { handleAddItemWithModifiers(product); }

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
  ${tipAmount > 0 ? `<div class="r" style="font-size:9px;color:#777"><span>Propina</span><span>+${euros(tipAmount)}</span></div>` : ''}
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
    { id: 'inventario', label: 'Inventario', icon: Package,       adminOnly: true  },
    { id: 'informes',   label: 'Informes',   icon: BarChart3,     adminOnly: true  },
    { id: 'empleados',  label: 'Equipo',     icon: Users,         adminOnly: true  },
    { id: 'ofertas',    label: 'Ofertas',    icon: Percent,       adminOnly: true  },
    { id: 'reparto',    label: 'Reparto',    icon: Truck,         adminOnly: true  },
  ].filter(item => !item.adminOnly || currentUser.role === 'admin');

  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }}>

      {isOffline && (
        <div style={{ background: C.wine, color: C.cream }} className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium no-print">
          <WifiOff className="w-3.5 h-3.5" /> Sin conexión — los cambios se guardarán cuando vuelva la red
          {pendingMutations > 0 && <span className="ml-1">({pendingMutations} pendientes)</span>}
        </div>
      )}

      <header style={{ borderBottom: `1px solid ${C.line}`, background: C.base }} className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between gap-2 no-print">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-2xl sm:text-3xl" style={{ color: C.brassLight }}>LA COMANDA</h1>
          <span style={{ color: C.muted }} className="text-xs hidden sm:inline">TPV de sala</span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id)}
                style={{ background: active ? C.surfaceLight : 'transparent', color: active ? C.brassLight : C.muted }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 shrink-0"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.id === 'inventario' && lowStockProducts.length > 0 && (
                  <span style={{ background: C.wine }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center">{lowStockProducts.length}</span>
                )}
              </button>
            );
          })}
          <div style={{ borderLeft: `1px solid ${C.line}` }} className="flex items-center gap-2 pl-2 ml-1 shrink-0">
            <button onClick={handlePrint} title="Imprimir ticket" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
              <Printer className="w-4 h-4" />
            </button>
            {currentUser?.role === 'admin' && (
              <button onClick={() => setShowSettings(true)} title="Configurar ticket" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
                <Settings className="w-4 h-4" />
              </button>
            )}
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

      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <div className="fade-up" key={view}>
          {view === 'salon'      && <SalonView floor={floor} onSelect={id => { setSelectedTableId(id); setActiveCategory('Todos'); }} persistFloor={persistFloor} colors={C} />}
          {view === 'cocina'     && <CocinaView floor={floor} onReady={markReady} colors={C} />}
          {view === 'comandas'   && <ComandasAbiertasView floor={floor} colors={C} />}
          {view === 'inventario' && <InventarioView catalog={catalog} colors={C} onUpdateField={updateProductField} newProductOpen={newProductOpen} setNewProductOpen={setNewProductOpen} onAddProduct={addProduct} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />}
          {view === 'almacen'    && (almacenUbicacion
            ? <AlmacenDetalleView catalog={catalog} ubicacion={almacenUbicacion} onBack={() => setAlmacenUbicacion(null)} colors={C} onUpdateField={updateProductField} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />
            : <AlmacenMenuView catalog={catalog} onSelectUbicacion={setAlmacenUbicacion} colors={C} />
          )}
          {view === 'informes'   && <InformesView sales={sales} colors={C} />}
          {view === 'ofertas'   && (
            <OfertasPanel
              offers={offers} catalog={catalog}
              onSave={async (next) => { setOffers(next); await saveOffers(next).catch(() => showToast('No se pudieron guardar las ofertas')); }}
              colors={C}
            />
          )}
          {view === 'reparto'    && <DeliveryView catalog={catalog} colors={C} />}
          {view === 'empleados'  && <EmpleadosView employees={employees} colors={C} onAdd={addEmployee} onUpdateField={updateEmployeeField} onDelete={deleteEmployee} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />}
        </div>
      </main>

      {selectedTable && (
        <ComandaDrawer
          selectedTable={selectedTable} selectedOrder={selectedOrder}
          catalog={catalog} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
          orderTotal={orderTotal} orderDiscount={orderDiscount} setOrderDiscount={setOrderDiscount}
          tipAmount={tipAmount} finalTotal={finalTotal}
          onClose={() => setSelectedTableId(null)}
          onAddItem={addItem} onChangeQty={changeQty}
          onRemoveItem={removeItem}
          onCancelTable={cancelTable}
          onSendToKitchenCourse={sendToKitchenCourse} onToggleCuenta={toggleCuenta}
          onOpenPayment={() => { setPaymentSplits([]); setTipAmount(0); setPaying(true); }}
          onResetTable={() => {
            const next = clone(floor);
            const table = next.tables.find(t => t.id === selectedTableId);
            table.status = 'libre';
            table.orderId = null;
            persistFloor(next);
            setSelectedTableId(null);
          }}
          onUpdateNotes={updateItemNotes}
          colors={C}
        />
      )}

      {paying && selectedOrder && (
        <PaymentModal
          selectedTable={selectedTable}
          currentUser={currentUser}
          finalTotal={finalTotal}
          orderDiscount={orderDiscount} tipAmount={tipAmount} setTipAmount={setTipAmount}
          paymentSplits={paymentSplits} remaining={remaining} canConfirm={canConfirm}
          onAddSplit={addSplit} onUpdateSplitAmount={updateSplitAmount} onRemoveSplit={removeSplit}
          onToggleSplitItem={toggleSplitItem}
          onConfirm={closeBill}
          onCancel={() => { setPaying(false); setPaymentSplits([]); setTipAmount(0); }}
          onPrint={handlePrint}
          showToast={showToast}
          orderItems={selectedOrder?.items || []}
          colors={C}
        />
      )}

      {showModifierSelector && (
        <ModifierSelector
          product={showModifierSelector.product}
          modifierGroups={showModifierSelector.groups}
          onConfirm={confirmModifiersAndAdd}
          onCancel={() => setShowModifierSelector(null)}
          colors={C}
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
            <p className="font-display text-lg mb-4" style={{ color: C.cream }}>Configurar ticket</p>
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
    </div>
  );
}
