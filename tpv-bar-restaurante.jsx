import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid, ChefHat, Package, BarChart3, Plus, Minus, X, Check,
  CreditCard, Banknote, Smartphone, ArrowLeft, AlertTriangle, Trash2, Receipt, Clock,
  LogOut, User, Users, ShieldCheck, Download, Printer, Delete, Percent, TrendingUp, 
  Calendar, DollarSign
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from 'recharts';

// ---------- Paleta de marca: "La Comanda" ----------
const C = {
  base: '#1C1714',
  surface: '#272019',
  surfaceLight: '#332A20',
  line: '#46392B',
  brass: '#C8932B',
  brassLight: '#E3B563',
  sage: '#6F9272',
  sageLight: '#8FB293',
  wine: '#A23E3E',
  wineLight: '#C25A5A',
  cream: '#F3ECDF',
  muted: '#AE9F8C',
};

const KEYS = { CATALOG: 'tpv:catalog', FLOOR: 'tpv:floor', SALES: 'tpv:sales', EMPLOYEES: 'tpv:employees' };

const TICKET_EDGE = {
  height: 9,
  background: C.cream,
  clipPath:
    'polygon(0% 9px,4% 0%,8% 9px,12% 0%,16% 9px,20% 0%,24% 9px,28% 0%,32% 9px,36% 0%,40% 9px,44% 0%,48% 9px,52% 0%,56% 9px,60% 0%,64% 9px,68% 0%,72% 9px,76% 0%,80% 9px,84% 0%,88% 9px,92% 0%,96% 9px,100% 0%,100% 100%,0% 100%)',
};

function seedCatalog() {
  const categories = ['Bebidas', 'Tapas', 'Principales', 'Postres'];
  const products = [
    { id: 'p1', name: 'Caña', category: 'Bebidas', price: 2.2, stock: 80, lowStock: 15, ubicacion: 'Bar' },
    { id: 'p2', name: 'Tinto de verano', category: 'Bebidas', price: 2.8, stock: 40, lowStock: 10, ubicacion: 'Bar' },
    { id: 'p3', name: 'Vermut', category: 'Bebidas', price: 3.2, stock: 25, lowStock: 8, ubicacion: 'Bar' },
    { id: 'p4', name: 'Copa de vino', category: 'Bebidas', price: 3.5, stock: 30, lowStock: 8, ubicacion: 'Bar' },
    { id: 'p5', name: 'Agua', category: 'Bebidas', price: 1.5, stock: 60, lowStock: 12, ubicacion: 'Bar' },
    { id: 'p6', name: 'Refresco', category: 'Bebidas', price: 2.5, stock: 50, lowStock: 12, ubicacion: 'Bar' },
    { id: 'p7', name: 'Patatas bravas', category: 'Tapas', price: 5.5, stock: 30, lowStock: 8, ubicacion: 'Cocina' },
    { id: 'p8', name: 'Croquetas (6u)', category: 'Tapas', price: 6.5, stock: 24, lowStock: 6, ubicacion: 'Cocina' },
    { id: 'p9', name: 'Calamares', category: 'Tapas', price: 8.5, stock: 20, lowStock: 6, ubicacion: 'Cocina' },
    { id: 'p10', name: 'Jamón ibérico', category: 'Tapas', price: 12.0, stock: 15, lowStock: 4, ubicacion: 'Cocina' },
    { id: 'p11', name: 'Pimientos de padrón', category: 'Tapas', price: 6.0, stock: 18, lowStock: 5, ubicacion: 'Cocina' },
    { id: 'p12', name: 'Hamburguesa', category: 'Principales', price: 11.5, stock: 20, lowStock: 5, ubicacion: 'Cocina' },
    { id: 'p13', name: 'Entrecot', category: 'Principales', price: 16.0, stock: 12, lowStock: 4, ubicacion: 'Cocina' },
    { id: 'p14', name: 'Paella (ración)', category: 'Principales', price: 13.5, stock: 10, lowStock: 3, ubicacion: 'Cocina' },
    { id: 'p15', name: 'Tarta de queso', category: 'Postres', price: 4.5, stock: 14, lowStock: 4, ubicacion: 'Almacén' },
    { id: 'p16', name: 'Flan', category: 'Postres', price: 3.5, stock: 16, lowStock: 4, ubicacion: 'Almacén' },
  ];
  return { categories, products };
}

function seedFloor() {
  const tables = [
    ...Array.from({ length: 8 }, (_, i) => ({ id: `t${i + 1}`, name: `Mesa ${i + 1}`, status: 'libre', orderId: null, reserved: null, isFiado: false })),
    { id: 't9', name: 'Barra 1', status: 'libre', orderId: null, reserved: null, isFiado: false },
    { id: 't10', name: 'Barra 2', status: 'libre', orderId: null, reserved: null, isFiado: false },
  ];
  return { tables, orders: {} };
}

function seedEmployees() {
  return [
    { id: 'e_admin', name: 'Administrador', pin: '1234', role: 'admin' },
    { id: 'e_1', name: 'Ana', pin: '1111', role: 'camarero' },
    { id: 'e_2', name: 'Luis', pin: '2222', role: 'camarero' },
  ];
}

function euros(n) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'bizum', label: 'Bizum', icon: Smartphone },
  { id: 'fiado', label: 'Fiado', icon: Clock },
];

