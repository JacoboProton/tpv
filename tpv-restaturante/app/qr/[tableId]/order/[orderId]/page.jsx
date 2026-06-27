'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Check, ChefHat, Utensils, Loader2 } from 'lucide-react';

const STATUS_FLOW = [
  { status: 'pending',  label: 'Recibido',     icon: Clock,    color: '#c4a04a' },
  { status: 'paid',     label: 'Pagado',       icon: Check,    color: '#7a9a7c' },
  { status: 'confirmed',label: 'Confirmado',   icon: Check,    color: '#6a9af8' },
  { status: 'preparing',label: 'Preparando',   icon: ChefHat,  color: '#c4a04a' },
  { status: 'ready',    label: 'Listo',        icon: Utensils, color: '#7a9a7c' },
  { status: 'served',   label: 'Servido',      icon: Check,    color: '#7a9a7c' },
];

const ITEM_STATUS_KEYS = ['sent', 'inPreparation', 'ready', 'served'];
const ITEM_LABELS = ['Recibido', 'Preparando', 'Listo', 'Servido'];

export default function QrOrderTrackingPage() {
  const { tableId, orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadOrder() {
    try {
      const r = await fetch(`/api/qr-order?id=${orderId}`);
      if (!r.ok) return;
      const data = await r.json();
      setOrder(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a1a' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c4a04a' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#1a1a1a' }}>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: '#e8e0d4' }}>Pedido no encontrado</p>
          <p className="text-sm mt-1" style={{ color: '#8a8275' }}>Puede que haya sido cancelado</p>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const orderStatus = order.orderStatus || 'pending';
  const currentIdx = STATUS_FLOW.findIndex(s => s.status === orderStatus);

  function getItemStatus(item) {
    if (item.served) return 3;
    if (item.ready) return 2;
    if (item.inPreparation) return 1;
    if (item.sent) return 0;
    return -1;
  }

  return (
    <div className="min-h-screen" style={{ background: '#1a1a1a' }}>
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-bold" style={{ color: '#e8e0d4' }}>Estado del pedido</h1>
          <p className="text-xs mt-1" style={{ color: '#8a8275' }}>Mesa {tableId}</p>
        </div>

        {/* Status stepper */}
        <div className="flex items-center justify-center gap-1">
          {STATUS_FLOW.slice(0, 4).map((s, i) => {
            const done = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s.status} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCurrent ? 'scale-110' : ''}`}
                    style={{ background: done ? s.color + '30' : '#222', border: `2px solid ${done ? s.color : '#333'}` }}>
                    <s.icon className="w-4 h-4" style={{ color: done ? s.color : '#555' }} />
                  </div>
                  <span className="text-[9px] mt-1 font-medium" style={{ color: done ? s.color : '#555' }}>{s.label}</span>
                </div>
                {i < 3 && (
                  <div className="w-8 h-[2px] mx-1" style={{ background: i < currentIdx ? s.color : '#333' }} />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs" style={{ color: '#6b655a' }}>
          {currentIdx >= 3 ? '¡Tu pedido está listo!' : 'Preparando tu pedido…'}
        </p>

        {/* Items */}
        <div className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8a8275' }}>Productos</h2>
          {items.map((item, i) => {
            const itemIdx = getItemStatus(item);
            return (
              <div key={item.id || i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#222' }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0`}
                  style={{ background: itemIdx >= 3 ? '#7a9a7c30' : itemIdx >= 0 ? '#c4a04a30' : '#333' }}>
                  {itemIdx >= 3 ? <Check className="w-3 h-3" style={{ color: '#7a9a7c' }} /> :
                   itemIdx >= 0 ? <ChefHat className="w-3 h-3" style={{ color: '#c4a04a' }} /> :
                   <Clock className="w-3 h-3" style={{ color: '#555' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#e8e0d4' }}>{item.name}</p>
                  <p className="text-[10px]" style={{ color: '#6b655a' }}>
                    {itemIdx >= 0 ? ITEM_LABELS[itemIdx] : 'Pendiente'} · {item.qty}x · {(item.price * item.qty).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <button onClick={() => { window.location.href = `/qr/${tableId}`; }}
            className="px-6 py-2.5 rounded-lg text-xs font-medium hover:opacity-80"
            style={{ background: '#333', color: '#8a8275' }}>
            Seguir pidiendo
          </button>
        </div>
      </div>
    </div>
  );
}
