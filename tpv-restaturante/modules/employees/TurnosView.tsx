'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Copy, Calendar, Target, Clock, Users, Save, Loader2 } from 'lucide-react';
import type { Theme } from '@/components/constants';

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const COLORS = ['#7a9a7c','#c4a04a','#6a9af8','#b05e5e','#9c958a','#d4a574','#8a9ab0','#c48a7a'];

interface Employee {
  id: string;
  name: string;
}

interface Shift {
  id?: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  startTime: string;
  endTime: string;
  position?: string;
  notes?: string;
  color?: string;
}

interface Objective {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  position: string;
  min_people: number;
  max_people: number;
}

interface WeekDay {
  date: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
}

interface MonthCell {
  date: string;
  day: number;
  isToday: boolean;
  shifts: Shift[];
}

interface CoverageSlot extends Objective {
  dayName: string;
  assigned: number;
  min: number;
  max: number;
  ok: boolean;
}

interface TurnosViewProps {
  employees: Employee[];
  colors: Theme;
}

export default function TurnosView({ employees, colors: C }: TurnosViewProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('week');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shift | Partial<Shift> | null>(null);
  const [copiando, setCopiando] = useState(false);

  useEffect(() => { loadShifts(); loadObjectives(); }, [weekStart]);

  function getWeekStart(d: Date) {
    const wd = d.getDay();
    const diff = d.getDate() - wd + (wd === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  function formatDate(d: Date) { return d.toISOString().slice(0, 10); }

  function weekRange() {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: formatDate(start), end: formatDate(end) };
  }

  function monthRange() {
    const start = new Date(weekStart);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start: formatDate(monthStart), end: formatDate(monthEnd) };
  }

  async function loadShifts() {
    setLoading(true);
    const range = tab === 'month' ? monthRange() : weekRange();
    try {
      const r = await fetch(`/api/shifts?from=${range.start}&to=${range.end}`);
      if (r.ok) setShifts(await r.json() as Shift[]);
    } catch {}
    setLoading(false);
  }

  async function loadObjectives() {
    try {
      const r = await fetch('/api/shifts?objectives=true');
      if (r.ok) setObjectives(await r.json() as Objective[]);
    } catch {}
  }

  async function saveShift(data: Partial<Shift>) {
    try {
      await fetch('/api/shifts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      loadShifts();
      setShowForm(false);
      setEditing(null);
    } catch {}
  }

  async function deleteShift(id: string) {
    try {
      await fetch('/api/shifts', { method: 'DELETE', body: JSON.stringify({ id }) });
      loadShifts();
    } catch {}
  }

  async function copyWeek(from: Date, to: Date) {
    setCopiando(true);
    try {
      await fetch('/api/shifts', {
        method: 'POST',
        body: JSON.stringify({ action: 'copy-week', fromWeekStart: formatDate(from), toWeekStart: formatDate(to) }),
      });
      setWeekStart(to);
      loadShifts();
    } catch {}
    setCopiando(false);
  }

  const weekDays: WeekDay[] = useMemo(() => {
    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push({ date: formatDate(d), dayName: DAYS[d.getDay()], dayNum: d.getDate(), isToday: formatDate(d) === formatDate(new Date()) });
    }
    return days;
  }, [weekStart]);

  const monthDays: (MonthCell | null)[] = useMemo(() => {
    const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    const end = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);
    const days: (MonthCell | null)[] = [];
    const firstDay = start.getDay();
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= end.getDate(); d++) {
      const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date, day: d, isToday: date === formatDate(new Date()), shifts: shifts.filter(s => s.date === date) });
    }
    return days;
  }, [shifts, weekStart]);

  const coverage: CoverageSlot[] = useMemo(() => {
    const bySlot: Record<string, CoverageSlot> = {};
    objectives.forEach(obj => {
      const key = `${obj.day_of_week}-${obj.start_time}-${obj.end_time}`;
      const dayShifts = shifts.filter(s => {
        const d = new Date(s.date + 'T12:00').getDay();
        return d === obj.day_of_week;
      });
      const assigned = dayShifts.filter(s => {
        const pos = obj.position ? s.position === obj.position : true;
        return pos && s.startTime <= obj.start_time && s.endTime >= obj.end_time;
      });
      bySlot[key] = {
        ...obj,
        dayName: DAYS[obj.day_of_week],
        assigned: assigned.length,
        min: obj.min_people,
        max: obj.max_people,
        ok: assigned.length >= obj.min_people && assigned.length <= obj.max_people,
      };
    });
    return Object.values(bySlot).sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
  }, [objectives, shifts]);

  function navigate(dir: number) {
    const d = new Date(weekStart);
    if (tab === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + 7 * dir);
    setWeekStart(d);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>Turnos</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
          style={{ background: C.brass + '30', color: C.brassLight }}>
          <Plus className="w-3.5 h-3.5" /> Nuevo turno
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b pb-2 flex-wrap" style={{ borderColor: C.line }}>
        {[
          { id: 'week', label: 'Semana', icon: Calendar },
          { id: 'month', label: 'Mes', icon: Calendar },
          { id: 'coverage', label: 'Cobertura', icon: Target },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: tab === t.id ? C.surfaceLight : 'transparent', color: tab === t.id ? C.brassLight : C.muted }}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {/* Navigation */}
      {tab !== 'coverage' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:opacity-70" style={{ color: C.muted }}><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium" style={{ color: C.cream }}>
              {tab === 'week'
                ? `${weekDays[0].date} — ${weekDays[6].date}`
                : `${new Date(weekStart).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`}
            </span>
            <button onClick={() => navigate(1)} className="p-1.5 rounded hover:opacity-70" style={{ color: C.muted }}><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ color: C.brassLight, background: C.brass + '20' }}>Hoy</button>
          </div>
          {tab === 'week' && (
            <div className="flex items-center gap-1">
              <button onClick={() => { const p = new Date(weekStart); p.setDate(p.getDate() - 7); copyWeek(p, weekStart); }}
                disabled={copiando} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium hover:opacity-80 disabled:opacity-40"
                style={{ background: C.surfaceLight, color: C.brassLight }}>
                <Copy className="w-3 h-3" /> Sem. anterior
              </button>
              <button onClick={() => { const n = new Date(weekStart); n.setDate(n.getDate() + 7); copyWeek(weekStart, n); }}
                disabled={copiando} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium hover:opacity-80 disabled:opacity-40"
                style={{ background: C.surfaceLight, color: C.brassLight }}>
                <Copy className="w-3 h-3" /> Sem. siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Week view */}
      {tab === 'week' && (
        <div className="overflow-x-auto">
          {loading ? <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div> : (
            <div className="min-w-[640px]">
              <div className="grid grid-cols-8 gap-px text-xs font-medium" style={{ background: C.line }}>
                <div className="p-2" style={{ background: C.surfaceLight, color: C.muted }}>Empleado</div>
                {weekDays.map(d => (
                  <div key={d.date} className="p-2 text-center" style={{ background: d.isToday ? C.brass + '20' : C.surfaceLight, color: d.isToday ? C.brassLight : C.muted }}>
                    {DAYS_SHORT[new Date(d.date + 'T12:00').getDay()]} {d.dayNum}
                  </div>
                ))}
              </div>
              {employees.map(emp => {
                const empShifts = shifts.filter(s => s.employeeId === emp.id);
                return (
                  <div key={emp.id} className="grid grid-cols-8 gap-px text-xs" style={{ background: C.line }}>
                    <div className="p-2 flex items-center gap-1 truncate" style={{ background: C.surface, color: C.cream }}>
                      <span className="truncate">{emp.name}</span>
                    </div>
                    {weekDays.map(d => {
                      const dayShifts = empShifts.filter(s => s.date === d.date);
                      return (
                        <div key={d.date} className="p-1 min-h-[48px] space-y-0.5" style={{ background: d.isToday ? C.brass + '08' : C.surface }}>
                          {dayShifts.map(s => (
                            <div key={s.id}
                              onClick={() => { setEditing(s); setShowForm(true); }}
                              className="text-[9px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 flex items-center justify-between gap-0.5"
                              style={{ background: (s.color || COLORS[0]) + '30', color: s.color || COLORS[0], borderLeft: `2px solid ${s.color || COLORS[0]}` }}>
                              <span className="truncate">{s.startTime.slice(0, 5)}-{s.endTime.slice(0, 5)}</span>
                              <button onClick={e => { e.stopPropagation(); if (s.id) deleteShift(s.id); }}
                                className="shrink-0 hover:opacity-70" style={{ color: C.muted }}>
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          {!dayShifts.length && (
                            <button onClick={() => { setEditing({ employeeId: emp.id, employeeName: emp.name, date: d.date }); setShowForm(true); }}
                              className="w-full text-[8px] py-0.5 opacity-0 hover:opacity-40 text-center"
                              style={{ color: C.muted }}>+</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Month view */}
      {tab === 'month' && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-7 text-[10px] font-medium text-center">
            {DAYS_SHORT.map(d => (
              <div key={d} className="py-1.5" style={{ background: C.surfaceLight, color: C.muted }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((cell, i) => (
              <div key={i} className="min-h-[70px] p-1 border-t border-l" style={{ borderColor: C.line, background: cell?.isToday ? C.brass + '12' : 'transparent' }}>
                {cell && (
                  <div className="h-full">
                    <span className="text-[10px] font-medium" style={{ color: cell.isToday ? C.brassLight : C.muted }}>{cell.day}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {cell.shifts.slice(0, 3).map(s => (
                        <div key={s.id} className="text-[7px] px-0.5 py-px rounded truncate" style={{ background: (s.color || COLORS[0]) + '20', color: s.color || COLORS[0] }}>
                          {s.startTime.slice(0, 5)}
                        </div>
                      ))}
                      {cell.shifts.length > 3 && (
                        <div className="text-[7px]" style={{ color: C.muted }}>+{cell.shifts.length - 3}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coverage view */}
      {tab === 'coverage' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold" style={{ color: C.brassLight }}>Objetivos de cobertura</h3>
            <p className="text-[10px]" style={{ color: C.muted }}>Define cuánta gente necesitas por día y franja horaria.</p>
          </div>
          {objectives.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: C.muted }}>Sin objetivos definidos. Añade el primero abajo.</p>
          ) : (
            <div className="space-y-1">
              {coverage.map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{ background: c.ok ? C.sage + '12' : C.wine + '12', borderLeft: `3px solid ${c.ok ? C.sage : C.wine}` }}>
                  <span className="w-16 shrink-0" style={{ color: C.cream }}>{c.dayName.slice(0, 3)}</span>
                  <span style={{ color: C.muted }}>{c.start_time.slice(0, 5)}-{c.end_time.slice(0, 5)}</span>
                  <span className="ml-auto font-mono" style={{ color: c.ok ? C.sage : C.wineLight }}>
                    {c.assigned} / {c.min}-{c.max}
                  </span>
                </div>
              ))}
            </div>
          )}

          <ObjectiveForm objectives={objectives} onSave={async (data) => {
            await fetch('/api/shifts', {
              method: 'POST',
              body: JSON.stringify({ ...data, action: 'save-objective' }),
            });
            loadObjectives();
          }} onDelete={async (id) => {
            await fetch('/api/shifts', {
              method: 'POST',
              body: JSON.stringify({ action: 'delete-objective', id }),
            });
            loadObjectives();
          }} C={C} />
        </div>
      )}

      {/* Shift form modal */}
      {showForm && (
        <ShiftForm shift={editing} employees={employees} weekDays={weekDays}
          onSave={saveShift} onClose={() => { setShowForm(false); setEditing(null); }} C={C} />
      )}
    </div>
  );
}

interface ShiftFormProps {
  shift: Shift | Partial<Shift> | null;
  employees: Employee[];
  weekDays: WeekDay[];
  onSave: (data: Partial<Shift>) => Promise<void>;
  onClose: () => void;
  C: Theme;
}

function ShiftForm({ shift, employees, weekDays, onSave, onClose, C }: ShiftFormProps) {
  const [employeeId, setEmployeeId] = useState(shift?.employeeId || '');
  const [employeeName, setEmployeeName] = useState(shift?.employeeName || '');
  const [date, setDate] = useState(shift?.date || weekDays?.[0]?.date || '');
  const [startTime, setStartTime] = useState(shift?.startTime || '09:00');
  const [endTime, setEndTime] = useState(shift?.endTime || '14:00');
  const [position, setPosition] = useState(shift?.position || '');
  const [notes, setNotes] = useState(shift?.notes || '');
  const [color, setColor] = useState(shift?.color || COLORS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emp = employees.find(e => e.id === employeeId);
    onSave({
      id: shift?.id,
      employeeId,
      employeeName: emp?.name || employeeName,
      date, startTime, endTime, position, notes, color,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-xl p-5 space-y-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm" style={{ color: C.cream }}>{shift?.id ? 'Editar turno' : 'Nuevo turno'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: C.muted }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Empleado</label>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} required
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">Seleccionar</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Entrada</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Salida</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Puesto</label>
              <input type="text" value={position} onChange={e => setPosition(e.target.value)}
                placeholder="Ej: camarero"
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Color</label>
              <div className="flex items-center gap-1 mt-1">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full border-2"
                    style={{ background: c, borderColor: color === c ? C.cream : 'transparent' }} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Notas</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notas del turno"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div className="flex gap-2">
            <button type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ background: C.brass, color: '#000' }}>
              {shift?.id ? 'Guardar' : 'Crear turno'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm" style={{ background: C.surfaceLight, color: C.muted }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ObjectiveFormProps {
  objectives: Objective[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  C: Theme;
}

function ObjectiveForm({ objectives, onSave, onDelete, C }: ObjectiveFormProps) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('16:00');
  const [position, setPosition] = useState('');
  const [minPeople, setMinPeople] = useState(1);
  const [maxPeople, setMaxPeople] = useState(2);

  async function handleAdd() {
    await onSave({ dayOfWeek, startTime, endTime, position, minPeople, maxPeople });
  }

  return (
    <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
      <h4 className="text-xs font-medium" style={{ color: C.cream }}>Añadir objetivo</h4>
      <div className="grid grid-cols-7 gap-1.5 text-[10px]">
        <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded px-1.5 py-1">
          {DAYS_SHORT.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded px-1.5 py-1" />
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded px-1.5 py-1" />
        <input type="text" value={position} onChange={e => setPosition(e.target.value)}
          placeholder="Puesto"
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded px-1.5 py-1" />
        <input type="number" min={1} value={minPeople} onChange={e => setMinPeople(Number(e.target.value))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded px-1.5 py-1 text-center" placeholder="Min" />
        <input type="number" min={1} value={maxPeople} onChange={e => setMaxPeople(Number(e.target.value))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded px-1.5 py-1 text-center" placeholder="Max" />
        <button onClick={handleAdd}
          className="rounded py-1 font-medium hover:opacity-80" style={{ background: C.brass, color: '#000' }}>
          <Plus className="w-3 h-3 mx-auto" />
        </button>
      </div>
      {objectives.length > 0 && (
        <div className="space-y-0.5 mt-2">
          {objectives.map(obj => (
            <div key={obj.id} className="flex items-center gap-1 text-[9px] p-1 rounded" style={{ background: C.surfaceLight }}>
              <span style={{ color: C.cream }}>{DAYS_SHORT[obj.day_of_week]}</span>
              <span style={{ color: C.muted }}>{obj.start_time.slice(0, 5)}-{obj.end_time.slice(0, 5)}</span>
              <span style={{ color: C.muted }}>{obj.position || 'cualquier'}</span>
              <span className="ml-auto" style={{ color: C.brassLight }}>{obj.min_people}-{obj.max_people}</span>
              <button onClick={() => onDelete(obj.id)} className="hover:opacity-70" style={{ color: C.wineLight }}><Trash2 className="w-2.5 h-2.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