function clone(obj) {
  return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [floor, setFloor] = useState(null);
  const [sales, setSales] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginSelected, setLoginSelected] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [view, setView] = useState('salon');
  const [menuMode, setMenuMode] = useState('menu'); // 'menu', 'login', 'app'
  const [entryPoint, setEntryPoint] = useState('entrada'); // 'entrada', 'almacen', 'caja', 'config'
  const [almacenUbicacion, setAlmacenUbicacion] = useState(null); // null = mostrar menu, 'Bar'/'Cocina'/'Almacén' = mostrar stock
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [paying, setPaying] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [showReservation, setShowReservation] = useState(false);
  const [reservationForm, setReservationForm] = useState({ name: '', time: '' });
  const [cashControl, setCashControl] = useState({ expectedTotal: 0, realCount: 0 });
  const [toast, setToast] = useState(null);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      let cat;
      try {
        const r = await window.storage.get(KEYS.CATALOG, true);
        cat = JSON.parse(r.value);
      } catch {
        cat = seedCatalog();
        await window.storage.set(KEYS.CATALOG, JSON.stringify(cat), true);
      }
      let flr;
      try {
        const r = await window.storage.get(KEYS.FLOOR, true);
        flr = JSON.parse(r.value);
      } catch {
        flr = seedFloor();
        await window.storage.set(KEYS.FLOOR, JSON.stringify(flr), true);
      }
      let sls;
      try {
        const r = await window.storage.get(KEYS.SALES, true);
        sls = JSON.parse(r.value);
      } catch {
        sls = [];
        await window.storage.set(KEYS.SALES, JSON.stringify(sls), true);
      }
      let emps;
      try {
        const r = await window.storage.get(KEYS.EMPLOYEES, true);
        emps = JSON.parse(r.value);
      } catch {
        emps = seedEmployees();
        await window.storage.set(KEYS.EMPLOYEES, JSON.stringify(emps), true);
      }
      setCatalog(cat);
      setFloor(flr);
      setSales(sls);
      setEmployees(emps);
    } catch (e) {
      setFatalError(true);
    }
    setLoading(false);
  }

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__tpvToastTimer);
    window.__tpvToastTimer = window.setTimeout(() => setToast(null), 2600);
  }

  async function persistCatalog(next) {
    setCatalog(next);
    try { await window.storage.set(KEYS.CATALOG, JSON.stringify(next), true); }
    catch { showToast('No se ha podido guardar el catálogo'); }
  }
  async function persistFloor(next) {
    setFloor(next);
    try { await window.storage.set(KEYS.FLOOR, JSON.stringify(next), true); }
    catch { showToast('No se ha podido guardar la sala'); }
  }
  async function persistSales(next) {
    setSales(next);
    try { await window.storage.set(KEYS.SALES, JSON.stringify(next), true); }
    catch { showToast('No se ha podido guardar la venta'); }
  }
  async function persistEmployees(next) {
    setEmployees(next);
    try { await window.storage.set(KEYS.EMPLOYEES, JSON.stringify(next), true); }
    catch { showToast('No se ha podido guardar el equipo'); }
  }

  const lowStockProducts = useMemo(
    () => (catalog ? catalog.products.filter(p => p.stock <= p.lowStock) : []),
    [catalog]
  );

  function pressDigit(d) {
    if (pinInput.length >= 4) return;
    const next = pinInput + d;
    setPinInput(next);
    if (next.length === 4) {
      if (loginSelected.pin === next) {
        setCurrentUser(loginSelected);
        setLoginSelected(null);
        setPinInput('');
        
        // Ir a la vista correcta según el punto de entrada
        if (entryPoint === 'almacen') {
          if (loginSelected.role !== 'admin') {
            showToast('Solo administradores pueden acceder al almacén');
            setCurrentUser(null);
            return;
          }
          setView('almacen');
          setAlmacenUbicacion(null); // Mostrar el menú de ubicaciones
        } else if (entryPoint === 'caja') {
          if (loginSelected.role !== 'admin') {
            showToast('Solo administradores pueden acceder a la caja');
            setCurrentUser(null);
            return;
          }
          setView('informes');
        } else if (entryPoint === 'config') {
          if (loginSelected.role !== 'admin') {
            showToast('Solo administradores pueden acceder a configuración');
            setCurrentUser(null);
            return;
          }
          setView('empleados');
        } else {
          // entrada normal
          setView('salon');
        }
        setMenuMode('app');
      } else {
        showToast('PIN incorrecto');
        setTimeout(() => setPinInput(''), 300);
      }
    }
  }
  function deleteDigit() { setPinInput(pinInput.slice(0, -1)); }
  function logout() {
    setCurrentUser(null);
    setLoginSelected(null);
    setPinInput('');
    setSelectedTableId(null);
    setView('salon');
    setMenuMode('menu');
  }

  const selectedTable = floor ? floor.tables.find(t => t.id === selectedTableId) : null;
  const selectedOrder = selectedTable?.orderId ? floor.orders[selectedTable.orderId] : null;
  
  // Si la mesa está marcada como fiado pero sin orden, crear una orden de deuda
  useEffect(() => {
    if (selectedTable && selectedTable.isFiado && !selectedTable.orderId && !selectedOrder && currentUser) {
      // Buscar la última venta fiada de esta mesa
      const lastFiadoSale = sales
        .filter(s => s.tableId === selectedTableId && s.isFiado)
        .sort((a, b) => b.closedAt - a.closedAt)[0];
      
      if (lastFiadoSale) {
        // Crear una orden temporal para mostrar la deuda
        const nextFloor = clone(floor);
        const table = nextFloor.tables.find(t => t.id === selectedTableId);
        const debtOrderId = 'debt_' + Date.now();
        nextFloor.orders[debtOrderId] = {
          id: debtOrderId,
          tableId: selectedTableId,
          items: [{ id: 'debt_item', productId: null, name: 'Deuda fiada', price: lastFiadoSale.totalWithTip, qty: 1, sent: true, ready: true }],
          createdAt: Date.now(),
          employeeName: 'Deuda anterior',
        };
        table.orderId = debtOrderId;
        persistFloor(nextFloor);
      }
    }
  }, [selectedTable, selectedOrder, selectedTableId, currentUser, sales, floor]);
  
  const orderTotal = selectedOrder ? selectedOrder.items.reduce((s, i) => s + i.price * i.qty, 0) : 0;
  const discountedTotal = round2(orderTotal * (1 - orderDiscount / 100));
  const finalTotal = round2(discountedTotal + tipAmount);
  const hasUnsent = selectedOrder ? selectedOrder.items.some(i => !i.sent) : false;
  const splitsUsed = round2(paymentSplits.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const remaining = round2(finalTotal - splitsUsed);
  const canConfirm = paymentSplits.length > 0 && Math.abs(remaining) < 0.005;

  function addItem(product) {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    let order;
    if (!table.orderId) {
      const orderId = 'o_' + Date.now();
      order = { id: orderId, tableId: table.id, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '—' };
      next.orders[orderId] = order;
      table.orderId = orderId;
      table.status = 'ocupada';
    } else {
      order = next.orders[table.orderId];
    }
    const existing = order.items.find(i => i.productId === product.id && !i.sent);
    if (existing) existing.qty += 1;
    else order.items.push({
      id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
      productId: product.id, name: product.name, price: product.price,
      qty: 1, sent: false, ready: false,
    });
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
    if (count) showToast(`Comanda enviada a cocina (${count} ${count === 1 ? 'línea' : 'líneas'})`);
  }

  function toggleCuenta() {
    const next = clone(floor);
    const table = next.tables.find(t => t.id === selectedTableId);
    table.status = table.status === 'cuenta' ? 'ocupada' : 'cuenta';
    persistFloor(next);
  }

  function markReady(orderId) {
    const next = clone(floor);
    const order = next.orders[orderId];
    order.items.forEach(i => { if (i.sent) i.ready = true; });
    persistFloor(next);
  }

  function addSplit(method) {
    if (method === 'fiado') {
      // Fiado cubre el total completamente
      setPaymentSplits([{ id: 'sp_fiado', method: 'fiado', amount: finalTotal }]);
    } else {
      const used = round2(paymentSplits.reduce((s, p) => s + (p.method === 'fiado' ? 0 : p.amount), 0));
      const remaining = round2(finalTotal - used);
      if (remaining <= 0) return;
      setPaymentSplits([...paymentSplits.filter(p => p.method !== 'fiado'), { id: 'sp_' + Date.now(), method, amount: remaining }]);
    }
  }
  function updateSplitAmount(id, value) {
    const amount = value === '' ? 0 : Math.max(0, parseFloat(value));
    setPaymentSplits(paymentSplits.map(p => p.id === id ? { ...p, amount: isNaN(amount) ? 0 : amount } : p));
  }
  function removeSplit(id) {
    setPaymentSplits(paymentSplits.filter(p => p.id !== id));
  }

  function closeBill() {
    const nextFloor = clone(floor);
    const table = nextFloor.tables.find(t => t.id === selectedTableId);
    const order = nextFloor.orders[table.orderId];
    const wasDebt = table.isFiado && order.items.length === 1 && order.items[0].productId === null;

    const nextCatalog = clone(catalog);
    order.items.forEach(item => {
      if (item.productId) {
        const p = nextCatalog.products.find(p => p.id === item.productId);
        if (p) p.stock = Math.max(0, p.stock - item.qty);
      }
    });

    const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmount = round2(subtotal * (orderDiscount / 100));
    const total = round2(subtotal - discountAmount);
    const totalWithTip = round2(total + tipAmount);
    
    const payments = paymentSplits.map(s => s.method === 'fiado' ? { method: 'fiado', amount: round2(s.amount) } : { method: s.method, amount: round2(s.amount) });
    const methodLabel = payments
      .map(p => PAYMENT_METHODS.find(m => m.id === p.method)?.label || p.method)
      .join(' + ');

    const isFiado = payments.some(p => p.method === 'fiado');
    
    const sale = {
      id: 's_' + Date.now(),
      tableId: table.id, tableName: table.name,
      items: order.items.filter(i => i.productId).map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal,
      discount: orderDiscount,
      discountAmount,
      total,
      tip: tipAmount,
      totalWithTip,
      payments: isFiado ? [{ method: 'fiado', amount: totalWithTip }] : payments,
      paymentMethod: methodLabel,
      isFiado,
      isDebtPayment: wasDebt,
      employeeId: currentUser?.id || null,
      employeeName: currentUser?.name || 'Sin asignar',
      closedAt: Date.now(),
    };

    delete nextFloor.orders[table.orderId];
    table.orderId = null;
    table.status = 'libre';
    table.isFiado = false; // Limpiar el estado fiado

    // Actualizar control de caja esperado
    const cashPayments = !isFiado ? payments.filter(p => p.method === 'efectivo').reduce((s, p) => s + p.amount, 0) : 0;
    setCashControl(prev => ({ ...prev, expectedTotal: round2(prev.expectedTotal + cashPayments) }));

    persistFloor(nextFloor);
    persistCatalog(nextCatalog);
    persistSales([...sales, sale]);
    setPaying(false);
    setPaymentSplits([]);
    setOrderDiscount(0);
    setTipAmount(0);
    setSelectedTableId(null);
    
    const tipStr = tipAmount > 0 ? ` (+${euros(tipAmount)} propina)` : '';
    const discStr = orderDiscount > 0 ? ` (${orderDiscount}% desc)` : '';
    const msg = wasDebt 
      ? `Deuda pagada: ${euros(totalWithTip)}${discStr}${tipStr}`
      : isFiado 
        ? `Fiado: ${euros(totalWithTip)}${discStr}${tipStr}`
        : `Cobrado: ${euros(totalWithTip)}${discStr}${tipStr}`;
    showToast(msg);
  }

  function addProduct(p) {
    const next = clone(catalog);
    next.products.push({
      id: 'p_' + Date.now(), name: p.name, category: p.category,
      price: Number(p.price), stock: Number(p.stock), lowStock: Number(p.lowStock),
    });
    if (!next.categories.includes(p.category)) next.categories.push(p.category);
    persistCatalog(next);
    setNewProductOpen(false);
  }

  function updateProductField(id, field, value) {
    const next = clone(catalog);
    const p = next.products.find(p => p.id === id);
    p[field] = field === 'name' || field === 'category' ? value : Number(value);
    persistCatalog(next);
  }

  function deleteProduct(id) {
    const next = clone(catalog);
    next.products = next.products.filter(p => p.id !== id);
    persistCatalog(next);
    setConfirmDeleteId(null);
  }

  function addEmployee(emp) {
    const next = [...employees, { id: 'e_' + Date.now(), name: emp.name, pin: emp.pin, role: emp.role }];
    persistEmployees(next);
  }
  function updateEmployeeField(id, field, value) {
    const next = employees.map(e => e.id === id ? { ...e, [field]: value } : e);
    persistEmployees(next);
  }
  function deleteEmployee(id) {
    const admins = employees.filter(e => e.role === 'admin');
    const target = employees.find(e => e.id === id);
    if (target?.role === 'admin' && admins.length <= 1) {
      showToast('Tiene que quedar al menos un administrador');
      return;
    }
    persistEmployees(employees.filter(e => e.id !== id));
  }

  // ---------- Pantallas de carga / error ----------
  if (loading) {
    return (
      <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div style={{ borderColor: C.brass, borderTopColor: 'transparent' }} className="w-10 h-10 rounded-full border-4 animate-spin" />
          <p style={{ color: C.muted }} className="text-sm">Preparando la sala…</p>
        </div>
      </div>
    );
  }
  if (fatalError) {
    return (
      <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle style={{ color: C.wineLight }} className="w-10 h-10 mx-auto mb-3" />
          <p className="font-semibold mb-1">No se ha podido cargar el TPV</p>
          <p style={{ color: C.muted }} className="text-sm">Recarga la página para volver a intentarlo.</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (menuMode === 'menu') {
      return (
        <MenuPrincipal
          employees={employees}
          onLoginClick={() => { setEntryPoint('entrada'); setMenuMode('login'); }}
          onAlmacenClick={() => { setEntryPoint('almacen'); setMenuMode('login'); }}
          onCajaClick={() => { setEntryPoint('caja'); setMenuMode('login'); }}
          onConfigClick={() => { setEntryPoint('config'); setMenuMode('login'); }}
          colors={C}
        />
      );
    } else if (menuMode === 'login') {
      return (
        <LoginScreen
          employees={employees}
          loginSelected={loginSelected}
          setLoginSelected={setLoginSelected}
          pinInput={pinInput}
          setPinInput={setPinInput}
          onDigit={pressDigit}
          onDelete={deleteDigit}
          onBack={() => setMenuMode('menu')}
          colors={C}
        />
      );
    }
  }

  const navItems = [
    { id: 'salon', label: 'Salón', icon: LayoutGrid, adminOnly: false },
    { id: 'cocina', label: 'Cocina', icon: ChefHat, adminOnly: false },
    { id: 'inventario', label: 'Inventario', icon: Package, adminOnly: true },
    { id: 'informes', label: 'Informes', icon: BarChart3, adminOnly: true },
    { id: 'empleados', label: 'Equipo', icon: Users, adminOnly: true },
  ].filter(item => !item.adminOnly || currentUser.role === 'admin');

  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseRing { 0%,100% { box-shadow: 0 0 0 0 rgba(200,147,43,0.0); } 50% { box-shadow: 0 0 0 5px rgba(200,147,43,0.25); } }
        .pulse-cuenta { animation: pulseRing 1.8s ease-in-out infinite; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
        .fade-up { animation: fadeUp .25s ease-out; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
        @keyframes shake { 10%,90% { transform: translateX(-1px); } 20%,80% { transform: translateX(2px); } 30%,50%,70% { transform: translateX(-4px); } 40%,60% { transform: translateX(4px); } }
        .shake { animation: shake .4s; }
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Cabecera */}
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
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  background: active ? C.surfaceLight : 'transparent',
                  color: active ? C.brassLight : C.muted,
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 shrink-0"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.id === 'inventario' && lowStockProducts.length > 0 && (
                  <span style={{ background: C.wine }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>
            );
          })}
          <div style={{ borderLeft: `1px solid ${C.line}` }} className="flex items-center gap-2 pl-2 ml-1 shrink-0">
            <span style={{ color: C.muted }} className="text-xs hidden md:flex items-center gap-1">
              {currentUser.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.brassLight }} />}
              {currentUser.name}
            </span>
            <button onClick={() => setMenuMode('menu')} title="Ir al menú" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={logout} title="Cerrar sesión" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        {view === 'salon' && (
          <SalonView floor={floor} onSelect={(id) => { setSelectedTableId(id); setActiveCategory('Todos'); }} persistFloor={persistFloor} colors={C} />
        )}
        {view === 'cocina' && (
          <CocinaView floor={floor} onReady={markReady} colors={C} />
        )}
        {view === 'inventario' && (
          <InventarioView
            catalog={catalog}
            colors={C}
            onUpdateField={updateProductField}
            newProductOpen={newProductOpen}
            setNewProductOpen={setNewProductOpen}
            onAddProduct={addProduct}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
            onDelete={deleteProduct}
          />
        )}
        {view === 'almacen' && (
          almacenUbicacion ? (
            <AlmacenDetalleView
              catalog={catalog}
              ubicacion={almacenUbicacion}
              onBack={() => setAlmacenUbicacion(null)}
              colors={C}
              onUpdateField={updateProductField}
              newProductOpen={newProductOpen}
              setNewProductOpen={setNewProductOpen}
              onAddProduct={addProduct}
              confirmDeleteId={confirmDeleteId}
              setConfirmDeleteId={setConfirmDeleteId}
              onDelete={deleteProduct}
            />
          ) : (
            <AlmacenMenuView
              catalog={catalog}
              onSelectUbicacion={setAlmacenUbicacion}
              colors={C}
            />
          )
        )}
        {view === 'informes' && (
          <InformesView sales={sales} employees={employees} colors={C} />
        )}
        {view === 'empleados' && (
          <EmpleadosView
            employees={employees}
            colors={C}
            onAdd={addEmployee}
            onUpdateField={updateEmployeeField}
            onDelete={deleteEmployee}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
          />
        )}
      </main>

      {/* Cajón de comanda */}
      {selectedTable && (
        <div className="fixed inset-0 z-30 flex justify-end no-print">
          <div onClick={() => setSelectedTableId(null)} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ background: C.surface, borderLeft: `1px solid ${C.line}` }} className="relative w-full sm:w-[26rem] h-full flex flex-col fade-up">
            {/* Cabecera del cajón */}
            <div style={{ borderBottom: `1px solid ${C.line}` }} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedTableId(null)} style={{ color: C.muted }} className="p-1 -ml-1">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-display text-xl" style={{ color: C.cream }}>{selectedTable.name}</h2>
              </div>
              {selectedTable.isFiado && !selectedOrder ? (
                <button
                  onClick={() => { setPaymentSplits([]); setTipAmount(0); setPaying(true); }}
                  style={{ background: C.wine, color: C.cream }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
                >
                  💳 Pagar deuda
                </button>
              ) : (
                <button
                  onClick={toggleCuenta}
                  style={{
                    color: selectedTable.status === 'cuenta' ? C.base : C.brassLight,
                    background: selectedTable.status === 'cuenta' ? C.brassLight : 'transparent',
                    border: `1px solid ${C.brass}`,
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5" /> {selectedTable.status === 'cuenta' ? 'Cuenta pedida' : 'Pedir cuenta'}
                </button>
              )}
            </div>

            {/* Categorías */}
            {!selectedOrder?.items[0]?.productId === null && (
              <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ borderBottom: `1px solid ${C.line}` }}>
                {['Todos', ...catalog.categories].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      background: activeCategory === cat ? C.brass : C.surfaceLight,
                      color: activeCategory === cat ? C.base : C.muted,
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Productos */}
            {!selectedOrder?.items[0]?.productId === null && (
              <div className="grid grid-cols-2 gap-2 p-4 overflow-y-auto" style={{ maxHeight: '32%' }}>
                {catalog.products
                  .filter(p => activeCategory === 'Todos' || p.category === activeCategory)
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p)}
                      disabled={p.stock <= 0}
                      style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, opacity: p.stock <= 0 ? 0.4 : 1 }}
                      className="text-left rounded-lg p-2.5 hover:opacity-90 disabled:cursor-not-allowed"
                    >
                      <p className="text-sm font-medium leading-tight">{p.name}</p>
                      <p className="font-mono text-xs mt-1" style={{ color: C.brassLight }}>{euros(p.price)}</p>
                    </button>
                  ))}
              </div>
            )}

            {/* Ticket */}
            <div className="flex-1 flex flex-col min-h-0" style={{ borderTop: `1px solid ${C.line}` }}>
              <div style={TICKET_EDGE} />
              <div style={{ background: C.cream, color: C.base }} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm">
                {!selectedOrder || selectedOrder.items.length === 0 ? (
                  <p style={{ color: '#8a7c68' }} className="text-center py-6 text-xs">
                    Sin artículos todavía. Toca un producto para añadirlo a la comanda.
                  </p>
                ) : (
                  selectedOrder.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px dashed #cdbfa3' }}>
                      <div className="flex-1 pr-2">
                        <p className="leading-tight">{item.name}</p>
                        {item.sent && (
                          <span style={{ color: item.ready ? C.sage : '#a4884a' }} className="text-[11px]">
                            {item.ready ? '✓ servido' : '● en cocina'}
                          </span>
                        )}
                      </div>
                      {!item.sent ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => changeQty(item.id, -1)} className="p-0.5"><Minus className="w-3.5 h-3.5" /></button>
                          <span className="w-4 text-center">{item.qty}</span>
                          <button onClick={() => changeQty(item.id, 1)} className="p-0.5"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <span className="w-4 text-center">{item.qty}</span>
                      )}
                      <span className="w-16 text-right">{euros(item.price * item.qty)}</span>
                    </div>
                  ))
                )}
              </div>
              <div style={{ background: C.cream, color: C.base, borderTop: '1px dashed #cdbfa3' }} className="px-4 py-1 font-mono text-xs">
                <div className="flex justify-between py-1">
                  <span>Subtotal</span>
                  <span>{euros(orderTotal)}</span>
                </div>
                {orderDiscount > 0 && (
                  <div className="flex justify-between py-1" style={{ color: C.sage }}>
                    <span>Descuento {orderDiscount}%</span>
                    <span>-{euros(orderTotal * orderDiscount / 100)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="flex justify-between py-1" style={{ color: C.brass }}>
                    <span>Propina</span>
                    <span>+{euros(tipAmount)}</span>
                  </div>
                )}
              </div>
              <div style={{ background: C.cream, color: C.base }} className="px-4 py-3 font-mono flex justify-between text-base font-semibold">
                <span>TOTAL</span>
                <span>{euros(finalTotal)}</span>
              </div>
              <div style={{ background: C.surfaceLight, color: C.muted }} className="px-4 py-2 text-xs flex gap-2">
                <button
                  onClick={() => {
                    const disc = prompt('Descuento %:', orderDiscount.toString());
                    if (disc !== null) setOrderDiscount(Math.min(100, Math.max(0, parseFloat(disc) || 0)));
                  }}
                  className="flex items-center gap-1 hover:opacity-80"
                >
                  <Percent className="w-3.5 h-3.5" /> Descuento
                </button>
              </div>
            </div>

            {/* Acciones */}
            <div className="p-4 flex gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
              {selectedOrder?.items[0]?.productId !== null && (
                <button
                  onClick={sendToKitchen}
                  disabled={!hasUnsent}
                  style={{ background: hasUnsent ? C.surfaceLight : C.surface, border: `1px solid ${C.line}`, color: hasUnsent ? C.cream : C.muted }}
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  <ChefHat className="w-4 h-4" /> Enviar a cocina
                </button>
              )}
              <button
                onClick={() => { setPaymentSplits([]); setTipAmount(0); setPaying(true); }}
                disabled={!selectedOrder || selectedOrder.items.length === 0}
                style={{ background: finalTotal > 0 ? C.brass : C.surface, color: finalTotal > 0 ? C.base : C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-4 h-4" /> Cobrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de pago */}
      {paying && selectedOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 no-print" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="w-full max-w-sm rounded-xl p-5 fade-up max-h-[90vh] overflow-y-auto">
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">{selectedTable?.name}</p>
            <div className="mb-3">
              <p className="font-display text-2xl" style={{ color: C.brassLight }}>{euros(finalTotal)}</p>
              {orderDiscount > 0 && <p style={{ color: C.sage }} className="font-mono text-xs">Descuento {orderDiscount}%</p>}
              {tipAmount > 0 && <p style={{ color: C.brass }} className="font-mono text-xs">+{euros(tipAmount)} propina</p>}
            </div>

            {/* Propinas */}
            <div className="mb-4">
              <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Propina</p>
              <div className="flex gap-2 mb-2">
                {[0, 0.5, 1, 1.5, 2].map(t => (
                  <button
                    key={t}
                    onClick={() => setTipAmount(round2(finalTotal * (t / 100)))}
                    style={{ background: Math.abs(tipAmount - round2(finalTotal * (t / 100))) < 0.01 ? C.brass : C.surfaceLight, color: Math.abs(tipAmount - round2(finalTotal * (t / 100))) < 0.01 ? C.base : C.muted }}
                    className="flex-1 rounded-lg py-1.5 text-xs font-medium"
                  >
                    {t}%
                  </button>
                ))}
              </div>
              <input
                type="number" step="0.01" value={tipAmount} onChange={e => setTipAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{ background: C.surfaceLight, color: C.cream }}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-center"
                placeholder="Propina personalizada"
              />
            </div>

            <p style={{ color: Math.abs(remaining) < 0.005 ? C.sageLight : C.wineLight }} className="font-mono text-xs mb-4">
              {Math.abs(remaining) < 0.005 ? 'Importe cubierto' : `Restante: ${euros(remaining)}`}
            </p>

            {paymentSplits.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {paymentSplits.map(sp => {
                  const meta = PAYMENT_METHODS.find(m => m.id === sp.method);
                  const Icon = meta.icon;
                  return (
                    <div key={sp.id} style={{ background: C.surfaceLight }} className="flex items-center gap-2 rounded-lg px-3 py-2">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
                      <span className="text-sm flex-1">{meta.label}</span>
                      {sp.method === 'fiado' ? (
                        <span className="font-mono" style={{ color: C.brassLight }}>{euros(sp.amount)}</span>
                      ) : (
                        <input
                          type="number" step="0.01" value={sp.amount}
                          onChange={e => updateSplitAmount(sp.id, e.target.value)}
                          style={{ background: C.surface, color: C.cream, width: 76 }}
                          className="font-mono rounded-md px-2 py-1 text-sm text-right"
                        />
                      )}
                      <button onClick={() => removeSplit(sp.id)} style={{ color: C.muted }}><X className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
              {PAYMENT_METHODS.map(m => {
                const Icon = m.icon;
                const disabled = m.id !== 'fiado' && remaining <= 0.005;
                const isFiadoAlready = paymentSplits.some(p => p.method === 'fiado');
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (m.id === 'fiado') {
                        addSplit('fiado');
                      } else if (isFiadoAlready) {
                        showToast('No se puede mezclar Fiado con otros métodos');
                      } else {
                        addSplit(m.id);
                      }
                    }}
                    disabled={disabled || (m.id === 'fiado' && isFiadoAlready)}
                    style={{ background: C.surfaceLight, opacity: disabled || (m.id === 'fiado' && isFiadoAlready) ? 0.4 : 1 }}
                    className="rounded-lg py-3 flex flex-col items-center gap-1.5 text-xs font-medium disabled:cursor-not-allowed"
                  >
                    <Icon className="w-4 h-4" /> {m.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={closeBill}
              disabled={!canConfirm}
              style={{ background: canConfirm ? C.brass : C.surfaceLight, color: canConfirm ? C.base : C.muted }}
              className="w-full rounded-lg py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              Confirmar
            </button>
            <button onClick={() => { setPaying(false); setPaymentSplits([]); setTipAmount(0); }} style={{ color: C.muted }} className="w-full rounded-lg py-2 text-sm mt-1">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }} className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm shadow-lg z-50 fade-up no-print">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- Menú Principal ----------
function MenuPrincipal({ employees, onLoginClick, onAlmacenClick, onCajaClick, onConfigClick, colors: C }) {
  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }} className="flex flex-col items-center justify-center p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
      `}</style>
      
      <div className="flex flex-col items-center mb-12">
        <h1 className="font-display text-5xl mb-2" style={{ color: C.brassLight }}>LA COMANDA</h1>
        <p style={{ color: C.muted }} className="text-sm">Sistema de TPV para bares y restaurantes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {/* Login de Camarero */}
        <button
          onClick={onLoginClick}
          style={{ background: C.surface, border: `2px solid ${C.brass}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-opacity flex flex-col items-center gap-3"
        >
          <div style={{ background: C.surfaceLight }} className="w-16 h-16 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" style={{ color: C.brassLight }} />
          </div>
          <h3 className="font-display text-2xl" style={{ color: C.cream }}>ENTRADA</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Inicia sesión como camarero para trabajar</p>
        </button>

        {/* Almacén */}
        <button
          onClick={onAlmacenClick}
          style={{ background: C.surface, border: `2px solid ${C.sage}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-opacity flex flex-col items-center gap-3"
        >
          <div style={{ background: C.surfaceLight }} className="w-16 h-16 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8" style={{ color: C.sageLight }} />
          </div>
          <h3 className="font-display text-2xl" style={{ color: C.cream }}>ALMACÉN</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Gestiona inventario y stock (solo admin)</p>
        </button>

        {/* Caja / Informes */}
        <button
          onClick={onCajaClick}
          style={{ background: C.surface, border: `2px solid ${C.brassLight}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-opacity flex flex-col items-center gap-3"
        >
          <div style={{ background: C.surfaceLight }} className="w-16 h-16 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8" style={{ color: C.brassLight }} />
          </div>
          <h3 className="font-display text-2xl" style={{ color: C.cream }}>CAJA</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Informes, cierres y control de efectivo</p>
        </button>

        {/* Configuración */}
        <button
          onClick={onConfigClick}
          style={{ background: C.surface, border: `2px solid ${C.wine}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-opacity flex flex-col items-center gap-3"
        >
          <div style={{ background: C.surfaceLight }} className="w-16 h-16 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8" style={{ color: C.wineLight }} />
          </div>
          <h3 className="font-display text-2xl" style={{ color: C.cream }}>CONFIGURACIÓN</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Gestiona empleados y ajustes (solo admin)</p>
        </button>
      </div>

      {/* Info de empleados activos */}
      <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mt-12 max-w-2xl w-full">
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Empleados disponibles</p>
        <div className="flex flex-wrap gap-2">
          {employees.map(emp => (
            <span key={emp.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
              {emp.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.brassLight }} /> : <User className="w-3.5 h-3.5" style={{ color: C.muted }} />}
              {emp.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


function LoginScreen({ employees, loginSelected, setLoginSelected, pinInput, setPinInput, onDigit, onDelete, onBack, colors: C }) {
  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }} className="flex flex-col items-center justify-center p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        @keyframes shake { 10%,90% { transform: translateX(-1px); } 20%,80% { transform: translateX(2px); } 30%,50%,70% { transform: translateX(-4px); } 40%,60% { transform: translateX(4px); } }
        .shake { animation: shake .4s; }
      `}</style>
      <h1 className="font-display text-4xl mb-1" style={{ color: C.brassLight }}>LA COMANDA</h1>
      <p style={{ color: C.muted }} className="text-sm mb-8">Identifícate para empezar tu turno</p>

      {!loginSelected ? (
        <div className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-sm mb-4">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setLoginSelected(emp)}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-90"
              >
                <div style={{ background: C.surfaceLight }} className="w-10 h-10 rounded-full flex items-center justify-center">
                  {emp.role === 'admin' ? <ShieldCheck className="w-5 h-5" style={{ color: C.brassLight }} /> : <User className="w-5 h-5" style={{ color: C.muted }} />}
                </div>
                <span className="text-sm font-medium text-center">{emp.name}</span>
              </button>
            ))}
          </div>
          <button onClick={onBack} style={{ color: C.muted }} className="text-sm hover:opacity-80">
            ← Volver al menú
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xs flex flex-col items-center">
          <p className="text-sm mb-1" style={{ color: C.muted }}>Hola, {loginSelected.name}</p>
          <p className="text-xs mb-4" style={{ color: C.muted }}>Introduce tu PIN</p>
          <div className={`flex gap-3 mb-6 ${pinInput.length === 0 ? '' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <span
                key={i}
                style={{ background: i < pinInput.length ? C.brassLight : C.surfaceLight, border: `1px solid ${C.line}` }}
                className="w-3.5 h-3.5 rounded-full"
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 w-full mb-4">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button key={d} onClick={() => onDigit(d)} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl py-4 text-lg font-medium hover:opacity-90">
                {d}
              </button>
            ))}
            <button onClick={() => { setLoginSelected(null); setPinInput(''); }} style={{ color: C.muted }} className="rounded-xl py-4 text-xs font-medium">
              Atrás
            </button>
            <button onClick={() => onDigit('0')} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl py-4 text-lg font-medium hover:opacity-90">0</button>
            <button onClick={onDelete} style={{ color: C.muted }} className="rounded-xl py-4 flex items-center justify-center">
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function SalonView({ floor, onSelect, persistFloor, colors: C }) {
  const [showReservationModal, setShowReservationModal] = useState(null);
  const [reservationForm, setReservationForm] = useState({ name: '', time: '' });

  function addReservation(tableId) {
    if (!reservationForm.name || !reservationForm.time) return;
    const nextFloor = clone(floor);
    const table = nextFloor.tables.find(t => t.id === tableId);
    table.reserved = { name: reservationForm.name, time: reservationForm.time };
    table.status = 'libre';
    persistFloor(nextFloor);
    setShowReservationModal(null);
    setReservationForm({ name: '', time: '' });
  }

  function cancelReservation(tableId) {
    const nextFloor = clone(floor);
    const table = nextFloor.tables.find(t => t.id === tableId);
    table.reserved = null;
    persistFloor(nextFloor);
  }

  const statusStyle = {
    libre: { border: C.line, label: 'Libre', dot: C.sageLight, bg: C.surface },
    ocupada: { border: C.brass, label: 'Ocupada', dot: C.brassLight, bg: C.surface },
    cuenta: { border: C.wine, label: 'Cuenta pedida', dot: C.wineLight, bg: C.surface },
    reservada: { border: C.muted, label: 'Reservada', dot: C.muted, bg: C.surfaceLight },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>SALÓN</h2>
        <div className="flex items-center gap-2 sm:gap-4 text-xs" style={{ color: C.muted, overflowX: 'auto' }}>
          {Object.entries(statusStyle).map(([k, s]) => (
            <span key={k} className="flex items-center gap-1.5 whitespace-nowrap">
              <span style={{ background: s.dot, width: 8, height: 8, borderRadius: 999, display: 'inline-block' }} />
              <span className="hidden sm:inline">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {floor.tables.map(t => {
          const order = t.orderId ? floor.orders[t.orderId] : null;
          const subtotal = order ? order.items.reduce((s, i) => s + i.price * i.qty, 0) : 0;
          let actualStatus = t.status;
          if (t.reserved && !t.orderId) actualStatus = 'reservada';
          const s = statusStyle[actualStatus];

          return (
            <div key={t.id} style={{ background: s.bg, border: `2px solid ${s.border}` }} className={`rounded-xl p-4 text-left ${t.status === 'cuenta' ? 'pulse-cuenta' : ''}`}>
              <div className="flex items-start justify-between mb-1">
                <p className="font-display text-xl" style={{ color: C.cream }}>{t.name}</p>
                {t.isFiado && <span style={{ background: C.wine, color: C.cream }} className="text-xs font-medium px-2 py-1 rounded-full">Fiado</span>}
              </div>
              <p style={{ color: s.dot }} className="text-xs font-medium">{s.label}</p>
              {t.reserved && !t.orderId && (
                <p style={{ color: C.muted }} className="text-xs mt-1">
                  <span className="truncate">{t.reserved.name}</span> {t.reserved.time}
                </p>
              )}
              {order && (
                <p className="font-mono text-sm mt-2" style={{ color: C.muted }}>
                  {subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
              )}
              <div className="flex gap-1 mt-3">
                {t.reserved && !t.orderId && (
                  <button
                    onClick={() => cancelReservation(t.id)}
                    style={{ background: C.surfaceLight, color: C.muted }}
                    className="flex-1 text-xs py-1.5 rounded hover:opacity-80"
                  >
                    ✕ Res
                  </button>
                )}
                {!t.reserved && t.status === 'libre' && (
                  <button
                    onClick={() => setShowReservationModal(t.id)}
                    style={{ background: C.surfaceLight, color: C.muted }}
                    className="flex-1 text-xs py-1.5 rounded hover:opacity-80 flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                )}
                {(t.status !== 'libre' || t.reserved) && (
                  <button
                    onClick={() => onSelect(t.id)}
                    style={{ background: C.brass, color: C.base }}
                    className="flex-1 text-xs py-1.5 rounded font-medium"
                  >
                    Abrir
                  </button>
                )}
                {t.status === 'libre' && !t.reserved && (
                  <button
                    onClick={() => onSelect(t.id)}
                    style={{ background: C.brass, color: C.base }}
                    className="flex-1 text-xs py-1.5 rounded font-medium"
                  >
                    Usar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de reserva */}
      {showReservationModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 no-print" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-3" style={{ color: C.cream }}>Reservar mesa</p>
            <input
              type="text" value={reservationForm.name} onChange={e => setReservationForm({ ...reservationForm, name: e.target.value })}
              placeholder="Nombre cliente" style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-2 text-sm mb-2"
              autoFocus
            />
            <input
              type="time" value={reservationForm.time} onChange={e => setReservationForm({ ...reservationForm, time: e.target.value })}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-2 text-sm mb-4"
            />
            <button
              onClick={() => addReservation(showReservationModal)}
              style={{ background: C.sage, color: '#fff' }}
              className="w-full rounded-lg py-2.5 text-sm font-medium"
            >
              Guardar reserva
            </button>
            <button onClick={() => { setShowReservationModal(null); setReservationForm({ name: '', time: '' }); }} style={{ color: C.muted }} className="w-full rounded-lg py-2 text-sm mt-1">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Vista: Almacén (menú de ubicaciones) ----------
function AlmacenMenuView({ catalog, onSelectUbicacion, colors: C }) {
  const ubicaciones = ['Bar', 'Cocina', 'Almacén'];
  
  const stats = ubicaciones.map(ub => {
    const productos = catalog.products.filter(p => p.ubicacion === ub);
    const total = productos.length;
    const bajo = productos.filter(p => p.stock <= p.lowStock).length;
    const valorTotal = productos.reduce((s, p) => s + (p.stock * p.price), 0);
    return { ub, total, bajo, valorTotal };
  });

  return (
    <div>
      <h2 className="font-display text-2xl mb-6" style={{ color: C.cream }}>ALMACÉN</h2>
      <p style={{ color: C.muted }} className="text-sm mb-6">Selecciona una ubicación para ver el inventario</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(stat => (
          <button
            key={stat.ub}
            onClick={() => onSelectUbicacion(stat.ub)}
            style={{ background: C.surface, border: `2px solid ${C.brass}` }}
            className="rounded-2xl p-6 hover:opacity-90 transition-opacity text-left"
          >
            <p className="font-display text-2xl mb-4" style={{ color: C.brassLight }}>{stat.ub}</p>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Productos</span>
                <span className="font-mono" style={{ color: C.cream }}>{stat.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Stock bajo</span>
                <span className="font-mono" style={{ color: stat.bajo > 0 ? C.wineLight : C.sageLight }}>
                  {stat.bajo}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Valor total</span>
                <span className="font-mono" style={{ color: C.brassLight }}>{euros(stat.valorTotal)}</span>
              </div>
            </div>

            <div style={{ background: C.surfaceLight }} className="rounded-lg px-3 py-2 text-xs text-center" style={{ color: C.brass }}>
              Ver inventario →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Vista: Almacén (detalle de ubicación) ----------
function AlmacenDetalleView({ catalog, ubicacion, onBack, colors: C, onUpdateField, newProductOpen, setNewProductOpen, onAddProduct, confirmDeleteId, setConfirmDeleteId, onDelete }) {
  const productos = catalog.products.filter(p => p.ubicacion === ubicacion);
  const bajo = productos.filter(p => p.stock <= p.lowStock).length;
  const valorTotal = productos.reduce((s, p) => s + (p.stock * p.price), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={onBack} style={{ color: C.muted }} className="text-sm mb-2 hover:opacity-80 flex items-center gap-1">
            ← Volver
          </button>
          <h2 className="font-display text-2xl" style={{ color: C.cream }}>Stock de {ubicacion}</h2>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase">Productos</p>
            <p className="font-display text-2xl" style={{ color: C.cream }}>{productos.length}</p>
          </div>
          {bajo > 0 && (
            <div>
              <p style={{ color: C.muted }} className="text-xs uppercase">Stock bajo</p>
              <p className="font-display text-2xl" style={{ color: C.wineLight }}>{bajo}</p>
            </div>
          )}
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase">Valor</p>
            <p className="font-mono text-lg" style={{ color: C.brassLight }}>{euros(valorTotal)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        {productos.map(p => {
          const low = p.stock <= p.lowStock;
          const pct = Math.min(100, Math.round((p.stock / (p.lowStock * 3 || 1)) * 100));
          return (
            <div key={p.id} style={{ background: C.surface, border: `1px solid ${low ? C.wine : C.line}` }} className="rounded-lg p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[8rem]">
                <p className="text-sm font-medium">{p.name}</p>
                <p style={{ color: C.muted }} className="text-xs">{p.category}</p>
              </div>
              <div style={{ background: C.surfaceLight }} className="w-24 h-2 rounded-full overflow-hidden hidden sm:block">
                <div style={{ width: `${pct}%`, background: low ? C.wineLight : C.sageLight }} className="h-full" />
              </div>
              <input
                type="number" defaultValue={p.stock}
                onBlur={e => onUpdateField(p.id, 'stock', e.target.value)}
                style={{ background: C.surfaceLight, color: low ? C.wineLight : C.cream, width: 64 }}
                className="rounded-md px-2 py-1.5 text-sm text-center"
              />
              <input
                type="number" step="0.1" defaultValue={p.price}
                onBlur={e => onUpdateField(p.id, 'price', e.target.value)}
                style={{ background: C.surfaceLight, color: C.cream, width: 72 }}
                className="font-mono rounded-md px-2 py-1.5 text-sm text-center"
              />
              {low && <AlertTriangle className="w-4 h-4" style={{ color: C.wineLight }} />}
              {confirmDeleteId === p.id ? (
                <button onClick={() => onDelete(p.id)} style={{ color: C.wineLight }} className="text-xs font-medium px-2">Confirmar</button>
              ) : (
                <button onClick={() => setConfirmDeleteId(p.id)} style={{ color: C.muted }} className="p-1.5"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function CocinaView({ floor, onReady, colors: C }) {
  const tickets = floor.tables
    .filter(t => t.orderId)
    .map(t => ({ table: t, order: floor.orders[t.orderId] }))
    .filter(({ order }) => order.items.some(i => i.sent && !i.ready));

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
        <p style={{ color: C.muted }} className="text-sm">No hay comandas pendientes. Cuando un camarero envíe un pedido, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-4" style={{ color: C.cream }}>COCINA</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tickets.map(({ table, order }) => {
          const pending = order.items.filter(i => i.sent && !i.ready);
          const minutesAgo = Math.max(0, Math.round((Date.now() - Math.min(...pending.map(i => i.sentAt || Date.now()))) / 60000));
          const urgent = minutesAgo >= 10;
          return (
            <div key={order.id} style={{ border: `1px solid ${urgent ? C.wine : C.line}` }} className="rounded-lg overflow-hidden">
              <div style={TICKET_EDGE} />
              <div style={{ background: C.cream, color: C.base }} className="p-3 font-mono">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display text-lg">{table.name}</p>
                  <span style={{ color: urgent ? C.wine : '#8a7c68' }} className="flex items-center gap-1 text-xs">
                    <Clock className="w-3.5 h-3.5" /> {minutesAgo} min
                  </span>
                </div>
                <ul className="text-sm space-y-1 mb-3">
                  {pending.map(i => <li key={i.id}>{i.qty}× {i.name}</li>)}
                </ul>
                <button onClick={() => onReady(order.id)} style={{ background: C.sage, color: '#fff' }} className="w-full rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Marcar como listo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Vista: Inventario ----------
function InventarioView({ catalog, colors: C, onUpdateField, newProductOpen, setNewProductOpen, onAddProduct, confirmDeleteId, setConfirmDeleteId, onDelete }) {
  const [form, setForm] = useState({ name: '', category: catalog.categories[0] || '', price: '', stock: '', lowStock: '' });

  function submit(e) {
    e.preventDefault();
    if (!form.name || !form.price) return;
    onAddProduct(form);
    setForm({ name: '', category: catalog.categories[0] || '', price: '', stock: '', lowStock: '' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>INVENTARIO</h2>
        <button
          onClick={() => setNewProductOpen(!newProductOpen)}
          style={{ background: C.brass, color: C.base }}
          className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Producto
        </button>
      </div>

      {newProductOpen && (
        <form onSubmit={submit} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre" style={{ background: C.surfaceLight, color: C.cream }} className="rounded-md px-3 py-2 text-sm col-span-2" />
          <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Categoría" style={{ background: C.surfaceLight, color: C.cream }} className="rounded-md px-3 py-2 text-sm" />
          <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} type="number" step="0.1" placeholder="Precio €" style={{ background: C.surfaceLight, color: C.cream }} className="rounded-md px-3 py-2 text-sm" />
          <input value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} type="number" placeholder="Stock" style={{ background: C.surfaceLight, color: C.cream }} className="rounded-md px-3 py-2 text-sm" />
          <button type="submit" style={{ background: C.sage, color: '#fff' }} className="rounded-md py-2 text-sm font-medium col-span-2 sm:col-span-5">Añadir producto</button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {catalog.products.map(p => {
          const low = p.stock <= p.lowStock;
          const pct = Math.min(100, Math.round((p.stock / (p.lowStock * 3 || 1)) * 100));
          return (
            <div key={p.id} style={{ background: C.surface, border: `1px solid ${low ? C.wine : C.line}` }} className="rounded-lg p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[8rem]">
                <p className="text-sm font-medium">{p.name}</p>
                <p style={{ color: C.muted }} className="text-xs">{p.category}</p>
              </div>
              <div style={{ background: C.surfaceLight }} className="w-24 h-2 rounded-full overflow-hidden hidden sm:block">
                <div style={{ width: `${pct}%`, background: low ? C.wineLight : C.sageLight }} className="h-full" />
              </div>
              <input
                type="number" defaultValue={p.stock}
                onBlur={e => onUpdateField(p.id, 'stock', e.target.value)}
                style={{ background: C.surfaceLight, color: low ? C.wineLight : C.cream, width: 64 }}
                className="rounded-md px-2 py-1.5 text-sm text-center"
              />
              <input
                type="number" step="0.1" defaultValue={p.price}
                onBlur={e => onUpdateField(p.id, 'price', e.target.value)}
                style={{ background: C.surfaceLight, color: C.cream, width: 72 }}
                className="font-mono rounded-md px-2 py-1.5 text-sm text-center"
              />
              {low && <AlertTriangle className="w-4 h-4" style={{ color: C.wineLight }} />}
              {confirmDeleteId === p.id ? (
                <button onClick={() => onDelete(p.id)} style={{ color: C.wineLight }} className="text-xs font-medium px-2">Confirmar</button>
              ) : (
                <button onClick={() => setConfirmDeleteId(p.id)} style={{ color: C.muted }} className="p-1.5"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Vista: Informes ----------
function InformesView({ sales, employees, colors: C }) {
  const [tab, setTab] = useState('resumen');

  if (sales.length === 0) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
        <p style={{ color: C.muted }} className="text-sm">Aún no hay ventas registradas. En cuanto cierres una cuenta, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 no-print">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>INFORMES</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTab('resumen')}
            style={{ background: tab === 'resumen' ? C.brass : C.surfaceLight, color: tab === 'resumen' ? C.base : C.muted }}
            className="text-sm font-medium px-3 py-2 rounded-lg"
          >
            Resumen
          </button>
          <button
            onClick={() => setTab('cierre')}
            style={{ background: tab === 'cierre' ? C.brass : C.surfaceLight, color: tab === 'cierre' ? C.base : C.muted }}
            className="text-sm font-medium px-3 py-2 rounded-lg"
          >
            Cierre de caja
          </button>
          <button
            onClick={() => setTab('empleados')}
            style={{ background: tab === 'empleados' ? C.brass : C.surfaceLight, color: tab === 'empleados' ? C.base : C.muted }}
            className="text-sm font-medium px-3 py-2 rounded-lg"
          >
            Por empleado
          </button>
          <button
            onClick={() => setTab('control')}
            style={{ background: tab === 'control' ? C.brass : C.surfaceLight, color: tab === 'control' ? C.base : C.muted }}
            className="text-sm font-medium px-3 py-2 rounded-lg"
          >
            Control de caja
          </button>
        </div>
      </div>
      {tab === 'resumen' && <ResumenTab sales={sales} colors={C} />}
      {tab === 'cierre' && <CierreCajaTab sales={sales} colors={C} />}
      {tab === 'empleados' && <EmpleadosTabInformes sales={sales} colors={C} />}
      {tab === 'control' && <ControlCajaTab sales={sales} colors={C} />}
    </div>
  );
}

function ResumenTab({ sales, colors: C }) {
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.closedAt).toDateString() === today);
  const todayTotal = todaySales.reduce((s, x) => s + x.total, 0);

  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map(d => {
      const key = d.toLocaleDateString('es-ES', { weekday: 'short' });
      const total = sales.filter(s => new Date(s.closedAt).toDateString() === d.toDateString()).reduce((s, x) => s + x.total, 0);
      return { day: key, total: Math.round(total * 100) / 100 };
    });
  }, [sales]);

  const topProducts = useMemo(() => {
    const map = {};
    sales.forEach(s => s.items.forEach(i => { map[i.name] = (map[i.name] || 0) + i.qty; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sales]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Hoy</p>
          <p className="font-display text-3xl" style={{ color: C.brassLight }}>{euros(todayTotal)}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Tickets hoy</p>
          <p className="font-display text-3xl" style={{ color: C.cream }}>{todaySales.length}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Ticket medio hoy</p>
          <p className="font-display text-3xl" style={{ color: C.cream }}>{euros(todaySales.length ? todayTotal / todaySales.length : 0)}</p>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-6">
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Ingresos por método — hoy</p>
        <div className="grid grid-cols-3 gap-3">
          {PAYMENT_METHODS.map(m => {
            const Icon = m.icon;
            const total = todaySales.reduce((sum, s) => {
              const payments = s.payments && s.payments.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
              return sum + payments.filter(p => p.method === m.id).reduce((a, p) => a + p.amount, 0);
            }, 0);
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 text-center">
                <Icon className="w-4 h-4" style={{ color: C.muted }} />
                <span className="text-xs" style={{ color: C.muted }}>{m.label}</span>
                <span className="font-mono text-sm" style={{ color: C.brassLight }}>{euros(total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-6">
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Ventas — últimos 7 días</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={last7}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="day" stroke={C.muted} fontSize={12} />
              <YAxis stroke={C.muted} fontSize={12} />
              <Tooltip contentStyle={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }} formatter={(v) => [euros(v), 'Total']} />
              <Bar dataKey="total" fill={C.brass} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Productos más vendidos</p>
        <div className="flex flex-col gap-2">
          {topProducts.map(([name, qty], idx) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span>{idx + 1}. {name}</span>
              <span className="font-mono" style={{ color: C.brassLight }}>{qty} uds.</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Vista: Cierre de caja (día / mes) ----------
function CierreCajaTab({ sales, colors: C }) {
  const [period, setPeriod] = useState('dia');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthValue, setMonthValue] = useState(() => new Date().toISOString().slice(0, 7));

  const periodSales = useMemo(() => {
    if (period === 'dia') return sales.filter(s => new Date(s.closedAt).toISOString().slice(0, 10) === dateValue);
    return sales.filter(s => new Date(s.closedAt).toISOString().slice(0, 7) === monthValue);
  }, [sales, period, dateValue, monthValue]);

  const total = periodSales.reduce((s, x) => s + x.total, 0);
  const ticketCount = periodSales.length;
  const avgTicket = ticketCount ? total / ticketCount : 0;

  const methodTotals = PAYMENT_METHODS.map(m => {
    const t = periodSales.reduce((sum, s) => {
      const payments = s.payments && s.payments.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
      return sum + payments.filter(p => p.method === m.id).reduce((a, p) => a + p.amount, 0);
    }, 0);
    return { ...m, total: t };
  });

  const employeeTotals = useMemo(() => {
    const map = {};
    periodSales.forEach(s => {
      const key = s.employeeName || 'Sin asignar';
      if (!map[key]) map[key] = { total: 0, count: 0 };
      map[key].total += s.total;
      map[key].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [periodSales]);

  const periodLabel = period === 'dia'
    ? new Date(dateValue + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date(monthValue + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  function downloadCSV() {
    const rows = [
      ['Fecha', 'Hora', 'Mesa', 'Empleado', 'Total €', 'Métodos de pago'],
      ...periodSales.map(s => {
        const d = new Date(s.closedAt);
        const payments = s.payments && s.payments.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
        const metodos = payments
          .map(p => `${PAYMENT_METHODS.find(m => m.id === p.method)?.label || p.method} ${p.amount.toFixed(2)}€`)
          .join(' + ');
        return [
          d.toLocaleDateString('es-ES'),
          d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          s.tableName, s.employeeName || 'Sin asignar', s.total.toFixed(2), metodos,
        ];
      }),
      [],
      ['TOTAL', '', '', '', total.toFixed(2), ''],
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cierre-${period === 'dia' ? dateValue : monthValue}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        <button onClick={() => setPeriod('dia')} style={{ background: period === 'dia' ? C.brass : C.surfaceLight, color: period === 'dia' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Día</button>
        <button onClick={() => setPeriod('mes')} style={{ background: period === 'mes' ? C.brass : C.surfaceLight, color: period === 'mes' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Mes</button>
        {period === 'dia' ? (
          <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
        ) : (
          <input type="month" value={monthValue} onChange={e => setMonthValue(e.target.value)} style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
        )}
        <div className="flex-1" />
        <button onClick={downloadCSV} disabled={periodSales.length === 0} style={{ background: C.surfaceLight, color: C.cream }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
          <Download className="w-4 h-4" /> CSV
        </button>
        <button onClick={() => window.print()} disabled={periodSales.length === 0} style={{ background: C.brass, color: C.base }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>

      <div id="printable-report" style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-xl" style={{ color: C.cream }}>CIERRE DE CAJA</h3>
          <span style={{ color: C.muted }} className="text-xs uppercase">{period === 'dia' ? 'Diario' : 'Mensual'}</span>
        </div>
        <p style={{ color: C.muted }} className="text-sm mb-4 capitalize">{periodLabel}</p>

        {periodSales.length === 0 ? (
          <p style={{ color: C.muted }} className="text-sm py-6 text-center">No hay ventas registradas en este periodo.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Total</p>
                <p className="font-display text-2xl" style={{ color: C.brassLight }}>{euros(total)}</p>
              </div>
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Tickets</p>
                <p className="font-display text-2xl" style={{ color: C.cream }}>{ticketCount}</p>
              </div>
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Ticket medio</p>
                <p className="font-display text-2xl" style={{ color: C.cream }}>{euros(avgTicket)}</p>
              </div>
            </div>

            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Por método de pago</p>
            <div className="flex flex-col gap-1.5 mb-5">
              {methodTotals.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.label}</span>
                  <span className="font-mono" style={{ color: C.brassLight }}>{euros(m.total)}</span>
                </div>
              ))}
            </div>

            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Por empleado</p>
            <div className="flex flex-col gap-1.5">
              {employeeTotals.map(([name, data]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name} <span style={{ color: C.muted }} className="text-xs">({data.count} tickets)</span></span>
                  <span className="font-mono" style={{ color: C.brassLight }}>{euros(data.total)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Historial por empleado ----------
function EmpleadosTabInformes({ sales, colors: C }) {
  const [period, setPeriod] = useState('dia');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().slice(0, 10));

  const periodSales = period === 'dia'
    ? sales.filter(s => new Date(s.closedAt).toISOString().slice(0, 10) === dateValue)
    : sales;

  const employeeBreakdown = useMemo(() => {
    const map = {};
    periodSales.forEach(s => {
      const emp = s.employeeName || 'Sin asignar';
      if (!map[emp]) map[emp] = { total: 0, count: 0, items: [] };
      map[emp].total += s.total;
      map[emp].count += 1;
      map[emp].items.push(s);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [periodSales]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 no-print">
        <button onClick={() => setPeriod('dia')} style={{ background: period === 'dia' ? C.brass : C.surfaceLight, color: period === 'dia' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Día</button>
        <button onClick={() => setPeriod('mes')} style={{ background: period === 'mes' ? C.brass : C.surfaceLight, color: period === 'mes' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Mes</button>
        {period === 'dia' && <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />}
      </div>

      {employeeBreakdown.length === 0 ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Sin datos para mostrar.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {employeeBreakdown.map(([name, data]) => (
            <div key={name} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-lg" style={{ color: C.cream }}>{name}</p>
                <span className="font-mono" style={{ color: C.brassLight }}>{euros(data.total)}</span>
              </div>
              <p style={{ color: C.muted }} className="text-xs mb-3">{data.count} transacciones — Ticket medio: {euros(data.total / data.count)}</p>
              <div className="text-xs space-y-1">
                {data.items.slice(0, 5).map(s => (
                  <div key={s.id} className="flex justify-between" style={{ color: C.muted }}>
                    <span>{s.tableName}</span>
                    <span className="font-mono">{euros(s.total)}</span>
                  </div>
                ))}
                {data.items.length > 5 && <p style={{ color: C.muted }}>... y {data.items.length - 5} más</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Control de caja ----------
function ControlCajaTab({ sales, colors: C }) {
  const [realCount, setRealCount] = useState('0');

  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.closedAt).toDateString() === today);
  
  const expectedCash = todaySales.reduce((sum, s) => {
    const payments = s.payments && s.payments.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
    return sum + payments.filter(p => p.method === 'efectivo').reduce((a, p) => a + p.amount, 0);
  }, 0);

  const realCountNum = parseFloat(realCount) || 0;
  const difference = round2(realCountNum - expectedCash);
  const differenceColor = Math.abs(difference) < 0.005 ? C.sage : difference > 0 ? C.sageLight : C.wineLight;

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-5 max-w-md">
        <p className="font-display text-lg mb-4" style={{ color: C.cream }}>Cuadratura de efectivo</p>
        
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Esperado (según sistema)</p>
            <p className="font-display text-2xl" style={{ color: C.brassLight }}>{euros(expectedCash)}</p>
          </div>
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Efectivo real en caja</p>
            <input
              type="number" step="0.01" value={realCount} onChange={e => setRealCount(e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-3 text-xl font-mono font-bold text-center"
              placeholder="0.00"
            />
          </div>
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Diferencia</p>
            <p className="font-display text-2xl" style={{ color: differenceColor }}>
              {difference > 0 ? '+' : ''}{euros(difference)}
            </p>
            {Math.abs(difference) < 0.005 && <p style={{ color: C.sage }} className="text-xs mt-1">✓ Cuadra perfectamente</p>}
            {difference > 0.01 && <p style={{ color: C.sageLight }} className="text-xs mt-1">Sobrante de {euros(difference)}</p>}
            {difference < -0.01 && <p style={{ color: C.wineLight }} className="text-xs mt-1">Faltante de {euros(Math.abs(difference))}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Vista: Equipo (empleados) ----------
function EmpleadosView({ employees, colors: C, onAdd, onUpdateField, onDelete, confirmDeleteId, setConfirmDeleteId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', pin: '', role: 'camarero' });

  function submit(e) {
    e.preventDefault();
    if (!form.name || !/^\d{4}$/.test(form.pin)) return;
    onAdd(form);
    setForm({ name: '', pin: '', role: 'camarero' });
    setOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>EQUIPO</h2>
        <button onClick={() => setOpen(!open)} style={{ background: C.brass, color: C.base }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Empleado
        </button>
      </div>

      {open && (
        <form onSubmit={submit} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre" style={{ background: C.surfaceLight, color: C.cream }} className="rounded-md px-3 py-2 text-sm col-span-2" />
          <input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="PIN (4 dígitos)" style={{ background: C.surfaceLight, color: C.cream }} className="rounded-md px-3 py-2 text-sm font-mono" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ background: C.surfaceLight, color: C.cream }} className="rounded-md px-3 py-2 text-sm">
            <option value="camarero">Camarero</option>
            <option value="admin">Administrador</option>
          </select>
          <button type="submit" style={{ background: C.sage, color: '#fff' }} className="rounded-md py-2 text-sm font-medium col-span-2 sm:col-span-4">Añadir al equipo</button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {employees.map(emp => (
          <div key={emp.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-lg p-3 flex flex-wrap items-center gap-3">
            <div style={{ background: C.surfaceLight }} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0">
              {emp.role === 'admin' ? <ShieldCheck className="w-4 h-4" style={{ color: C.brassLight }} /> : <User className="w-4 h-4" style={{ color: C.muted }} />}
            </div>
            <input
              defaultValue={emp.name}
              onBlur={e => onUpdateField(emp.id, 'name', e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="rounded-md px-2 py-1.5 text-sm flex-1 min-w-[6rem]"
            />
            <input
              defaultValue={emp.pin}
              onBlur={e => onUpdateField(emp.id, 'pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ background: C.surfaceLight, color: C.cream, width: 72 }}
              className="font-mono rounded-md px-2 py-1.5 text-sm text-center"
              maxLength={4}
            />
            <select
              value={emp.role}
              onChange={e => onUpdateField(emp.id, 'role', e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="rounded-md px-2 py-1.5 text-sm"
            >
              <option value="camarero">Camarero</option>
              <option value="admin">Administrador</option>
            </select>
            {confirmDeleteId === emp.id ? (
              <button onClick={() => onDelete(emp.id)} style={{ color: C.wineLight }} className="text-xs font-medium px-2">Confirmar</button>
            ) : (
              <button onClick={() => setConfirmDeleteId(emp.id)} style={{ color: C.muted }} className="p-1.5"><Trash2 className="w-4 h-4" /></button>
            )}
          </div>
        ))}
      </div>
      <p style={{ color: C.muted }} className="text-xs mt-4">El PIN identifica a cada persona en el TPV; es un control de acceso ligero, no un sistema de seguridad bancaria. Compartidlo solo entre el equipo.</p>
    </div>
  );
}
