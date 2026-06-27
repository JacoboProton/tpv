'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, RefreshCw, MessageSquare, CreditCard, Calendar, Globe, Bell, Shield, Ban, Repeat, Star } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ReservaSettingsView({ colors: C }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');
  const [localShifts, setLocalShifts] = useState([]);
  const [localBlocked, setLocalBlocked] = useState([]);
  const [recurring, setRecurring] = useState([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const { fetchSettings } = await import('../lib/api');
      const s = await fetchSettings();
      setSettings(s);
      setLocalShifts(parseJSON(s.reservationShifts, []));
      setLocalBlocked(parseJSON(s.reservationBlockedDates, []));
    } catch {}
    setLoading(false);
    try {
      const r = await fetchRecurring();
      setRecurring(r || []);
    } catch {}
  }

  async function fetchRecurring() {
    const res = await fetch('/api/reservations?recurring=1');
    if (!res.ok) return [];
    const data = await res.json();
    return data.recurring || [];
  }

  function parseJSON(val, fallback) {
    if (!val) return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
  }

  async function handleSave(nextSettings) {
    setSaving(true);
    try {
      const { saveSettings } = await import('../lib/api');
      await saveSettings({ ...settings, ...nextSettings });
      setSettings(prev => ({ ...prev, ...nextSettings }));
    } catch {}
    setSaving(false);
  }

  function toggle(key) {
    handleSave({ [key]: settings[key] === 'true' ? 'false' : 'true' });
  }

  function setVal(key, val) {
    handleSave({ [key]: String(val) });
  }

  // Shifts management
  function addShift() {
    setLocalShifts([...localShifts, { days: [1], label: 'Turno', open: '13:00', close: '16:00' }]);
  }

  function updateShift(i, field, val) {
    const copy = [...localShifts];
    copy[i] = { ...copy[i], [field]: val };
    setLocalShifts(copy);
  }

  function toggleShiftDay(i, d) {
    const copy = [...localShifts];
    const days = copy[i].days;
    copy[i] = { ...copy[i], days: days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort() };
    setLocalShifts(copy);
  }

  function removeShift(i) {
    const copy = localShifts.filter((_, idx) => idx !== i);
    setLocalShifts(copy);
  }

  function saveShifts() {
    handleSave({ reservationShifts: JSON.stringify(localShifts) });
  }

  // Blocked dates
  function addBlocked() {
    setLocalBlocked([...localBlocked, { date: '', reason: '' }]);
  }

  function updateBlocked(i, field, val) {
    const copy = [...localBlocked];
    copy[i] = { ...copy[i], [field]: val };
    setLocalBlocked(copy);
  }

  function removeBlocked(i) {
    setLocalBlocked(localBlocked.filter((_, idx) => idx !== i));
  }

  function saveBlocked() {
    handleSave({ reservationBlockedDates: JSON.stringify(localBlocked) });
  }

  // Recurring
  async function saveRecurring(item) {
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ ...item, recurring: true }),
      });
      if (res.ok) {
        const r = await fetchRecurring();
        setRecurring(r || []);
      }
    } catch {}
  }

  async function deleteRecurring(id) {
    try {
      const res = await fetch('/api/reservations', {
        method: 'DELETE',
        body: JSON.stringify({ id, recurring: true }),
      });
      if (res.ok) {
        setRecurring(recurring.filter(r => r.id !== id));
      }
    } catch {}
  }

  function generateRecurringId() {
    return 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  const [recForm, setRecForm] = useState(null);

  if (loading || !settings) {
    return <div className="text-center py-12" style={{ color: C.muted }}>Cargando configuración…</div>;
  }

  const scheduleType = settings.reservationScheduleType || 'simple';

  const tabs = [
    { id: 'general',    label: 'General',      icon: Globe },
    { id: 'schedule',   label: 'Horario',       icon: Clock },
    { id: 'rules',      label: 'Reglas',        icon: RefreshCw },
    { id: 'deposit',    label: 'Depósito',      icon: CreditCard },
    { id: 'cancel',     label: 'Cancelación',   icon: Shield },
    { id: 'blocked',    label: 'Bloqueos',       icon: Ban },
    { id: 'recurring',  label: 'Recurrentes',   icon: Repeat },
    { id: 'notify',     label: 'Notificaciones', icon: Bell },
    { id: 'reviews',    label: 'Reseñas',       icon: Star },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>Configurar reservas</h2>
        {saving && <span className="text-xs" style={{ color: C.muted }}>Guardando…</span>}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: tab === t.id ? C.surfaceLight : 'transparent', color: tab === t.id ? C.brassLight : C.muted }}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralTab settings={settings} setVal={setVal} toggle={toggle} C={C} />}
      {tab === 'schedule' && (
        <ScheduleTab settings={settings} setVal={setVal} toggle={toggle}
          localShifts={localShifts} addShift={addShift} updateShift={updateShift}
          toggleShiftDay={toggleShiftDay} removeShift={removeShift} saveShifts={saveShifts} C={C} />
      )}
      {tab === 'rules' && <RulesTab settings={settings} setVal={setVal} C={C} />}
      {tab === 'deposit' && <DepositTab settings={settings} setVal={setVal} toggle={toggle} C={C} />}
      {tab === 'cancel' && <CancelTab settings={settings} setVal={setVal} C={C} />}
      {tab === 'blocked' && (
        <BlockedTab localBlocked={localBlocked} addBlocked={addBlocked}
          updateBlocked={updateBlocked} removeBlocked={removeBlocked} saveBlocked={saveBlocked} C={C} />
      )}
      {tab === 'recurring' && (
        <RecurringTab recurring={recurring} recForm={recForm} setRecForm={setRecForm}
          saveRecurring={saveRecurring} deleteRecurring={deleteRecurring}
          generateRecurringId={generateRecurringId} C={C} />
      )}
      {tab === 'notify' && <NotifyTab settings={settings} toggle={toggle} setVal={setVal} C={C} />}
      {tab === 'reviews' && <ReviewsTab settings={settings} toggle={toggle} setVal={setVal} C={C} />}
    </div>
  );
}

