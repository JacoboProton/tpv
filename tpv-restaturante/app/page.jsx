"use client"

import { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid, ChefHat, Package, BarChart3, AlertTriangle,
  LogOut, Users, ShieldCheck,
} from 'lucide-react';

import { C, seedCatalog, seedFloor, seedEmployees, euros, round2, clone } from './components/constants';
import {
  runMigrate, fetchCatalog, saveCatalog,
  fetchFloor, saveFloor,
  fetchSales, addSale,
  fetchEmployees, saveEmployees,
  logAccess,
  registerVerifactu,
} from '../lib/api';

import MenuPrincipal      from './components/MenuPrincipal';
import LoginScreen        from './components/LoginScreen';
import SalonView          from './components/SalonView';
import CocinaView         from './components/CocinaView';
import InventarioView     from './components/InventarioView';
import AlmacenMenuView    from './components/AlmacenMenuView';
import AlmacenDetalleView from './components/AlmacenDetalleView';
import InformesView       from './components/InformesView';
import EmpleadosView      from './components/EmpleadosView';
import ComandaDrawer      from './components/ComandaDrawer';
import PaymentModal       from './components/PaymentModal';

export default function App() {
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
        // 1. Crear tablas si no existen
        await runMigrate();

        // 2. Cargar datos en paralelo
        const [cat, flr, sls, emps] = await Promise.all([
          fetchCatalog(),
          fetchFloor(),
          fetchSales(),
          fetchEmployees(),
        ]);

        // 3. Si la BD esta vacia, cargar datos semilla
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
      } catch (err) {
        console.error('Error cargando datos:', err);
        setFatalError(true);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

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
  async function persistSales(next) {
    // next es [...sales, nuevaVenta]; solo enviamos la ultima (POST individual)
    setSales(next);
    try { await addSale(next[next.length - 1]); }
    catch { showToast('No se ha podido guardar la venta'); }
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
    setCurrentUser(null); setLoginSelected(null); setPinInput('');
    setSelectedTableId(null); setView('salon'); setMenuMode('menu');
  }

  // ---------- Mesa seleccionada ----------
  const selectedTable = floor ? floor.tables.find(t => t.id === selectedTableId) : null;
  const selectedOrder = selectedTable?.orderId ? floor.orders[selectedTable.orderId] : null;

  // Crear orden de deuda si la mesa esta en fiado sin orden activa
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
      items: [{ id: 'debt_item', productId: null, name: 'Deuda fiada', price: lastFiadoSale.totalWithTip, qty: 1, sent: true, ready: true }],
      createdAt: Date.now(), employeeName: 'Deuda anterior',
    };
    table.orderId = debtOrderId;
    persistFloor(nextFloor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId, currentUser]);

  const orderTotal      = selectedOrder ? selectedOrder.items.reduce((s, i) => s + i.price * i.qty, 0) : 0;
  const discountedTotal = round2(orderTotal * (1 - orderDiscount / 100));
  const finalTotal      = round2(discountedTotal + tipAmount);
  const hasUnsent       = selectedOrder ? selectedOrder.items.some(i => !i.sent) : false;
  const splitsUsed      = round2(paymentSplits.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const remaining       = round2(finalTotal - splitsUsed);
  const canConfirm      = paymentSplits.length > 0 && Math.abs(remaining) < 0.005;

  // ---------- Acciones de comanda ----------
  function addItem(product) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    let order;
    if (!table.orderId) {
      const orderId = 'o_' + Date.now();
      order = { id: orderId, tableId: table.id, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '-' };
      next.orders[orderId] = order;
      table.orderId = orderId;
      table.status = 'ocupada';
    } else {
      order = next.orders[table.orderId];
    }
    const existing = order.items.find(i => i.productId === product.id && !i.sent);
    if (existing) existing.qty += 1;
    else order.items.push({ id: 'i_' + Date.now() + Math.random().toString(16).slice(2), productId: product.id, name: product.name, price: product.price, qty: 1, sent: false, ready: false });
    persistFloor(next);
  }

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

  function sendToKitchen() {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    const order = next.orders[table.orderId];
    let count = 0;
    order.items.forEach(i => { if (!i.sent) { i.sent = true; i.sentAt = Date.now(); count++; } });
    persistFloor(next);
    if (count) showToast(`Comanda enviada a cocina (${count} ${count === 1 ? 'linea' : 'lineas'})`);
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
    // Si ya no quedan ítems, liberar la mesa
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
      delete next.orders[table.orderId];
      table.orderId = null;
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
      setPaymentSplits(prev => [...prev.filter(p => p.method !== 'fiado'), { id: 'sp_' + Date.now(), method, amount: rem }]);
    }
  }
  function updateSplitAmount(id, value) {
    const amount = value === '' ? 0 : Math.max(0, parseFloat(value));
    setPaymentSplits(prev => prev.map(p => p.id === id ? { ...p, amount: isNaN(amount) ? 0 : amount } : p));
  }
  function removeSplit(id) { setPaymentSplits(prev => prev.filter(p => p.id !== id)); }

  function closeBill() {
    const nextFloor   = clone(floor);
    const table       = nextFloor.tables.find(t => t.id === selectedTableId);
    const order       = nextFloor.orders[table.orderId];
    const wasDebt     = table.isFiado && order.items.length === 1 && order.items[0].productId === null;
    const nextCatalog = clone(catalog);
    order.items.forEach(item => {
      if (item.productId) {
        const p = nextCatalog.products.find(p => p.id === item.productId);
        if (p) p.stock = Math.max(0, p.stock - item.qty);
      }
    });
    const subtotal       = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmount = round2(subtotal * (orderDiscount / 100));
    const total          = round2(subtotal - discountAmount);
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
    showToast(
      wasDebt ? `Deuda pagada: ${euros(totalWithTip)}${discStr}${tipStr}`
      : isFiado ? `Fiado: ${euros(totalWithTip)}${discStr}${tipStr}`
      : `Cobrado: ${euros(totalWithTip)}${discStr}${tipStr}`
    );
  }

  // ---------- Catalogo ----------
  function addProduct(p) {
    const next = clone(catalog);
    next.products.push({ id: 'p_' + Date.now(), name: p.name, category: p.category, price: Number(p.price), stock: Number(p.stock), lowStock: Number(p.lowStock), ubicacion: p.ubicacion || 'Bar' });
    if (!next.categories.includes(p.category)) next.categories.push(p.category);
    persistCatalog(next); setNewProductOpen(false);
  }
  function updateProductField(id, field, value) {
    const next = clone(catalog);
    const p = next.products.find(p => p.id === id);
    p[field] = (field === 'name' || field === 'category' || field === 'ubicacion') ? value : Number(value);
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
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div style={{ borderColor: C.brass, borderTopColor: 'transparent' }} className="w-10 h-10 rounded-full border-4 animate-spin" />
        <p style={{ color: C.muted }} className="text-sm">Conectando con la base de datos...</p>
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
    { id: 'salon',      label: 'Salon',      icon: LayoutGrid, adminOnly: false },
    { id: 'cocina',     label: 'Cocina',     icon: ChefHat,    adminOnly: false },
    { id: 'inventario', label: 'Inventario', icon: Package,    adminOnly: true  },
    { id: 'informes',   label: 'Informes',   icon: BarChart3,  adminOnly: true  },
    { id: 'empleados',  label: 'Equipo',     icon: Users,      adminOnly: true  },
  ].filter(item => !item.adminOnly || currentUser.role === 'admin');

  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        .font-mono    { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(200,147,43,0)} 50%{box-shadow:0 0 0 5px rgba(200,147,43,0.25)} }
        .pulse-cuenta { animation: pulseRing 1.8s ease-in-out infinite; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .25s ease-out; }
        input[type=number]::-webkit-inner-spin-button { opacity:1; }
        @keyframes shake { 10%,90%{transform:translateX(-1px)} 20%,80%{transform:translateX(2px)} 30%,50%,70%{transform:translateX(-4px)} 40%,60%{transform:translateX(4px)} }
        .shake { animation: shake .4s; }
        @media print {
          body * { visibility:hidden; }
          #printable-report, #printable-report * { visibility:visible; }
          #printable-report { position:absolute;left:0;top:0;width:100%;background:#fff !important;color:#000 !important;padding:0; }
          .no-print { display:none !important; }
        }
      `}</style>

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
        {view === 'salon'      && <SalonView floor={floor} onSelect={id => { setSelectedTableId(id); setActiveCategory('Todos'); }} persistFloor={persistFloor} colors={C} />}
        {view === 'cocina'     && <CocinaView floor={floor} onReady={markReady} colors={C} />}
        {view === 'inventario' && <InventarioView catalog={catalog} colors={C} onUpdateField={updateProductField} newProductOpen={newProductOpen} setNewProductOpen={setNewProductOpen} onAddProduct={addProduct} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />}
        {view === 'almacen'    && (almacenUbicacion
          ? <AlmacenDetalleView catalog={catalog} ubicacion={almacenUbicacion} onBack={() => setAlmacenUbicacion(null)} colors={C} onUpdateField={updateProductField} newProductOpen={newProductOpen} setNewProductOpen={setNewProductOpen} onAddProduct={addProduct} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} onDelete={deleteProduct} />
          : <AlmacenMenuView catalog={catalog} onSelectUbicacion={setAlmacenUbicacion} colors={C} />
        )}
        {view === 'informes'   && <InformesView sales={sales} employees={employees} colors={C} />}
        {view === 'empleados'  && <EmpleadosView employees={employees} colors={C} onAdd={addEmployee} onUpdateField={updateEmployeeField} onDelete={deleteEmployee} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />}
      </main>

      {selectedTable && (
        <ComandaDrawer
          selectedTable={selectedTable} selectedOrder={selectedOrder}
          catalog={catalog} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
          orderTotal={orderTotal} orderDiscount={orderDiscount} setOrderDiscount={setOrderDiscount}
          tipAmount={tipAmount} finalTotal={finalTotal} hasUnsent={hasUnsent}
          onClose={() => setSelectedTableId(null)}
          onAddItem={addItem} onChangeQty={changeQty}
          onRemoveItem={removeItem}
          onCancelTable={cancelTable}
          onSendToKitchen={sendToKitchen} onToggleCuenta={toggleCuenta}
          onOpenPayment={() => { setPaymentSplits([]); setTipAmount(0); setPaying(true); }}
          onResetTable={() => {
            const next = clone(floor);
            const table = next.tables.find(t => t.id === selectedTableId);
            table.status = 'libre';
            table.orderId = null;
            persistFloor(next);
            setSelectedTableId(null);
          }}
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
          onConfirm={closeBill}
          onCancel={() => { setPaying(false); setPaymentSplits([]); setTipAmount(0); }}
          showToast={showToast} colors={C}
        />
      )}

      {toast && (
        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }} className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm shadow-lg z-50 fade-up no-print">
          {toast}
        </div>
      )}
    </div>
  );
}
