import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { clone } from './constants';

export default function SalonView({ floor, onSelect, persistFloor, colors: C }) {
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
    libre:    { border: C.line,  label: 'Libre',         dot: C.sageLight, bg: C.surface },
    ocupada:  { border: C.brass, label: 'Ocupada',       dot: C.brassLight, bg: C.surface },
    cuenta:   { border: C.wine,  label: 'Cuenta pedida', dot: C.wineLight, bg: C.surface },
    reservada:{ border: C.muted, label: 'Reservada',     dot: C.muted, bg: C.surfaceLight },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>SALÓN</h2>
        <div className="flex items-center gap-2 sm:gap-4 text-xs overflow-x-auto" style={{ color: C.muted }}>
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
            <div
              key={t.id}
              style={{ background: s.bg, border: `2px solid ${s.border}` }}
              className={`rounded-xl p-4 text-left ${t.status === 'cuenta' ? 'pulse-cuenta' : ''}`}
            >
              <div className="flex items-start justify-between mb-1">
                <p className="font-display text-xl" style={{ color: C.cream }}>{t.name}</p>
                {t.isFiado && (
                  <span style={{ background: C.wine, color: C.cream }} className="text-xs font-medium px-2 py-1 rounded-full">
                    Fiado
                  </span>
                )}
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
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 no-print"
          style={{ background: 'rgba(0,0,0,0.65)' }}
        >
          <div
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up"
          >
            <p className="font-display text-lg mb-3" style={{ color: C.cream }}>Reservar mesa</p>
            <input
              type="text"
              value={reservationForm.name}
              onChange={e => setReservationForm({ ...reservationForm, name: e.target.value })}
              placeholder="Nombre cliente"
              style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-2 text-sm mb-2"
              autoFocus
            />
            <input
              type="time"
              value={reservationForm.time}
              onChange={e => setReservationForm({ ...reservationForm, time: e.target.value })}
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
            <button
              onClick={() => { setShowReservationModal(null); setReservationForm({ name: '', time: '' }); }}
              style={{ color: C.muted }}
              className="w-full rounded-lg py-2 text-sm mt-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