function Toggle({ value, onChange, label, C }) {
  return (
    <button onClick={onChange}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ background: value === 'true' ? C.brass : C.line }}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ left: value === 'true' ? '5.5' : '0.5', transform: value === 'true' ? 'translateX(22px)' : 'translateX(0)' }} />
    </button>
  );
}

function SectionTitle({ text, C }) {
  return <h3 className="text-sm font-semibold mt-4 mb-2" style={{ color: C.brassLight }}>{text}</h3>;
}

// ---- Tabs ----

function GeneralTab({ settings, setVal, toggle, C }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: C.cream }}>Reservas Online</p>
          <p className="text-[10px]" style={{ color: C.muted }}>Activa el formulario público de reservas</p>
        </div>
        <Toggle value={settings.reservationOnline} onChange={() => toggle('reservationOnline')} C={C} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: C.cream }}>Aprobación manual</p>
          <p className="text-[10px]" style={{ color: C.muted }}>Las reservas online requieren tu aprobación</p>
        </div>
        <Toggle value={settings.reservationAutoConfirm === 'false' ? 'true' : 'false'} onChange={() => toggle('reservationAutoConfirm')} C={C} />
      </div>
      <Field label="Zona horaria" value={settings.reservationTimezone} onChange={v => setVal('reservationTimezone', v)} placeholder="Europe/Madrid" C={C} />
      <Field label="Mensaje de confirmación" value={settings.reservationConfirmMessage} onChange={v => setVal('reservationConfirmMessage', v)} placeholder="Ej: ¡Reserva confirmada! Te esperamos el {date} a las {time}." C={C} />
      <p className="text-[10px]" style={{ color: C.muted }}>Usa {'{date}'} y {'{time}'} para personalizar el mensaje.</p>
    </div>
  );
}

