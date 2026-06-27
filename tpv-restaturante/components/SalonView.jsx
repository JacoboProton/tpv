import { useState, useMemo } from 'react';
import { Calendar, Users, ClipboardList, QrCode, Search, Pin, PinOff, Download, MapIcon } from 'lucide-react';
import { clone } from './constants';
import QRCodeModal from './QRCodeModal';

export default function SalonView({ floor, onSelect, persistFloor, colors: C, onEditFloor }) {
  const [showReservationModal, setShowReservationModal] = useState(null);
  const [reservationForm, setReservationForm] = useState({ name: '', time: '', guests: 2 });
  const [qrTableId, setQrTableId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [pinned, setPinned] = useState(true);

  function addReservation(tableId) {
    if (!reservationForm.name || !reservationForm.time) return;
    const nextFloor = clone(floor);
    const table = nextFloor.tables.find(t => t.id === tableId);
    table.reserved = { name: reservationForm.name, time: reservationForm.time, guests: parseInt(reservationForm.guests) || 2 };
    table.status = 'libre';
    persistFloor(nextFloor);
    setShowReservationModal(null);
    setReservationForm({ name: '', time: '', guests: 2 });
  }

  function cancelReservation(tableId) {
    const nextFloor = clone(floor);
    const table = nextFloor.tables.find(t => t.id === tableId);
    table.reserved = null;
    persistFloor(nextFloor);
  }

  const statusStyle = {
    libre:     { border: C.line,  label: 'Libre',     dot: C.sageLight, bg: C.surface },
    ocupada:   { border: C.brass, label: 'Ocupada',   dot: C.brassLight, bg: C.surface },
    cuenta:    { border: C.wine,  label: 'Cuenta',    dot: C.wineLight, bg: C.surface },
    cobrada:   { border: C.sage,  label: 'Cobrada',   dot: C.sage, bg: C.surfaceLight },
    unidas:    { border: C.muted, label: 'Unidas',    dot: C.muted, bg: C.surfaceLight },
    reservada: { border: C.muted, label: 'Reservada', dot: C.muted, bg: C.surfaceLight },
  };

  const occupiedCount = useMemo(() =>
    floor.tables.filter(t => t.status === 'ocupada' || t.status === 'cuenta' || t.status === 'unidas').length,
    [floor.tables]
  );

  const filteredTables = useMemo(() => {
    let tables = floor.tables;
    if (filterStatus !== 'todas') {
      tables = tables.filter(t => {
        let actualStatus = t.status;
        if (t.reserved && !t.orderId) actualStatus = 'reservada';
        return actualStatus === filterStatus;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tables = tables.filter(t =>
        t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
      );
    }
    return tables;
  }, [floor.tables, filterStatus, searchQuery]);

  const filterOptions = [
    { id: 'todas',    label: 'Todas' },
    { id: 'libre',    label: 'Libres' },
    { id: 'ocupada',  label: 'Ocupadas' },
    { id: 'cuenta',   label: 'Pendientes' },
    { id: 'unidas',   label: 'Unidas' },
  ];

  function downloadAllQr() {
    floor.tables.forEach(t => {
      const a = document.createElement('a');
      a.href = `${window.location.origin}/api/qr?mesa=${encodeURIComponent(t.id)}`;
      a.download = `qr-${t.id}.svg`;
      a.click();
    });
  }

  return (
    <div className={pinned ? '' : 'relative'}>
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl" style={{ color: C.cream }}>SALÓN</h2>
          <button
            onClick={() => setPinned(!pinned)}
            style={{ color: C.muted }}
            className="p-1.5 rounded-lg hover:opacity-80"
            title={pinned ? 'Auto-ocultar panel' : 'Anclar panel'}
          >
            {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
          <button
            onClick={downloadAllQr}
            style={{ color: C.muted }}
            className="p-1.5 rounded-lg hover:opacity-80 text-xs flex items-center gap-1"
            title="Descargar QR de todas las mesas"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QR</span>
          </button>
          {onEditFloor && (
            <button
              onClick={onEditFloor}
              style={{ color: C.brassLight, background: C.surfaceLight }}
              className="p-1.5 rounded-lg hover:opacity-80 text-xs flex items-center gap-1"
              title="Ver plano / Editar salón"
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Plano</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {filterOptions.map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                background: filterStatus === f.id ? C.surfaceLight : 'transparent',
                color: filterStatus === f.id ? C.brassLight : C.muted,
                border: `1px solid ${filterStatus === f.id ? C.brass : 'transparent'}`,
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap hover:opacity-80 transition-colors"
            >
              {f.label}
              {f.id === 'ocupada' && occupiedCount > 0 && (
                <span style={{ background: C.brass, color: C.base }} className="ml-1.5 text-xs rounded-full w-4 h-4 inline-flex items-center justify-center font-medium">
                  {occupiedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5" style={{ color: C.muted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar mesa…"
            style={{ background: 'transparent', color: C.cream, minWidth: 100 }}
            className="text-xs outline-none w-full"
          />
        </div>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-2 sm:gap-4 text-xs mb-4 overflow-x-auto" style={{ color: C.muted }}>
        {Object.entries(statusStyle).map(([k, s]) => (
          <span key={k} className="flex items-center gap-1.5 whitespace-nowrap">
            <span style={{ background: s.dot, width: 8, height: 8, borderRadius: 999, display: 'inline-block' }} />
            <span className="hidden sm:inline">{s.label}</span>
          </span>
        ))}
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredTables.map(t => {
          const order = t.orderId ? floor.orders[t.orderId] : null;
          const subtotal = order ? order.items.reduce((s, i) => s + i.price * i.qty, 0) : 0;
          const itemCount = order ? order.items.length : 0;
          let actualStatus = t.status;
        if (t.reserved && !t.orderId) actualStatus = 'reservada';
        if (t.reserved_for && !t.orderId) actualStatus = 'reservada';
          const s = statusStyle[actualStatus];
          const urgent = order && order.items.some(i => i.sent && !i.ready && (Date.now() - (i.sentAt || 0)) / 60000 >= 10);

          return (
            <div
              key={t.id}
              style={{ background: s.bg, border: `2px solid ${urgent ? C.wine : s.border}` }}
              className={`rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] ${t.status === 'cuenta' ? 'pulse-cuenta' : ''} ${urgent ? 'shadow-lg shadow-red-500/20' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-display text-xl" style={{ color: C.cream }}>{t.name}</p>
                <div className="flex items-center gap-1">
                  {t.isFiado && (
                    <span style={{ background: C.wine, color: C.cream }} className="text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      Fiado
                    </span>
                  )}
                  {!t.isFiado && (
                    <span style={{
                      background: t.status === 'ocupada' ? C.brassLight : 'transparent',
                      color: t.status === 'ocupada' ? C.base : 'transparent',
                      minWidth: '24px', minHeight: '24px', borderRadius: 999,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 600,
                    }}>
                      {itemCount > 0 ? itemCount : ''}
                    </span>
                  )}
                </div>
              </div>
              <p style={{ color: s.dot }} className="text-xs font-medium mb-2">{s.label}</p>

              {t.reserved && !t.orderId && (
                <div style={{ background: 'rgba(174,159,140,0.15)' }} className="rounded-md p-2 mb-2">
                  <p style={{ color: C.muted }} className="text-xs font-medium truncate">{t.reserved.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: C.muted }}>{t.reserved.time}</span>
                    <span className="text-xs flex items-center gap-1" style={{ color: C.muted }}>
                      <Users className="w-3 h-3" /> {t.reserved.guests}
                    </span>
                  </div>
                </div>
              )}
              {t.reserved_for && !t.reserved && !t.orderId && (
                <div style={{ background: 'rgba(174,159,140,0.15)' }} className="rounded-md p-2 mb-2">
                  <p style={{ color: C.muted }} className="text-xs font-medium truncate">📋 {t.reserved_for}</p>
                </div>
              )}
              {order && !t.reserved && (
                <p className="font-mono text-sm mt-2" style={{ color: C.muted }}>{subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
              )}

              <div className="flex gap-1 mt-3">
                <button
                  onClick={() => setQrTableId(t.id)}
                  style={{ background: C.surfaceLight, color: C.muted }}
                  className="text-xs py-1.5 rounded-lg hover:opacity-80 flex items-center justify-center gap-0.5 px-1.5"
                  title="QR Carta digital"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
                {t.reserved && !t.orderId && (
                  <button
                    onClick={() => cancelReservation(t.id)}
                    style={{ background: C.surfaceLight, color: C.muted }}
                    className="flex-1 text-xs py-1.5 rounded-lg hover:opacity-80 flex items-center justify-center gap-1"
                  >
                    ✕ Reservar
                  </button>
                )}
                {!t.reserved && t.status === 'libre' && (
                  <button
                    onClick={() => setShowReservationModal(t.id)}
                    style={{ background: C.surfaceLight, color: C.muted }}
                    className="flex-1 text-xs py-1.5 rounded-lg hover:opacity-80 flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Reservar
                  </button>
                )}
                {(t.status !== 'libre' || t.reserved) && (
                  <button
                    onClick={() => onSelect(t.id)}
                    style={{ background: C.brass, color: C.base }}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium hover:opacity-90"
                  >
                    Abrir
                  </button>
                )}
                {t.status === 'libre' && !t.reserved && (
                  <button
                    onClick={() => onSelect(t.id)}
                    style={{ background: C.brass, color: C.base }}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium hover:opacity-90"
                  >
                    Usar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <p className="text-center py-12" style={{ color: C.muted }}>No hay mesas que coincidan con los filtros.</p>
      )}

      {/* Reservation modal */}
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
              className="w-full rounded-lg px-3 py-2.5 text-sm mb-2.5"
              autoFocus
            />
            <div className="flex gap-2 mb-2.5">
              <input
                type="time"
                value={reservationForm.time}
                onChange={e => setReservationForm({ ...reservationForm, time: e.target.value })}
                style={{ background: C.surfaceLight, color: C.cream }}
                className="flex-1 rounded-lg px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                min="1"
                max="20"
                value={reservationForm.guests}
                onChange={e => setReservationForm({ ...reservationForm, guests: parseInt(e.target.value) || 1 })}
                style={{ background: C.surfaceLight, color: C.cream, width: 70 }}
                className="rounded-lg px-2 py-2.5 text-sm text-center"
                placeholder="Pers."
              />
            </div>
            <button
              onClick={() => addReservation(showReservationModal)}
              style={{ background: C.sage, color: '#fff' }}
              className="w-full rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
            >
              Guardar reserva
            </button>
            <button
              onClick={() => { setShowReservationModal(null); setReservationForm({ name: '', time: '', guests: 2 }); }}
              style={{ color: C.muted }}
              className="w-full rounded-lg py-2.5 text-sm mt-1 hover:opacity-80"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {/* QR modal */}
      {qrTableId && <QRCodeModal tableId={qrTableId} onClose={() => setQrTableId(null)} />}
    </div>
  );
}
