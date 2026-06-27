'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock, Check, ChefHat, Utensils, Truck, Store, User, Phone, MapPin, Euro, Loader2, RefreshCw, Search, X, Zap } from 'lucide-react';

const STATUS_LABELS = {
  pending:    { label: 'Recibido',     color: '#c4a04a', icon: Clock,    next: 'paid' },
  paid:       { label: 'Pagado',       color: '#6a9af8', icon: Check,    next: 'confirmed' },
  confirmed:  { label: 'Confirmado',   color: '#7a9a7c', icon: Check,    next: 'preparing' },
  preparing:  { label: 'Preparando',   color: '#c4a04a', icon: ChefHat,  next: 'ready' },
  ready:      { label: 'Listo',        color: '#7a9a7c', icon: Utensils, next: 'en_camino' },
  en_camino:  { label: 'En Camino',    color: '#6a9af8', icon: Truck,    next: 'delivered' },
  delivered:  { label: 'Entregado',    color: '#7a9a7c', icon: Check,    next: null },
  cancelled:  { label: 'Cancelado',    color: '#b05e5e', icon: X,        next: null },
};

const STATUS_FLOW = ['pending','paid','confirmed','preparing','ready','en_camino','delivered'];

const MODALITY_LABELS = {
  dinein:    { label: 'Mesa',   color: '#c4a04a', icon: Store },
  pickup:    { label: 'Recogida', color: '#6a9af8', icon: Store },
  delivery:  { label: 'Domicilio', color: '#7a9a7c', icon: Truck },
};

