"use client";

import { useState, useEffect, useMemo } from 'react';
import { ChefHat, Clock, Check } from 'lucide-react';
import { TICKET_EDGE, type Theme } from '@/components/constants';

const COURSE_COLORS: Record<string, string> = { Entrantes: '#7a9a7c', Principales: '#c4a04a', Postres: '#b05e5e' };

interface CocinaItem {
  id: string;
  productId?: string;
  name: string;
  qty: number;
  sent: boolean;
  ready: boolean;
  ubicacion: string;
  sentAt?: number;
  course: string;
}

interface CocinaOrder {
  id: string;
  items: CocinaItem[];
}

interface CocinaTable {
  id: string;
  name: string;
  orderId: string;
}

interface CocinaFloor {
  tables: CocinaTable[];
  orders: Record<string, CocinaOrder>;
}

interface CocinaViewProps {
  floor: CocinaFloor;
  catalog?: any;
  onReady: (orderId: string, ubicacion: string) => void;
  colors: Theme;
}

export default function CocinaView({ floor, catalog, onReady, colors: C }: CocinaViewProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const tickets = useMemo(() => floor.tables
    .filter(t => t.orderId && floor.orders[t.orderId])
    .map(t => ({ table: t, order: floor.orders[t.orderId] }))
    .filter(({ order }) => order.items.some(i => i.sent && !i.ready && i.ubicacion !== 'Bar')),
  [floor]);

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
        <p style={{ color: C.muted }} className="text-sm">
          No hay comandas pendientes. Cuando un camarero env&iacute;e un pedido, aparecer&aacute; aqu&iacute;.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-4" style={{ color: C.cream }}>COCINA</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tickets.map(({ table, order }) => {
          const pending = order.items.filter(i => i.sent && !i.ready && i.ubicacion !== 'Bar');
          const sentAts = pending.map(i => i.sentAt || now);
          const minutesAgo = Math.max(0, Math.round((now - Math.min(...sentAts)) / 60000));
          const urgent = minutesAgo >= 10;

          const coursesInTicket = [...new Set(pending.map(i => i.course).filter(Boolean))] as string[];
          const noCourseItems = pending.filter(i => !i.course).length;

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
              <div style={{ background: urgent ? '#b05e5e' : C.cream, color: urgent ? C.cream : C.base }} className="p-3 font-mono">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display text-lg">{table.name}</p>
                  <span
                    style={{ color: urgent ? '#ffc1c1' : '#9a8e80' }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                  >
                    <Clock className="w-3.5 h-3.5" /> {minutesAgo}&apos;
                  </span>
                </div>

                {coursesInTicket.map(course => {
                  const courseItems = pending.filter(i => i.course === course);
                  return (
                    <div key={course} className="mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: COURSE_COLORS[course] || C.muted }}>
                        {course}
                      </p>
                      <ul className={`text-sm space-y-1 ${urgent ? 'font-semibold' : ''}`}>
                        {courseItems.map(i => {
                          const img = catalog?.products?.find((p: any) => p.id === i.productId)?.image;
                          return (
                            <li key={i.id} className="flex items-center gap-1.5">
                              {img && <img src={img} alt="" className="w-5 h-5 rounded object-cover shrink-0" />}
                              {i.qty}× {i.name}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}

                {noCourseItems > 0 && (
                  <div className="mb-2">
                    <ul className={`text-sm space-y-1 ${urgent ? 'font-semibold' : ''}`}>
                      {pending.filter(i => !i.course).map(i => {
                        const img = catalog?.products?.find((p: any) => p.id === i.productId)?.image;
                        return (
                          <li key={i.id} className="flex items-center gap-1.5">
                            {img && <img src={img} alt="" className="w-5 h-5 rounded object-cover shrink-0" />}
                            {i.qty}× {i.name}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => onReady(order.id, 'Cocina')}
                  style={{ background: urgent ? '#fff' : C.sage, color: urgent ? C.wineLight : '#fff' }}
                  className="w-full rounded-md py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
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
