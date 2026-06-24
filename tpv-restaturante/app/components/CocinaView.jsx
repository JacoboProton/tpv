import { ChefHat, Clock, Check } from 'lucide-react';
import { TICKET_EDGE } from './constants';

export default function CocinaView({ floor, onReady, colors: C }) {
  const tickets = floor.tables
    .filter(t => t.orderId)
    .map(t => ({ table: t, order: floor.orders[t.orderId] }))
    .filter(({ order }) => order.items.some(i => i.sent && !i.ready));

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
        <p style={{ color: C.muted }} className="text-sm">
          No hay comandas pendientes. Cuando un camarero envíe un pedido, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-4" style={{ color: C.cream }}>COCINA</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tickets.map(({ table, order }) => {
          const pending = order.items.filter(i => i.sent && !i.ready);
          const minutesAgo = Math.max(
            0,
            Math.round((Date.now() - Math.min(...pending.map(i => i.sentAt || Date.now()))) / 60000)
          );
          const urgent = minutesAgo >= 10;

          return (
            <div
              key={order.id}
              style={{ border: `1px solid ${urgent ? C.wine : C.line}` }}
              className="rounded-lg overflow-hidden"
            >
              <div style={TICKET_EDGE} />
              <div style={{ background: C.cream, color: C.base }} className="p-3 font-mono">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display text-lg">{table.name}</p>
                  <span
                    style={{ color: urgent ? C.wine : '#8a7c68' }}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Clock className="w-3.5 h-3.5" /> {minutesAgo} min
                  </span>
                </div>
                <ul className="text-sm space-y-1 mb-3">
                  {pending.map(i => <li key={i.id}>{i.qty}× {i.name}</li>)}
                </ul>
                <button
                  onClick={() => onReady(order.id)}
                  style={{ background: C.sage, color: '#fff' }}
                  className="w-full rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1.5"
                >
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