function ScheduleTab({ settings, setVal, toggle, localShifts, addShift, updateShift, toggleShiftDay, removeShift, saveShifts, C }) {
  const scheduleType = settings.reservationScheduleType || 'simple';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setVal('reservationScheduleType', 'simple')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: scheduleType === 'simple' ? C.brass + '30' : 'transparent', color: scheduleType === 'simple' ? C.brassLight : C.muted, border: scheduleType === 'simple' ? `1px solid ${C.brass}` : `1px solid ${C.line}` }}>
          Horario simple
        </button>
        <button onClick={() => setVal('reservationScheduleType', 'advanced')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: scheduleType === 'advanced' ? C.brass + '30' : 'transparent', color: scheduleType === 'advanced' ? C.brassLight : C.muted, border: scheduleType === 'advanced' ? `1px solid ${C.brass}` : `1px solid ${C.line}` }}>
          Turnos avanzados
        </button>
      </div>

      {scheduleType === 'simple' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora de apertura" type="time" value={settings.reservationOpenTime} onChange={v => setVal('reservationOpenTime', v)} C={C} />
          <Field label="Hora de cierre" type="time" value={settings.reservationCloseTime} onChange={v => setVal('reservationCloseTime', v)} C={C} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: C.cream }}>Turnos</span>
            <button onClick={addShift} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ background: C.brass + '20', color: C.brassLight }}>
              <Plus className="w-3 h-3" /> Añadir turno
            </button>
          </div>
          {localShifts.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: C.muted }}>Sin turnos definidos</p>
          )}
          {localShifts.map((shift, i) => (
            <div key={i} className="p-3 rounded-lg space-y-2" style={{ background: C.surfaceLight }}>
              <div className="flex items-center justify-between">
                <input type="text" value={shift.label} onChange={e => updateShift(i, 'label', e.target.value)}
                  placeholder="Ej: Comida"
                  style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                  className="rounded px-2 py-1 text-xs w-28" />
                <button onClick={() => removeShift(i)} className="p-1 rounded hover:opacity-70" style={{ color: C.wineLight }}><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase" style={{ color: C.muted }}>Apertura</label>
                  <input type="time" value={shift.open} onChange={e => updateShift(i, 'open', e.target.value)}
                    style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                    className="w-full rounded px-2 py-1 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[9px] uppercase" style={{ color: C.muted }}>Cierre</label>
                  <input type="time" value={shift.close} onChange={e => updateShift(i, 'close', e.target.value)}
                    style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                    className="w-full rounded px-2 py-1 text-xs mt-0.5" />
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {DAY_SHORT.map((d, di) => (
                  <button key={di} onClick={() => toggleShiftDay(i, di)}
                    className="px-2 py-0.5 rounded text-[9px] font-medium"
                    style={{ background: shift.days.includes(di) ? C.brass + '30' : 'transparent', color: shift.days.includes(di) ? C.brassLight : C.muted, border: `1px solid ${shift.days.includes(di) ? C.brass : C.line}` }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {localShifts.length > 0 && (
            <button onClick={saveShifts} className="px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.brass, color: '#000' }}>
              Guardar turnos
            </button>
          )}
        </div>
      )}

      <SectionTitle text="Días de cierre semanal" C={C} />
      <div className="flex items-center gap-1 flex-wrap">
        {DAY_SHORT.map((d, i) => {
          const closed = parseJSON(settings.reservationClosedDays, []).includes(i);
          return (
            <button key={i} onClick={() => {
              const current = parseJSON(settings.reservationClosedDays, []);
              const next = current.includes(i) ? current.filter(x => x !== i) : [...current, i];
              setVal('reservationClosedDays', JSON.stringify(next));
            }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: closed ? C.wine + '30' : 'transparent', color: closed ? C.wineLight : C.muted, border: `1px solid ${closed ? C.wine : C.line}` }}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function parseJSON(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function RulesTab({ settings, setVal, C }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Intervalo de horarios" type="select" value={settings.reservationInterval || '30'} onChange={v => setVal('reservationInterval', v)} C={C}>
        {['15', '30', '45', '60'].map(v => (
          <option key={v} value={v}>{v} min</option>
        ))}
      </Field>
      <Field label="Duración de reserva" type="number" value={settings.reservationDuration || '90'} onChange={v => setVal('reservationDuration', v)} min={30} max={240} step={15} C={C} suffix="min" />
      <Field label="Tamaño máximo de grupo" type="number" value={settings.reservationMaxPax || '8'} onChange={v => setVal('reservationMaxPax', v)} min={1} max={50} C={C} />
      <Field label="Antelación mínima" type="number" value={settings.reservationMinAdvance || '60'} onChange={v => setVal('reservationMinAdvance', v)} min={0} max={1440} step={15} C={C} suffix="min" />
      <Field label="Antelación máxima" type="number" value={settings.reservationMaxAdvance || '30'} onChange={v => setVal('reservationMaxAdvance', v)} min={1} max={365} C={C} suffix="días" />
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', min, max, step, placeholder, suffix, children, C }) {
  if (type === 'select') {
    return (
      <div>
        <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: C.muted }}>{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="w-full rounded-lg px-3 py-2 text-sm">
          {children}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: C.muted }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          min={min} max={max} step={step} placeholder={placeholder}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="w-full rounded-lg px-3 py-2 text-sm" />
        {suffix && <span className="text-xs" style={{ color: C.muted }}>{suffix}</span>}
      </div>
    </div>
  );
}

function DepositTab({ settings, setVal, toggle, C }) {
  const amount = Number(settings.reservationDepositAmount || '0');
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: C.cream }}>Requerir depósito</p>
          <p className="text-[10px]" style={{ color: C.muted }}>El cliente paga una señal al reservar</p>
        </div>
        <Toggle value={amount > 0 ? 'true' : 'false'} onChange={() => {
          setVal('reservationDepositAmount', amount > 0 ? '0' : '10');
        }} C={C} />
      </div>
      {amount > 0 && (
        <Field label="Importe del depósito (€)" type="number" value={String(amount)} onChange={v => setVal('reservationDepositAmount', v)} min={0} step={0.5} C={C} />
      )}
      <div className="p-3 rounded-lg" style={{ background: C.surfaceLight }}>
        <p className="text-xs" style={{ color: C.muted }}>
          ⚠️ El depósito necesita Stripe. Conéctalo en <strong>Admin → Pagos</strong> para activar esta opción.
        </p>
      </div>
    </div>
  );
}

function CancelTab({ settings, setVal, C }) {
  return (
    <div className="space-y-3">
      <Field label="Antelación para cancelación (horas)" type="number" value={settings.reservationCancellationHours || '24'} onChange={v => setVal('reservationCancellationHours', v)} min={0} max={168} C={C} />
      <Field label="% de reembolso si cancela fuera de plazo" type="number" value={settings.reservationCancellationRefundPct || '50'} onChange={v => setVal('reservationCancellationRefundPct', v)} min={0} max={100} step={5} suffix="%" C={C} />
      <div className="p-3 rounded-lg" style={{ background: C.surfaceLight }}>
        <p className="text-xs" style={{ color: C.muted }}>
          Esta información se muestra al cliente al reservar. Dentro del plazo de cancelación el cliente recupera el 100% del depósito.
        </p>
      </div>
    </div>
  );
}

function BlockedTab({ localBlocked, addBlocked, updateBlocked, removeBlocked, saveBlocked, C }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: C.cream }}>Días bloqueados</span>
        <button onClick={addBlocked} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ background: C.brass + '20', color: C.brassLight }}>
          <Plus className="w-3 h-3" /> Añadir
        </button>
      </div>
      {localBlocked.length === 0 && (
        <p className="text-xs py-4 text-center" style={{ color: C.muted }}>Sin días bloqueados</p>
      )}
      {localBlocked.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="date" value={b.date} onChange={e => updateBlocked(i, 'date', e.target.value)}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="rounded-lg px-3 py-2 text-xs" />
          <input type="text" value={b.reason} onChange={e => updateBlocked(i, 'reason', e.target.value)}
            placeholder="Motivo (opcional)"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="flex-1 rounded-lg px-3 py-2 text-xs" />
          <button onClick={() => removeBlocked(i)} className="p-1.5 rounded hover:opacity-70" style={{ color: C.wineLight }}><Trash2 className="w-3 h-3" /></button>
        </div>
      ))}
      {localBlocked.length > 0 && (
        <button onClick={saveBlocked} className="px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.brass, color: '#000' }}>
          Guardar días bloqueados
        </button>
      )}
    </div>
  );
}

