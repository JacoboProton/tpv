'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Users, ChevronLeft, Check, X, Loader2, Phone, Mail, User, Send } from 'lucide-react';

const MONTHS: string[] = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS: string[] = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

interface Settings {
  qrThemePrimary?: string;
  qrThemeSecondary?: string;
  reservationMaxPax?: string;
  reservationMinAdvance?: string;
  reservationMaxAdvance?: string;
  reservationOnline?: string;
  reservationAutoConfirm?: string;
}

interface SlotData {
  time: string;
  available: boolean;
}

interface AvailabilityData {
  slots: SlotData[];
  isClosed?: boolean;
  isBlocked?: boolean;
}

interface CalendarDay {
  day: number;
  dateStr: string;
  disabled: boolean;
}

export default function ReservarPage() {
  const [step, setStep] = useState<string>('date');
  const [date, setDate] = useState<string>('');
  const [pax, setPax] = useState<number>(2);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [slots, setSlots] = useState<AvailabilityData | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string>('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((s: Settings) => {
      setSettings(s);
      const min = new Date();
      min.setDate(min.getDate() + 1);
      setDate(min.toISOString().slice(0, 10));
    }).catch(() => {});
  }, []);

  const accent = settings?.qrThemePrimary || '#c4a04a';
  const bg = settings?.qrThemeSecondary || '#1a1d23';
  const maxPax = Number(settings?.reservationMaxPax || 8);
  const minAdvance = Number(settings?.reservationMinAdvance || 60);
  const maxAdvance = Number(settings?.reservationMaxAdvance || 30);
  const onlineEnabled = settings?.reservationOnline !== 'false';

  function getToday(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function getMaxDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + Number(maxAdvance));
    return d.toISOString().slice(0, 10);
  }

  function isDateDisabled(d: string): boolean {
    const today = new Date(getToday() + 'T12:00');
    const target = new Date(d + 'T12:00');
    if (target <= today) return true;
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > maxAdvance) return true;
    return false;
  }

  async function fetchSlots() {
    if (!date || !pax) return;
    setLoadingSlots(true);
    setError('');
    try {
      const r = await fetch(`/api/reservations/availability?date=${date}&pax=${pax}`);
      if (!r.ok) {
        const err = await r.json() as { error?: string };
        setError(err.error || 'Error al consultar disponibilidad');
        setLoadingSlots(false);
        return;
      }
      const data = await r.json() as AvailabilityData;
      setSlots(data);
      if (data.isClosed) setError('El restaurante está cerrado este día');
      else if (data.isBlocked) setError('Esta fecha no está disponible para reservas');
      else if (data.slots.every(s => !s.available)) setError('No hay horarios disponibles para este día');
    } catch {
      setError('Error de conexión');
    }
    setLoadingSlots(false);
  }

  function handleContinueToSlots() {
    fetchSlots();
    setStep('slots');
  }

  function handleSelectTime(time: string) {
    setSelectedTime(time);
    setStep('form');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone) { setError('Nombre y teléfono son obligatorios'); return; }
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          date, time: selectedTime, pax, name, phone, email, notes,
          source: 'online', status: 'pendiente',
        }),
      });
      const data = await r.json() as { ok?: boolean; id?: string; error?: string };
      if (data.ok) {
        setResult({ id: data.id, date, time: selectedTime, pax, name });
        setStep('confirmation');
      } else {
        setError(data.error || 'Error al crear reserva');
      }
    } catch {
      setError('Error de conexión');
    }
    setSubmitting(false);
  }

  function handleNewReservation() {
    setStep('date');
    setSelectedTime('');
    setSlots(null);
    setResult(null);
    setError('');
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  }

  const calendarDays: (CalendarDay | null)[] = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (CalendarDay | null)[] = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, disabled: isDateDisabled(dateStr) });
    }
    return days;
  }, [calendarMonth, maxAdvance]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg, color: '#e8e0d4' }}>
      <div className="text-center py-6 px-4 border-b border-[#333]" style={{ background: '#15171c' }}>
        <h1 className="text-xl font-bold" style={{ color: accent }}>Reservar mesa</h1>
        <p className="text-xs mt-1" style={{ color: '#8a8275' }}>Elige fecha, hora y número de comensales</p>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto p-4">
        {!onlineEnabled && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: '#b05e5e' }}>Reservas online no disponibles</p>
          </div>
        )}

        {onlineEnabled && step === 'date' && (
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                  className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#8a8275' }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold">{MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                  className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#8a8275' }}>
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS.map(d => (
                  <span key={d} className="text-[10px] py-1" style={{ color: '#6a6255' }}>{d}</span>
                ))}
                {calendarDays.map((d, i) => (
                  <div key={i} className="aspect-square flex items-center justify-center">
                    {d && (
                      <button
                        onClick={() => { if (!d.disabled) { setDate(d.dateStr); setSlots(null); } }}
                        disabled={d.disabled}
                        className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                          date === d.dateStr ? 'text-black font-bold' : 'hover:bg-white/10'
                        } ${d.disabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                        style={{
                          background: date === d.dateStr ? accent : 'transparent',
                          color: date === d.dateStr ? '#000' : d.disabled ? '#555' : '#e8e0d4',
                        }}
                      >
                        {d.day}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: '#8a8275' }}>
                <Users className="w-3 h-3 inline mr-1" />Comensales
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setPax(Math.max(1, pax - 1))}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold hover:bg-white/10"
                  style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }}>
                  –
                </button>
                <span className="text-2xl font-bold min-w-[3rem] text-center" style={{ color: accent }}>{pax}</span>
                <button onClick={() => setPax(Math.min(maxPax, pax + 1))}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold hover:bg-white/10"
                  style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }}>
                  +
                </button>
              </div>
            </div>

            <button onClick={handleContinueToSlots}
              className="w-full py-3 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
              style={{ background: accent, color: '#000' }}>
              Ver horarios disponibles
            </button>
          </div>
        )}

        {onlineEnabled && step === 'slots' && (
          <div>
            <button onClick={() => setStep('date')} className="flex items-center gap-1 text-xs mb-4 hover:opacity-70" style={{ color: '#8a8275' }}>
              <ChevronLeft className="w-3 h-3" />Volver
            </button>

            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#333]">
              <Calendar className="w-4 h-4" style={{ color: accent }} />
              <span className="text-sm font-medium">{new Date(date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: accent + '20', color: accent }}>
                {pax} {pax === 1 ? 'persona' : 'personas'}
              </span>
            </div>

            {loadingSlots && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
              </div>
            )}

            {error && !loadingSlots && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: '#b05e5e' }}>{error}</p>
                <button onClick={() => setStep('date')} className="mt-4 text-xs underline" style={{ color: '#8a8275' }}>
                  Elegir otra fecha
                </button>
              </div>
            )}

            {slots && !loadingSlots && !error && (
              <div>
                <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: '#8a8275' }}>
                  <Clock className="w-3 h-3 inline mr-1" />Horarios disponibles
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {slots.slots.map(s => (
                    <button
                      key={s.time}
                      onClick={() => s.available && handleSelectTime(s.time)}
                      disabled={!s.available}
                      className={`py-3 rounded-lg text-sm font-medium transition-all ${
                        s.available ? 'hover:opacity-80' : 'opacity-20 cursor-not-allowed line-through'
                      }`}
                      style={{
                        background: s.available ? accent + '15' : '#222',
                        color: s.available ? accent : '#555',
                        border: `1px solid ${s.available ? accent + '40' : '#333'}`,
                      }}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {onlineEnabled && step === 'form' && (
          <div>
            <button onClick={() => setStep('slots')} className="flex items-center gap-1 text-xs mb-4 hover:opacity-70" style={{ color: '#8a8275' }}>
              <ChevronLeft className="w-3 h-3" />Volver
            </button>

            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#333] text-sm">
              <Calendar className="w-3 h-3" style={{ color: accent }} />
              <span>{new Date(date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <Clock className="w-3 h-3 ml-2" style={{ color: accent }} />
              <span>{selectedTime}</span>
              <Users className="w-3 h-3 ml-2" style={{ color: accent }} />
              <span>{pax}</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>
                    <User className="w-3 h-3 inline mr-1" />Nombre *
                  </label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333', caretColor: accent }}
                    placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>
                    <Phone className="w-3 h-3 inline mr-1" />Teléfono *
                  </label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333', caretColor: accent }}
                    placeholder="+34 600 000 000" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>
                    <Mail className="w-3 h-3 inline mr-1" />Email
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333', caretColor: accent }}
                    placeholder="tucorreo@ejemplo.com" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Notas</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 resize-none"
                    style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333', caretColor: accent }}
                    placeholder="Alergias, ocasión especial…" />
                </div>
              </div>

              {error && <p className="text-xs mt-4" style={{ color: '#b05e5e' }}>{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full mt-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-80 disabled:opacity-40 transition-opacity"
                style={{ background: accent, color: '#000' }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Enviando…' : 'Confirmar reserva'}
              </button>
            </form>
          </div>
        )}

        {onlineEnabled && step === 'confirmation' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#7a9a7c20' }}>
              <Check className="w-8 h-8" style={{ color: '#7a9a7c' }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: accent }}>¡Reserva solicitada!</h2>
            <p className="text-sm mb-6" style={{ color: '#8a8275' }}>
              Te hemos enviado un resumen. Te esperamos:
            </p>
            <div className="p-4 rounded-xl mb-6 text-sm space-y-2" style={{ background: '#222', border: '1px solid #333' }}>
              <p>
                <Calendar className="w-3 h-3 inline mr-2" style={{ color: accent }} />
                {new Date(date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p>
                <Clock className="w-3 h-3 inline mr-2" style={{ color: accent }} />
                {selectedTime} h
              </p>
              <p>
                <Users className="w-3 h-3 inline mr-2" style={{ color: accent }} />
                {pax} {pax === 1 ? 'persona' : 'personas'}
              </p>
              <p>
                <User className="w-3 h-3 inline mr-2" style={{ color: accent }} />
                {name}
              </p>
            </div>
            <p className="text-xs mb-6" style={{ color: '#6a6255' }}>
              Recibirás la confirmación por teléfono si es necesario.
              {settings?.reservationAutoConfirm === 'true' && ' Las reservas se confirman automáticamente.'}
            </p>
            <button onClick={handleNewReservation}
              className="py-3 px-6 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
              style={{ background: accent, color: '#000' }}>
              Hacer otra reserva
            </button>
          </div>
        )}
      </div>

      <div className="text-center py-4 text-[10px]" style={{ color: '#6a6255', borderTop: '1px solid #222' }}>
        <p>&copy; {new Date().getFullYear()} La Comanda. Todos los derechos reservados.</p>
      </div>
    </div>
  );
}
