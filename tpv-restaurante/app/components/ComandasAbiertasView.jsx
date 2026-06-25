"use client";
import { ChefHat, Clock, MapPin, User } from 'lucide-react';
import { TICKET_EDGE, euros } from './constants';

export default function ComandasAbiertasView({ floor, colors: C }) {
  const activeTables = floor.tables.filter(t => t.orderId && floor.orders[t.orderId]);
  
  if (activeTables.length === 0) {
    return (
      <div className="text-center py-16">
        <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
        <p style={{ color: C.muted }} className="text-sm">No hay comandas abiertas en este momento.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-4" style={{ color: C.cream }}>COMANDAS ABIERTAS</h2>
      <p style={{ color: C.muted }} className="text-xs mb-4">{activeTables.length} mesas con pedido activo</p>
      <div className="flex flex-col gap-2">
        {activeTables.map(t => {
          const order = floor.orders[t.orderId];
          const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
          const itemCount = order.items.length;
          const pendingKitchen = order.items.filter(i => i.sent && !i.ready).length;
          const unsentCount = order.items.filter(i => !i.sent).length;
          const minutesSinceCreation = Math.round((Date.now() - order.createdAt) / 60000);
          
          return (
            <div
              key={t.id}
              style={{ background: C.surface, border: `1px solid ${pendingKitchen > 0 ? C.brass : C.line}` }}
              className="rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl" style={{ color: C.cream }}>{t.name}</span>
                  {t.type === 'llevar' && (
                    <span style={{ background: C.surfaceLight, color: C.muted }} className="text-xs px-2 py-0.5 rounded-full">Para llevar</span>
                  )}
                  {t.type === 'domicilio' && (
                    <span style={{ background: C.wine, color: C.cream }} className="text-xs px-2 py-0.5 rounded-full">Domicilio</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                  <Clock className="w-3 h-3" />
                  <span>{minutesSinceCreation}'</span>
                </div>
              </div>
              
              <div className="flex gap-3 text-xs mb-3" style={{ color: C.muted }}>
                <span>{itemCount} artículos</span>
                {unsentCount > 0 && <span style={{ color: C.brassLight }}>{unsentCount} sin enviar</span>}
                {pendingKitchen > 0 && <span style={{ color: C.wineLight }}>{pendingKitchen} en cocina</span>}
              </div>

              <div className="flex flex-col gap-1">
                {order.items.slice(0, 5).map(item => {
                  const effectivePrice = item.price * item.qty;
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="truncate">{item.qty}× {item.name}</span>
                        {item.notes && <span style={{ color: C.muted }} className="text-xs truncate">({item.notes})</span>}
                        {item.sent && !item.ready && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.brass }} />}
                        {item.ready && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.sage }} />}
                      </span>
                      <span className="font-mono shrink-0" style={{ color: C.brassLight }}>{euros(effectivePrice)}</span>
                    </div>
                  );
                })}
                {order.items.length > 5 && (
                  <p style={{ color: C.muted }} className="text-xs">... y {order.items.length - 5} más</p>
                )}
              </div>

              <div className="mt-2 pt-2 flex justify-between border-t text-sm font-semibold" style={{ borderColor: C.line }}>
                <span style={{ color: C.muted }}>Total</span>
                <span style={{ color: C.brassLight }}>{euros(total)}</span>
              </div>

              <p style={{ color: C.muted }} className="text-xs mt-2 flex items-center gap-1">
                <User className="w-3 h-3" /> {order.employeeName || 'Sin asignar'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
