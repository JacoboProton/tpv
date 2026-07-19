'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Clock, Users, Phone, Mail, MapPin, Check, Trash2, Search } from 'lucide-react';
import type { Theme } from '@/components/constants';
import ReservaSettingsView from '@/components/ReservaSettingsView';

interface Reservation {
  id: string;
  date: string;
  time: string;
  pax: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  zone: string;
  notes: string;
  tableId: string;
  customerId: string;
  depositAmount: number;
  depositPaid: boolean;
  source: string;
  createdAt: number;
  updatedAt: number;
}

interface FloorTable {
  id: string;
  name: string;
  type: string;
  seats: number;
  reserved_for?: string;
}

interface FloorZone {
  id: string;
  name: string;
}

interface Floor {
  tables: FloorTable[];
  zones: FloorZone[];
}

interface SlotInfo {
  time: string;
  available: boolean;
  paxRemaining: number;
  overlapping: number;
}

interface SlotData {
  slots: SlotInfo[];
  isClosed: boolean;
  isBlocked: boolean;
  availableSeats: number;
  totalSeats: number;
  existingPax: number;
}

interface ReservasViewProps {
  floor: Floor;
  catalog: unknown;
  colors: Theme;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string | null }> = {
  pendiente:  { label: 'Pendiente',  color: '#c4a04a', next: 'confirmada' },
  confirmada: { label: 'Confirmada', color: '#7a9a7c', next: 'sentada' },
  sentada:    { label: 'Sentada',    color: '#6a9af8', next: null },
  noshow:     { label: 'No-show',    color: '#b05e5e', next: null },
  cancelada:  { label: 'Cancelada',  color: '#9c958a', next: null },
};