function RecurringTab({ recurring, recForm, setRecForm, saveRecurring, deleteRecurring, generateRecurringId, C }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: C.cream }}>Plantillas recurrentes</span>
        <button onClick={() => setRecForm({ id: generateRecurringId(), name: '', weekday: 5, time: '20:00', pax: 4, phone: '', notes: '', zone: '', tableId: '' })}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ background: C.brass + '20', color: C.brassLight }}>
          <Plus className="w-3 h-3" /> Nueva plantilla
        </button>
      </div>
      {recurring.length === 0 && !recForm && (
        <p className="text-xs py-4 text-center" style={{ color: C.muted }}>Sin plantillas recurrentes</p>
      )}
      {recurring.map(r => (
        <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: C.surfaceLight }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: C.cream }}>{r.name}</p>
            <p className="text-[10px]" style={{ color: C.muted }}>
              {DAY_NAMES[r.weekday]} — {r.time.slice(0, 5)} — {r.pax} pax
              {r.notes ? ` — 📝 ${r.notes}` : ''}
            </p>
          </div>
          <button onClick={() => deleteRecurring(r.id)} className="p-1 rounded hover:opacity-70" style={{ color: C.wineLight }}><Trash2 className="w-3 h-3" /></button>
        </div>
      ))}
      {recForm && (
        <div className="p-3 rounded-lg space-y-2" style={{ background: C.surfaceLight }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase" style={{ color: C.muted }}>Nombre</label>
              <input type="text" value={recForm.name} onChange={e => setRecForm({ ...recForm, name: e.target.value })}
                style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded px-2 py-1 text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[9px] uppercase" style={{ color: C.muted }}>Día de la semana</label>
              <select value={recForm.weekday} onChange={e => setRecForm({ ...recForm, weekday: Number(e.target.value) })}
                style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded px-2 py-1 text-xs mt-0.5">
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase" style={{ color: C.muted }}>Hora</label>
              <input type="time" value={recForm.time} onChange={e => setRecForm({ ...recForm, time: e.target.value })}
                style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded px-2 py-1 text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[9px] uppercase" style={{ color: C.muted }}>Pax</label>
              <input type="number" min={1} value={recForm.pax} onChange={e => setRecForm({ ...recForm, pax: Number(e.target.value) })}
                style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded px-2 py-1 text-xs mt-0.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase" style={{ color: C.muted }}>Teléfono</label>
              <input type="text" value={recForm.phone} onChange={e => setRecForm({ ...recForm, phone: e.target.value })}
                style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded px-2 py-1 text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[9px] uppercase" style={{ color: C.muted }}>Zona</label>
              <input type="text" value={recForm.zone} onChange={e => setRecForm({ ...recForm, zone: e.target.value })}
                style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded px-2 py-1 text-xs mt-0.5" />
            </div>
          </div>
          <div>
            <label className="text-[9px] uppercase" style={{ color: C.muted }}>Notas</label>
            <input type="text" value={recForm.notes} onChange={e => setRecForm({ ...recForm, notes: e.target.value })}
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded px-2 py-1 text-xs mt-0.5" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { saveRecurring(recForm); setRecForm(null); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.brass, color: '#000' }}>
              Guardar plantilla
            </button>
            <button onClick={() => setRecForm(null)} className="px-3 py-1.5 rounded-lg text-xs hover:opacity-80" style={{ background: C.surface, color: C.muted, border: `1px solid ${C.line}` }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifyTab({ settings, toggle, setVal, C }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: C.cream }}>Confirmar al cliente por WhatsApp</p>
          <p className="text-[10px]" style={{ color: C.muted }}>Enviar confirmación al crear la reserva</p>
        </div>
        <Toggle value={settings.reservationWhatsAppConfirm} onChange={() => toggle('reservationWhatsAppConfirm')} C={C} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: C.cream }}>Recordatorios por WhatsApp</p>
          <p className="text-[10px]" style={{ color: C.muted }}>24h y 1h antes de la reserva</p>
        </div>
        <Toggle value={settings.reservationWhatsAppReminder} onChange={() => toggle('reservationWhatsAppReminder')} C={C} />
      </div>
      <div className="p-3 rounded-lg" style={{ background: C.surfaceLight }}>
        <p className="text-xs" style={{ color: C.muted }}>
          Los mensajes se envían desde el WhatsApp de Mesero. El cliente puede responder <strong>BAJA</strong> para dejar de recibirlos.
        </p>
      </div>
    </div>
  );
}

function ReviewsTab({ settings, toggle, setVal, C }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: C.cream }}>Pedir reseña tras la visita</p>
          <p className="text-[10px]" style={{ color: C.muted }}>Enviar WhatsApp al cliente después de la visita</p>
        </div>
        <Toggle value={settings.reservationReviewRequest} onChange={() => toggle('reservationReviewRequest')} C={C} />
      </div>
      {settings.reservationReviewRequest === 'true' && (
        <Field label="URL de reseñas de Google" value={settings.reservationGoogleReviewUrl} onChange={v => setVal('reservationGoogleReviewUrl', v)} placeholder="https://g.page/r/..." C={C} />
      )}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
        <div>
          <p className="text-sm font-medium" style={{ color: C.cream }}>Google Reserve</p>
          <p className="text-[10px]" style={{ color: C.muted }}>Acepta reservas desde Google (Búsqueda y Maps) — requiere alta en el programa de partners</p>
        </div>
        <Toggle value={settings.reservationGoogleReserve} onChange={() => toggle('reservationGoogleReserve')} C={C} />
      </div>
    </div>
  );
}
