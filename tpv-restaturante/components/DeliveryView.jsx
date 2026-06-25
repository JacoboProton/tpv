"use client";

import { useState, useEffect } from 'react';
import { Truck, User, MapPin, Clock, Check, Phone, X, Plus } from 'lucide-react';
import {
  fetchDeliveryRunners, saveDeliveryRunners, deleteDeliveryRunner,
  fetchDeliveryOrders, createDeliveryOrder, updateDeliveryOrder, addDeliveryTracking,
} from '../lib/api';
import { euros } from './constants';

const C = {
  base: '#0f0d0a', surface: '#1a1714', surfaceLight: '#26221e',
  cream: '#efeae0', muted: '#8a8075', line: '#2e2a26',
  brass: '#c9a96e', brassLight: '#e0c898',
  sage: '#7a8b6a', sageLight: '#9eb08a',
  wine: '#6b3a3a', wineLight: '#a06050',
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  ready: 'Listo',
  en_ruta: 'En ruta',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS = {
  pending: C.wineLight,
  preparing: C.brass,
  ready: C.sageLight,
  en_ruta: C.brassLight,
  delivered: C.sage,
  cancelled: C.muted,
};

export default function DeliveryView({ catalog }) {
  const [runners, setRunners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showRunnerForm, setShowRunnerForm] = useState(false);
  const [newRunner, setNewRunner] = useState({ name: '', phone: '', active: true });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [form, setForm] = useState({ customerName: '', customerPhone: '', address: '', notes: '', items: [] });
  const [selectedProduct, setSelectedProduct] = useState('');

  const load = () => {
    fetchDeliveryRunners().then(setRunners).catch(() => setRunners([]));
    fetchDeliveryOrders().then(setOrders).catch(() => setOrders([]));
  };

  useEffect(() => { load(); }, []);

  async function addRunner() {
    if (!newRunner.name.trim()) return;
    await saveDeliveryRunners([{ id: 'dr_' + Date.now(), ...newRunner }]);
    setNewRunner({ name: '', phone: '', active: true });
    setShowRunnerForm(false);
    fetchDeliveryRunners().then(setRunners).catch(() => setRunners([]));
  }

  async function removeRunner(id) {
    await deleteDeliveryRunner(id);
    fetchDeliveryRunners().then(setRunners).catch(() => setRunners([]));
  }

  async function updateStatus(orderId, status) {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    await updateDeliveryOrder({ id: orderId, status });
    if (status === 'en_ruta') {
      await addDeliveryTracking({ deliveryId: orderId, status: 'en_ruta', note: 'Repartidor en camino' });
    }
    if (status === 'delivered') {
      await updateDeliveryOrder({ id: orderId, status, deliveredAt: now });
      await addDeliveryTracking({ deliveryId: orderId, status: 'delivered', note: 'Entregado' });
    }
    fetchDeliveryOrders().then(setOrders).catch(() => setOrders([]));
  }

  function addProductToForm() {
    if (!selectedProduct) return;
    const p = catalog?.products?.find(pr => pr.id === selectedProduct);
    if (!p) return;
    setForm(f => ({
      ...f,
      items: [...f.items, { productId: p.id, name: p.name, price: parseFloat(p.price), qty: 1 }],
    }));
    setSelectedProduct('');
  }

  function removeFormItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  async function submitOrder() {
    if (!form.customerName.trim() || !form.address.trim() || form.items.length === 0) return;
    const data = {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      items: form.items,
    };
    await createDeliveryOrder(data);
    setForm({ customerName: '', customerPhone: '', address: '', notes: '', items: [] });
    setShowNewOrder(false);
    fetchDeliveryOrders().then(setOrders).catch(() => setOrders([]));
  }

  const products = catalog?.products || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>REPARTIDORES</h2>
        <button
          onClick={() => setShowRunnerForm(v => !v)}
          style={{ background: C.sage, color: '#fff' }}
          className="text-sm px-3 py-2 rounded-lg flex items-center gap-1.5"
        >
          <User className="w-4 h-4" /> {showRunnerForm ? 'Cerrar' : 'Añadir'}
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {runners.map(r => (
          <div
            key={r.id}
            style={{ background: C.surface, border: `1px solid ${C.line}`, opacity: r.active ? 1 : 0.5 }}
            className="rounded-lg px-3 py-2 flex items-center gap-2 text-sm"
          >
            <User className="w-3.5 h-3.5" style={{ color: C.sageLight }} />
            <span style={{ color: C.cream }}>{r.name}</span>
            {r.phone && <span style={{ color: C.muted }}>({r.phone})</span>}
            <button onClick={() => removeRunner(r.id)} style={{ color: C.wineLight }} className="ml-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {showRunnerForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-6 flex gap-3 items-end">
          <div className="flex-1">
            <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Nombre</p>
            <input value={newRunner.name} onChange={e => setNewRunner({ ...newRunner, name: e.target.value })}
              style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" placeholder="Nombre" />
          </div>
          <div className="flex-1">
            <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Teléfono</p>
            <input value={newRunner.phone} onChange={e => setNewRunner({ ...newRunner, phone: e.target.value })}
              style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" placeholder="Teléfono" />
          </div>
          <button onClick={addRunner} style={{ background: C.sage, color: '#fff' }} className="px-4 py-2 rounded-lg text-sm">Guardar</button>
        </div>
      )}

      {/* Header pedidos */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>PEDIDOS A DOMICILIO</h2>
        <button
          onClick={() => setShowNewOrder(v => !v)}
          style={{ background: C.brass, color: C.base }}
          className="text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 font-medium"
        >
          <Plus className="w-4 h-4" /> Nuevo pedido
        </button>
      </div>

      {/* Formulario nuevo pedido */}
      {showNewOrder && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-6">
          <p style={{ color: C.cream }} className="font-medium mb-3">Nuevo pedido a domicilio</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Nombre</p>
              <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" placeholder="Cliente" />
            </div>
            <div>
              <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Teléfono</p>
              <input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" placeholder="Teléfono" />
            </div>
          </div>
          <div className="mb-3">
            <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Dirección</p>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" placeholder="Calle, número, ciudad" />
          </div>
          <div className="mb-3">
            <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Notas</p>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ background: C.surfaceLight, color: C.cream }} className="w-full rounded-lg px-3 py-2 text-sm" placeholder="Instrucciones de entrega" />
          </div>

          {/* Selector de productos */}
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Productos</p>
          <div className="flex gap-2 mb-3">
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="flex-1 rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccionar producto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {euros(p.price)}</option>
              ))}
            </select>
            <button onClick={addProductToForm}
              style={{ background: C.sage, color: '#fff' }} className="px-3 py-2 rounded-lg text-sm">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {form.items.length > 0 && (
            <div style={{ background: C.surfaceLight, borderRadius: 8 }} className="p-2 mb-3">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 px-1 text-sm">
                  <span style={{ color: C.cream }}>{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ color: C.brassLight }} className="font-mono">{euros(item.price)}</span>
                    <button onClick={() => removeFormItem(idx)} style={{ color: C.wineLight }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-1 mt-1 flex justify-between text-sm" style={{ borderColor: C.line, color: C.brass }}>
                <span>Total</span>
                <span className="font-mono">{euros(form.items.reduce((s, i) => s + i.price * i.qty, 0))}</span>
              </div>
            </div>
          )}

          <button onClick={submitOrder}
            style={{ background: C.brass, color: C.base, opacity: form.customerName && form.address && form.items.length > 0 ? 1 : 0.5 }}
            className="w-full py-2 rounded-lg font-medium text-sm mt-2">
            Crear pedido
          </button>
        </div>
      )}

      {/* Lista de pedidos */}
      <div className="flex flex-col gap-3">
        {orders.map(o => {
          const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
          const total = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (i.qty || 1), 0);
          const date = new Date(o.created_at).toLocaleString('es-ES');
          return (
            <div
              key={o.id}
              style={{ background: C.surface, border: `1px solid ${C.line}` }}
              className="rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span style={{ color: C.cream }} className="font-medium">{o.customer_name}</span>
                  {o.customer_phone && (
                    <a href={`tel:${o.customer_phone}`} style={{ color: C.sageLight }} className="ml-2 text-xs">
                      <Phone className="w-3 h-3 inline mr-0.5" />{o.customer_phone}
                    </a>
                  )}
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: STATUS_COLORS[o.status] + '22', color: STATUS_COLORS[o.status] }}
                >{STATUS_LABELS[o.status]}</span>
              </div>

              <div style={{ color: C.muted }} className="text-xs mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {o.address}
              </div>

              {o.notes && <p style={{ color: C.muted }} className="text-xs mb-2 italic">{o.notes}</p>}

              {/* Items del pedido */}
              {items.length > 0 && (
                <div style={{ background: C.surfaceLight, borderRadius: 6 }} className="p-2 mb-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                      <span style={{ color: C.cream }}>{item.name}</span>
                      <span style={{ color: C.brassLight }} className="font-mono">{item.qty || 1} × {euros(item.price)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-1 mt-1 flex justify-between text-xs" style={{ borderColor: C.line, color: C.brass }}>
                    <span>Total</span>
                    <span className="font-mono">{euros(total)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs" style={{ color: C.muted }}>
                <Clock className="w-3 h-3" /> {date}
                {o.runner_id && <span className="ml-2">· Repartidor asignado</span>}
              </div>

              {o.status !== 'delivered' && o.status !== 'cancelled' && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {o.status === 'pending' && (
                    <button onClick={() => updateStatus(o.id, 'preparing')}
                      style={{ background: C.brass, color: C.base }} className="text-xs px-3 py-1.5 rounded-lg font-medium">
                      Preparando
                    </button>
                  )}
                  {o.status === 'preparing' && (
                    <button onClick={() => updateStatus(o.id, 'ready')}
                      style={{ background: C.sageLight, color: C.base }} className="text-xs px-3 py-1.5 rounded-lg font-medium">
                      Listo
                    </button>
                  )}
                  {o.status === 'ready' && (
                    <button onClick={() => updateStatus(o.id, 'en_ruta')}
                      style={{ background: C.brassLight, color: C.base }} className="text-xs px-3 py-1.5 rounded-lg font-medium">
                      En ruta
                    </button>
                  )}
                  {o.status === 'en_ruta' && (
                    <button onClick={() => updateStatus(o.id, 'delivered')}
                      style={{ background: C.sage, color: '#fff' }} className="text-xs px-3 py-1.5 rounded-lg font-medium">
                      <Check className="w-3 h-3 inline mr-1" /> Entregado
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="text-center py-12" style={{ color: C.muted }}>
            <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay pedidos a domicilio</p>
          </div>
        )}
      </div>
    </div>
  );
}