const STATUS_FLOW = ['pendiente', 'confirmada', 'sentada', 'noshow', 'cancelada'];

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export default function ReservasView({ floor, catalog, colors: C }: ReservasViewProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [subTab, setSubTab] = useState('calendar');

  useEffect(() => { loadReservations(); }, []);

  async function loadReservations() {
    setLoading(true);
    try {
      const { fetchReservations } = await import('../../lib/api');
      const data = await fetchReservations() as Reservation[];
      setReservations(data || []);
    } catch {}
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = reservations;
    if (statusFilter) list = list.filter(r => r.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.email.toLowerCase().includes(q));
    }
    return list;
  }, [reservations, statusFilter, searchTerm]);

  const visibleReservations = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    if (viewMode === 'month') {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return filtered.filter(r => r.date >= fmt(start) && r.date <= fmt(end));
    }
    if (viewMode === 'week') {
      const start = new Date(cursor); start.setDate(start.getDate() - start.getDay());
      const end = new Date(start); end.setDate(end.getDate() + 6);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return filtered.filter(r => r.date >= fmt(start) && r.date <= fmt(end));
    }
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return filtered.filter(r => r.date === fmt(cursor));
  }, [filtered, cursor, viewMode]);

  const calendarGrid = useMemo(() => {
    if (viewMode !== 'month') return [] as ({ day: number; date: string; isToday: boolean; reservations: Reservation[] } | null)[];
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);
    const cells: ({ day: number; date: string; isToday: boolean; reservations: Reservation[] } | null)[] = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayReservations = visibleReservations.filter(r => r.date === dateStr);
      cells.push({ day: d, date: dateStr, isToday: dateStr === today, reservations: dayReservations });
    }
    return cells;
  }, [cursor, viewMode, visibleReservations]);

  function navigate(dir: number) {
    const d = new Date(cursor);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  }

  function statusColor(status: string) {
    return STATUS_CONFIG[status]?.color || C.muted;
  }

  const headerLabel = viewMode === 'month'
    ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : viewMode === 'week'
    ? `Semana del ${cursor.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
    : cursor.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>Reservas</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
          style={{ background: C.brass + '30', color: C.brassLight }}>
          <Plus className="w-3.5 h-3.5" /> Nueva reserva
        </button>
      </div>

      <div className="flex items-center gap-1 border-b pb-2" style={{ borderColor: C.line }}>
        {[{ id: 'calendar', label: 'Calendario' }, { id: 'settings', label: 'Ajustes' }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: subTab === t.id ? C.surfaceLight : 'transparent', color: subTab === t.id ? C.brassLight : C.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'settings' ? (
        <ReservaSettingsView colors={C} />
      ) : (<>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:opacity-70" style={{ color: C.muted }}><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium px-2" style={{ color: C.cream }}>{headerLabel}</span>
          <button onClick={() => navigate(1)} className="p-1.5 rounded hover:opacity-70" style={{ color: C.muted }}><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCursor(new Date())} className="px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ color: C.brassLight, background: C.brass + '20' }}>Hoy</button>
        </div>
        <div className="flex items-center gap-1">
          {['month', 'week', 'day'].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
              style={{ background: viewMode === m ? C.surfaceLight : 'transparent', color: viewMode === m ? C.brassLight : C.muted }}>
              {m === 'month' ? 'Mes' : m === 'week' ? 'Semana' : 'Día'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => setStatusFilter('')}
          className="px-2.5 py-1 rounded text-[10px] font-medium hover:opacity-80"
          style={{ background: !statusFilter ? C.surfaceLight : 'transparent', color: !statusFilter ? C.cream : C.muted }}>
          Todas
        </button>
        {STATUS_FLOW.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="px-2.5 py-1 rounded text-[10px] font-medium hover:opacity-80"
            style={{ background: statusFilter === s ? STATUS_CONFIG[s].color + '30' : 'transparent', color: statusFilter === s ? STATUS_CONFIG[s].color : C.muted, border: statusFilter === s ? `1px solid ${STATUS_CONFIG[s].color}` : 'none' }}>
            {STATUS_CONFIG[s].label}
          </button>
        ))}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: C.muted }} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente…"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: '1.75rem' }}
            className="w-full rounded-lg px-3 py-1.5 text-xs" />
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-7">
            {DAYS.map(d => (
              <div key={d} className="px-2 py-1.5 text-[10px] font-medium text-center" style={{ background: C.surfaceLight, color: C.muted }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarGrid.map((cell, i) => (
              <div key={i} className="min-h-[80px] p-1 border-t border-l" style={{ borderColor: C.line, background: cell?.isToday ? C.brass + '12' : 'transparent' }}>
                {cell && (
                  <div className="h-full">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-medium" style={{ color: cell.isToday ? C.brassLight : C.muted }}>{cell.day}</span>
                      <button onClick={() => { setCursor(new Date(cell.date)); setViewMode('day'); }} className="text-[8px] hover:opacity-70" style={{ color: C.muted }}>+</button>
                    </div>
                    {cell.reservations.slice(0, 3).map(r => (
                      <div key={r.id} onClick={() => { setEditing(r); setShowForm(true); }}
                        className="text-[8px] px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80"
                        style={{ background: statusColor(r.status) + '30', color: statusColor(r.status), borderLeft: `2px solid ${statusColor(r.status)}` }}>
                        {r.time.slice(0, 5)} {r.name} ({r.pax})
                      </div>
                    ))}
                    {cell.reservations.length > 3 && (
                      <div className="text-[8px] px-1" style={{ color: C.muted }}>+{cell.reservations.length - 3} más</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="space-y-2">
          {visibleReservations.length === 0 ? (
            <div className="text-center py-12" style={{ color: C.muted }}>
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay reservas en este período</p>
            </div>
          ) : (
            (viewMode === 'week' ? groupByDate(visibleReservations) : [{'': visibleReservations}]).flatMap((group, gi) => {
              const dateEntries = viewMode === 'week' ? Object.entries(group) : [['', group[''] || []]] as [string, Reservation[]][];
              return dateEntries.map(([dateStr, dayRes]) => (
                <div key={dateStr || gi} className="space-y-1">
                  {dateStr && (
                    <p className="text-xs font-medium px-1 py-1" style={{ color: C.brassLight }}>
                      {new Date(dateStr + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  )}
                  {[...dayRes].sort((a, b) => a.time.localeCompare(b.time)).map(r => (
                    <ReservationCard key={r.id} reservation={r} C={C}
                      onEdit={() => { setEditing(r); setShowForm(true); }}
                      onChangeStatus={async (newStatus: string) => {
                        try {
                          const { saveReservation } = await import('../../lib/api');
                          await saveReservation({ ...r, status: newStatus });
                          loadReservations();
                        } catch {}
                      }}
                      onDelete={async () => {
                        if (!confirm('¿Eliminar esta reserva?')) return;
                        try {
                          const { deleteReservation } = await import('../../lib/api');
                          await deleteReservation(r.id);
                          loadReservations();
                        } catch {}
                      }} />
                  ))}
                </div>
              ));
            })
          )}
        </div>
      )}

      {showForm && (
        <ReservationForm reservation={editing} onSave={async (data: Reservation) => {
          try {
            const { saveReservation } = await import('../../lib/api');
            await saveReservation(data);
            setShowForm(false);
            setEditing(null);
            loadReservations();
          } catch {}
        }} onClose={() => { setShowForm(false); setEditing(null); }} floor={floor} C={C} />
      )}
      </>)}
    </div>
  );
}

function groupByDate(reservations: Reservation[]): Record<string, Reservation[]>[] {
  const groups: Record<string, Reservation[]> = {};
  for (const r of reservations) {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  }
  return [groups];
}

function ReservationCard({ reservation: r, C, onEdit, onChangeStatus, onDelete }: {
  reservation: Reservation;
  C: Theme;
  onEdit: () => void;
  onChangeStatus: (status: string) => void;
  onDelete: () => void;
}) {
  const config = STATUS_CONFIG[r.status];
  const nextStatus = config.next;
  const zoneLabel = r.zone || '';
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: C.surfaceLight, borderLeft: `4px solid ${config.color}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm" style={{ color: C.cream }}>{r.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: config.color + '30', color: config.color }}>{config.label}</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] mt-0.5" style={{ color: C.muted }}>
          <span><Clock className="w-3 h-3 inline mr-0.5" />{r.time.slice(0, 5)}</span>
          <span><Users className="w-3 h-3 inline mr-0.5" />{r.pax} pax</span>
          {r.phone && <span><Phone className="w-3 h-3 inline mr-0.5" />{r.phone}</span>}
          {r.email && <span><Mail className="w-3 h-3 inline mr-0.5" />{r.email}</span>}
          {zoneLabel && <span><MapPin className="w-3 h-3 inline mr-0.5" />{zoneLabel}</span>}
          {r.tableId && <span>Mesa asignada</span>}
          {r.notes && <span className="truncate max-w-[200px] opacity-70">📝 {r.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {nextStatus && (
          <button onClick={() => onChangeStatus(nextStatus)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80 whitespace-nowrap"
            style={{ background: config.color + '40', color: config.color }}>
            <Check className="w-3 h-3 inline mr-0.5" />{STATUS_CONFIG[nextStatus].label}
          </button>
        )}
        <button onClick={onEdit} className="p-1.5 rounded hover:opacity-70" style={{ color: C.muted }}><Calendar className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded hover:opacity-70" style={{ color: C.wineLight }}><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

interface ReservationFormProps {
  reservation: Reservation | null;
  onSave: (data: Reservation) => Promise<void>;
  onClose: () => void;
  floor: Floor;
  C: Theme;
}

function ReservationForm({ reservation, onSave, onClose, floor, C }: ReservationFormProps) {
  const [date, setDate] = useState(reservation?.date || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(reservation?.time || '14:00');
  const [pax, setPax] = useState(reservation?.pax || 2);
  const [name, setName] = useState(reservation?.name || '');
  const [phone, setPhone] = useState(reservation?.phone || '');
  const [email, setEmail] = useState(reservation?.email || '');
  const [status, setStatus] = useState(reservation?.status || 'confirmada');
  const [zone, setZone] = useState(reservation?.zone || '');
  const [notes, setNotes] = useState(reservation?.notes || '');
  const [tableId, setTableId] = useState(reservation?.tableId || '');
  const [source, setSource] = useState(reservation?.source || 'manual');
  const [slots, setSlots] = useState<SlotData | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  const tables = floor?.tables || [];

  useEffect(() => {
    if (!reservation) loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { fetchSettings } = await import('../../lib/api');
      const s = await fetchSettings() as Record<string, unknown>;
      setSettings(s);
    } catch {}
  }

  async function checkAvailability() {
    setSlotsLoading(true);
    try {
      const { fetchReservations } = await import('../../lib/api');
      const existing = await fetchReservations({ date }) as Reservation[];

      const dur = Number(settings?.reservationDuration || 90);
      const interval = Number(settings?.reservationInterval || 30);
      const maxPax = Number(settings?.reservationMaxPax || 8);

      let openTime = '00:00', closeTime = '23:59';
      const scheduleType = settings?.reservationScheduleType as string | undefined;
      const closedDays = parseJSON2(settings?.reservationClosedDays, []) as number[];
      const dayOfWeek = new Date(date + 'T12:00').getDay();
      const isClosed = closedDays.includes(dayOfWeek);

      if (!isClosed && scheduleType === 'advanced') {
        const shifts = parseJSON2(settings?.reservationShifts, []) as { days: number[]; open: string; close: string }[];
        const dayShifts = shifts.filter(s => s.days?.includes(dayOfWeek));
        if (dayShifts.length > 0) {
          const opens = dayShifts.map(s => s.open).sort();
          const closes = dayShifts.map(s => s.close).sort().reverse();
          openTime = opens[0];
          closeTime = closes[0];
        }
      } else if (!isClosed) {
        openTime = (settings?.reservationOpenTime as string) || '13:00';
        closeTime = (settings?.reservationCloseTime as string) || '23:00';
      }

      const totalSeats = tables.reduce((s, t) => s + (t.seats || 4), 0);
      const existingPax = existing.filter(r => r.status !== 'cancelada' && r.status !== 'noshow')
        .reduce((s, r) => s + (r.pax || 0), 0);
      const availableSeats = Math.max(0, totalSeats - existingPax);

      const generated: SlotInfo[] = [];
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);
      let current = openH * 60 + openM;
      const close = closeH * 60 + closeM;
      const now = new Date();

      while (current + dur <= close) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotEnd = current + dur;

        const slotDate = new Date(date + 'T' + timeStr);
        const isPast = slotDate < now && date === new Date().toISOString().slice(0, 10);

        const overlapping = existing.filter(r =>
          r.status !== 'cancelada' && r.status !== 'noshow' &&
          r.time < `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}` &&
          `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}` < addMinutes(r.time, dur)
        );
        const slotOccupied = overlapping.reduce((s, r) => s + (r.pax || 0), 0);
        const slotAvailable = availableSeats - slotOccupied;

        generated.push({
          time: timeStr,
          available: slotAvailable >= (pax || 1) && !isPast,
          paxRemaining: slotAvailable,
          overlapping: overlapping.length,
        });

        current += interval;
      }

      const blocked = parseJSON2(settings?.reservationBlockedDates, []) as { date: string }[];
      const isBlocked = blocked.some(b => b.date === date);

      setSlots({ slots: generated, isClosed, isBlocked, availableSeats, totalSeats, existingPax });
    } catch {}
    setSlotsLoading(false);
  }

  function addMinutes(timeStr: string, mins: number) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function parseJSON2<T>(val: unknown, fallback: T): T {
    if (!val) return fallback;
    try { return JSON.parse(val as string) as T; } catch { return fallback; }
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    setSlots(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ id: reservation?.id, date, time, pax, name, phone, email, status, zone, notes, tableId, source } as Reservation);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: C.cream }}>{reservation ? 'Editar reserva' : 'Nueva reserva'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: C.muted }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Fecha</label>
              <input type="date" value={date} onChange={e => handleDateChange(e.target.value)} required
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Hora</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} required
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          {!reservation && (
            <button type="button" onClick={checkAvailability} disabled={slotsLoading}
              className="w-full py-2 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-40"
              style={{ background: C.surfaceLight, color: C.brassLight, border: `1px solid ${C.line}` }}>
              {slotsLoading ? 'Verificando disponibilidad…' : '🔍 Ver disponibilidad'}
            </button>
          )}
          {slots && (
            <div className="p-3 rounded-lg space-y-2" style={{ background: C.surfaceLight }}>
              {slots.isClosed ? (
                <p className="text-xs" style={{ color: C.wineLight }}>Cerrado este día</p>
              ) : slots.isBlocked ? (
                <p className="text-xs" style={{ color: C.wineLight }}>Fecha bloqueada</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: C.muted }}>Capacidad total: {slots.totalSeats} asientos</span>
                    <span style={{ color: C.muted }}>Ocupados: {slots.existingPax}</span>
                    <span style={{ color: C.sageLight }}>Libres: {slots.availableSeats}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {slots.slots.length === 0 ? (
                      <p className="text-xs" style={{ color: C.muted }}>Sin horarios disponibles</p>
                    ) : (
                      slots.slots.map(s => (
                        <button key={s.time} type="button" onClick={() => setTime(s.time)}
                          disabled={!s.available}
                          style={{
                            background: time === s.time ? C.brass : s.available ? C.surface : C.wine + '20',
                            color: time === s.time ? C.base : s.available ? C.sageLight : C.wineLight,
                            border: time === s.time ? `1px solid ${C.brass}` : s.available ? `1px solid ${C.sage}` : 'none',
                            opacity: s.available ? 1 : 0.5,
                          }}
                          className="px-2.5 py-1 rounded text-[10px] font-medium disabled:cursor-not-allowed">
                          {s.time}
                          {!s.available && ' ✕'}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Comensales</label>
            <input type="number" min={1} value={pax} onChange={e => setPax(Number(e.target.value))} required
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Nombre *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Nombre del cliente"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Teléfono</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+34 600 00 00 00"
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1">
                {STATUS_FLOW.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Zona preferida</label>
              <select value={zone} onChange={e => setZone(e.target.value)}
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">Sin preferencia</option>
                {(floor?.zones || []).map(z => (
                  <option key={z.id} value={z.name}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Mesa (opcional)</label>
            <select value={tableId} onChange={e => setTableId(e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">Sin asignar</option>
              {tables.filter(t => !t.reserved_for || t.id === tableId).map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Cumpleaños, trona, alergias…"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <input type="hidden" value={source} />
          <button type="submit"
            className="w-full py-2.5 rounded-lg text-sm font-medium hover:opacity-80"
            style={{ background: C.brass, color: '#000' }}>
            {reservation ? 'Guardar cambios' : 'Crear reserva'}
          </button>
        </form>
      </div>
    </div>
  );
}