export default function OnlineOrdersView({ colors: C }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const r = await fetch('/api/qr-order');
      if (r.ok) setOrders(await r.json());
    } catch {}
    setLoading(false);
  }

  async function advanceStatus(order) {
    const cfg = STATUS_LABELS[order.orderStatus];
    if (!cfg?.next) return;
    try {
      await fetch('/api/qr-order', {
        method: 'PUT',
        body: JSON.stringify({ action: 'status', id: order.id, status: cfg.next }),
      });
      loadOrders();
    } catch {}
  }

  async function acceptOrder(id) {
    try {
      await fetch('/api/qr-order', {
        method: 'PUT',
        body: JSON.stringify({ action: 'accept', id }),
      });
      loadOrders();
    } catch {}
  }

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === 'open') list = list.filter(o => !['delivered','cancelled'].includes(o.orderStatus) && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled');
    else if (filter === 'closed') list = list.filter(o => o.orderStatus === 'delivered');
    else if (filter === 'cancelled') list = list.filter(o => o.orderStatus === 'cancelled');
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o => (o.customerName || '').toLowerCase().includes(q) || (o.customerPhone || '').includes(q) || o.id.includes(q));
    }
    return list;
  }, [orders, filter, searchTerm]);

  const stats = useMemo(() => {
    const active = orders.filter(o => !['delivered','cancelled'].includes(o.orderStatus));
    const received = orders.filter(o => o.orderStatus === 'pending');
    const preparing = orders.filter(o => o.orderStatus === 'preparing');
    const ready = orders.filter(o => o.orderStatus === 'ready');
    const completed = orders.filter(o => o.orderStatus === 'delivered');
    const todayRevenue = orders
      .filter(o => o.createdAt > Date.now() - 86400000)
      .reduce((s, o) => s + Number(o.amount || 0) + Number(o.deliveryCost || 0), 0);
    return { active: active.length, received: received.length, preparing: preparing.length, ready: ready.length, completed: completed.length, revenue: todayRevenue };
  }, [orders]);

  function timeAgo(ts) {
    if (!ts) return '';
    const min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    return `Hace ${h}h ${min % 60}min`;
  }

  if (loading && orders.length === 0) {
    return <div className="text-center py-12" style={{ color: C.muted }}><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>Pedidos Online</h2>
        <button onClick={loadOrders} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.surfaceLight, color: C.muted }}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refrescar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Activos',     value: stats.active,     color: C.brassLight },
          { label: 'Recibidos',   value: stats.received,   color: C.brass },
          { label: 'Preparando',  value: stats.preparing,  color: C.brassLight },
          { label: 'Listos',      value: stats.ready,      color: C.sage },
          { label: 'Hoy',         value: `${stats.revenue.toFixed(0)} €`, color: C.cream },
        ].map(s => (
          <div key={s.label} className="p-2 rounded-lg text-center" style={{ background: C.surfaceLight }}>
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px]" style={{ color: C.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 flex-wrap">
        {[{ id: 'open', label: 'Abiertos' }, { id: 'closed', label: 'Cerrados' }, { id: 'cancelled', label: 'Cancelados' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium"
            style={{ background: filter === f.id ? C.surfaceLight : 'transparent', color: filter === f.id ? C.brassLight : C.muted }}>
            {f.label}
          </button>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: C.muted }} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar…"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: '1.5rem' }}
            className="w-full rounded-lg px-3 py-1.5 text-[10px]" />
        </div>
      </div>

      {/* Order list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: C.muted }}>
            <p className="text-sm">No hay pedidos</p>
          </div>
        )}
        {filtered.slice(0, 50).map(order => {
          const statusCfg = STATUS_LABELS[order.orderStatus] || STATUS_LABELS.pending;
          const modCfg = MODALITY_LABELS[order.modality] || MODALITY_LABELS.dinein;
          const items = order.items || [];
          const total = Number(order.amount || 0) + Number(order.deliveryCost || 0);
          return (
            <div key={order.id} className="p-3 rounded-xl space-y-2" style={{ background: C.surfaceLight, borderLeft: `4px solid ${statusCfg.color}` }}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5" style={{ background: modCfg.color + '30', color: modCfg.color }}>
                    <modCfg.icon className="w-2.5 h-2.5" /> {modCfg.label}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: C.muted }}>#{order.id.slice(-8)}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: statusCfg.color + '30', color: statusCfg.color }}>
                    <statusCfg.icon className="w-2.5 h-2.5 inline mr-0.5" />{statusCfg.label}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: C.muted }}>{timeAgo(order.createdAt)}</span>
              </div>

              {/* Customer */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]" style={{ color: C.muted }}>
                {order.customerName && <span><User className="w-2.5 h-2.5 inline mr-0.5" />{order.customerName}</span>}
                {order.customerPhone && <span><Phone className="w-2.5 h-2.5 inline mr-0.5" />{order.customerPhone}</span>}
                {order.address && <span><MapPin className="w-2.5 h-2.5 inline mr-0.5" />{order.address}</span>}
              </div>

              {/* Items */}
              <div className="text-[10px]" style={{ color: C.cream }}>
                {items.slice(0, 3).map((it, i) => (
                  <span key={i} className="block">{it.qty}x {it.name} — {(it.price * it.qty).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                ))}
                {items.length > 3 && <span className="text-[9px]" style={{ color: C.muted }}>+{items.length - 3} más</span>}
              </div>

              {/* Totals */}
              <div className="flex items-center gap-3 text-[10px]" style={{ color: C.muted }}>
                <span>Subtotal: {Number(order.amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                {order.deliveryCost > 0 && <span>Envío: {Number(order.deliveryCost).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>}
                <span className="font-bold" style={{ color: C.cream }}>Total: {total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 pt-1">
                {!order.accepted && order.orderStatus === 'pending' && (
                  <button onClick={() => acceptOrder(order.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
                    style={{ background: C.sage + '30', color: C.sage }}>
                    <Check className="w-3 h-3" /> Aceptar
                  </button>
                )}
                {statusCfg.next && (order.accepted || order.orderStatus !== 'pending') && (
                  <button onClick={() => advanceStatus(order)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
                    style={{ background: C.brass + '30', color: C.brassLight }}>
                    <Zap className="w-3 h-3" />
                    {STATUS_LABELS[statusCfg.next]?.label || 'Avanzar'}
                  </button>
                )}
                {!['delivered','cancelled'].includes(order.orderStatus) && (
                  <button onClick={async () => {
                    if (!confirm('¿Cancelar pedido?')) return;
                    await fetch('/api/qr-order', { method: 'PUT', body: JSON.stringify({ action: 'status', id: order.id, status: 'cancelled' }) });
                    loadOrders();
                  }}
                    className="px-2 py-1.5 rounded-lg text-[10px] hover:opacity-80"
                    style={{ color: C.wineLight }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
