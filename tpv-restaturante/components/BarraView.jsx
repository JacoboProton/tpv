"use client";

import { useState, useEffect, useMemo } from 'react';
import { Beer, Clock, Check } from 'lucide-react';
import { TICKET_EDGE } from './constants';

export default function BarraView({ floor, onReady, colors: C }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const tickets = useMemo(() => floor.tables
    .filter(t => t.orderId && floor.orders[t.orderId])
    .map(t => ({ table: t, order: floor.orders[t.orderId] }))
    .filter(({ order }) => order.items.some(i => i.sent && !i.ready && i.ubicacion === 'Bar')),
  [floor]);

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <Beer className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
        <p style={{ color: C.muted }} className="text-sm">
          No hay comandas pendientes en barra. Cuando un camarero env&iacute;e bebidas, aparecer&aacute;n aqu&iacute;.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-4" style={{ color: C.cream }}>BARRA</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tickets.map(({ table, order }) => {
          const pending = order.items.filter(i => i.sent && !i.ready && i.ubicacion === 'Bar');
          if (pending.length === 0) return null;
          const sentAts = pending.map(i => i.sentAt || now);
          const minutesAgo = Math.max(0, Math.round((now - Math.min(...sentAts)) / 60000));
          const urgent = minutesAgo >= 10;

          return (
            <div
              key={order.id}
              style={{
                background: C.surface,
                border: `1px solid ${urgent ? C.wine : C.line}`,
                boxShadow: urgent ? '0 0 20px rgba(176,94,94,0.3)' : 'none'
              }}
              className={`rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg ${urgent ? 'animate-pulse' : ''}`}
            >
              <div style={TICKET_EDGE} />
              <div style={{ background: urgent ? '#b05e5e' : C.brass, color: urgent ? C.cream : C.base }} className="p-3 font-mono">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display text-lg">{table.name}</p>
                  <span
                    style={{ color: urgent ? '#ffc1c1' : '#9a8e80' }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                  >
                    <Clock className="w-3.5 h-3.5" /> {minutesAgo}&apos;
                  </span>
                </div>

                <ul className={`text-sm space-y-1 ${urgent ? 'font-semibold' : ''}`}>
                  {pending.map(i => <li key={i.id}>{i.qty}× {i.name}{i.notes ? ` (${i.notes})` : ''}</li>)}
                </ul>

                <button
                  onClick={() => onReady(order.id, 'Bar')}
                  style={{ background: urgent ? '#fff' : C.sage, color: urgent ? C.wineLight : '#fff' }}
                  className="w-full rounded-md py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity mt-3"
                >
                  <Check className="w-4 h-4" /> Listo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
