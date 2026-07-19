"use client";

import { useState } from 'react';
import { Plus, Trash2, Save, Clock, Coffee, GlassWater, UtensilsCrossed, Calendar } from 'lucide-react';
import { euros } from '@/components/constants';
import type { Theme } from '@/components/constants';

function id() { return 'mm_' + Date.now() + Math.random().toString(16).slice(2, 6); }

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const PRESETS: { label: string; days: number[]; start: string; end: string }[] = [
  { label: 'Almuerzo L-V 13-16h', days: [0, 1, 2, 3, 4], start: '13:00', end: '16:00' },
  { label: 'Cena L-D 20-23h', days: [0, 1, 2, 3, 4, 5, 6], start: '20:00', end: '23:00' },
  { label: 'Fines de semana', days: [5, 6], start: '13:00', end: '16:00' },
];

interface CourseItem {
  id: string;
  course_id: string;
  product_id: string;
  surcharge: number;
}

interface Course {
  id: string;
  name: string;
  items: CourseItem[];
}

interface Extra {
  name: string;
  price: number;
}

interface Schedule {
  id: string;
  menu_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface MealMenu {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  includes_pan: boolean;
  includes_bebida: boolean;
  includes_cafe: boolean;
  extras: Extra[];
  active: boolean;
  courses: Course[];
  schedules: Schedule[];
}

interface MenusDelDiaPanelProps {
  mealMenus: MealMenu[];
  catalog: { products: { id: string; name: string; price: number }[] };
  onSave: (menus: MealMenu[]) => void;
  colors: Theme;
}

function emptyMenu(): MealMenu {
  return {
    id: id(), name: '', description: '', price: 0, image: '',
    includes_pan: false, includes_bebida: false, includes_cafe: false,
    extras: [], active: true, courses: [], schedules: [],
  };
}

function emptyCourse(): Course {
  return { id: id(), name: '', items: [] };
}

export default function MenusDelDiaPanel({ mealMenus, catalog, onSave, colors: C }: MenusDelDiaPanelProps) {
  const [local, setLocal] = useState<MealMenu[]>(() => mealMenus.length > 0 ? mealMenus : []);

  function update(ci: number, field: string, value: unknown) {
    const next = [...local];
    (next[ci] as unknown as Record<string, unknown>)[field] = value;
    setLocal(next);
  }

  function updateCourse(ci: number, csi: number, field: string, value: unknown) {
    const next = [...local];
    (next[ci].courses[csi] as unknown as Record<string, unknown>)[field] = value;
    setLocal(next);
  }

  function updateItem(ci: number, csi: number, ii: number, field: string, value: unknown) {
    const next = [...local];
    (next[ci].courses[csi].items[ii] as unknown as Record<string, unknown>)[field] = value;
    setLocal(next);
  }

  function updateSchedule(ci: number, si: number, field: string, value: unknown) {
    const next = [...local];
    (next[ci].schedules[si] as unknown as Record<string, unknown>)[field] = value;
    setLocal(next);
  }

  function addMenu() { setLocal([...local, emptyMenu()]); }
  function removeMenu(ci: number) { setLocal(local.filter((_, i) => i !== ci)); }

  function addCourse(ci: number) {
    const next = [...local];
    next[ci].courses = [...(next[ci].courses || []), emptyCourse()];
    setLocal(next);
  }
  function removeCourse(ci: number, csi: number) {
    const next = [...local];
    next[ci].courses = next[ci].courses.filter((_, i) => i !== csi);
    setLocal(next);
  }

  function addCourseItem(ci: number, csi: number) {
    const next = [...local];
    next[ci].courses[csi].items = [...(next[ci].courses[csi].items || []), { id: id(), course_id: next[ci].courses[csi].id, product_id: '', surcharge: 0 }];
    setLocal(next);
  }
  function removeCourseItem(ci: number, csi: number, ii: number) {
    const next = [...local];
    next[ci].courses[csi].items = next[ci].courses[csi].items.filter((_, i) => i !== ii);
    setLocal(next);
  }

  function addSchedule(ci: number, preset: typeof PRESETS[number] | null = null) {
    const next = [...local];
    const scheds = next[ci].schedules || [];
    if (preset) {
      for (const d of preset.days) {
        const exists = scheds.some(s => s.day_of_week === d);
        if (!exists) {
          scheds.push({ id: id(), menu_id: next[ci].id, day_of_week: d, start_time: preset.start, end_time: preset.end });
        }
      }
    } else {
      scheds.push({ id: id(), menu_id: next[ci].id, day_of_week: 0, start_time: '13:00', end_time: '16:00' });
    }
    next[ci].schedules = scheds;
    setLocal(next);
  }
  function removeSchedule(ci: number, si: number) {
    const next = [...local];
    next[ci].schedules = next[ci].schedules.filter((_, i) => i !== si);
    setLocal(next);
  }

  function addExtra(ci: number) {
    const next = [...local];
    const extras = next[ci].extras || [];
    extras.push({ name: '', price: 0 });
    next[ci].extras = extras;
    setLocal(next);
  }
  function updateExtra(ci: number, ei: number, field: string, value: unknown) {
    const next = [...local];
    (next[ci].extras[ei] as unknown as Record<string, unknown>)[field] = value;
    setLocal(next);
  }
  function removeExtra(ci: number, ei: number) {
    const next = [...local];
    next[ci].extras = next[ci].extras.filter((_, i) => i !== ei);
    setLocal(next);
  }

  function toggleDay(ci: number, day: number) {
    const next = [...local];
    const scheds = next[ci].schedules || [];
    const existing = scheds.findIndex(s => s.day_of_week === day);
    if (existing >= 0) {
      next[ci].schedules = scheds.filter((_, i) => i !== existing);
    } else {
      next[ci].schedules = [...scheds, { id: id(), menu_id: next[ci].id, day_of_week: day, start_time: '13:00', end_time: '16:00' }];
    }
    setLocal(next);
  }

  const allProducts = catalog.products || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>MENÚ DEL DÍA</h2>
        <div className="flex gap-2">
          <button onClick={addMenu}
            style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
            className="text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 hover:opacity-80">
            <Plus className="w-4 h-4" /> Nuevo menú
          </button>
          <button onClick={() => onSave(local)}
            style={{ background: C.sage, color: '#fff' }}
            className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90">
            <Save className="w-4 h-4 inline mr-1" /> Guardar
          </button>
        </div>
      </div>

      {local.length === 0 && (
        <p style={{ color: C.muted }} className="text-sm text-center py-8">
          No hay menús del día. Crea tu primer menú con cursos y horarios.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {local.map((m, ci) => (
          <div key={m.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 mr-3">
                <input value={m.name} onChange={e => update(ci, 'name', e.target.value)}
                  placeholder="Nombre del menú"
                  style={{ background: C.surfaceLight, color: C.cream }}
                  className="rounded-lg px-3 py-2 text-sm font-medium" />
                <input type="number" step="0.1" min="0" value={m.price}
                  onChange={e => update(ci, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="Precio €"
                  style={{ background: C.surfaceLight, color: C.brassLight }}
                  className="rounded-lg px-3 py-2 text-sm font-mono" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={m.active !== false}
                    onChange={e => update(ci, 'active', e.target.checked)}
                    className="w-4 h-4" />
                  <span style={{ color: m.active !== false ? C.sageLight : C.muted }} className="text-sm">Activo</span>
                </label>
              </div>
              <button onClick={() => removeMenu(ci)} style={{ color: C.wineLight }} className="p-1.5 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <textarea value={m.description || ''} onChange={e => update(ci, 'description', e.target.value)}
              placeholder="Descripción del menú"
              rows={2} style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-2 text-sm mb-3" />

            {/* Includes & Extras */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide">Incluye:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={m.includes_pan} onChange={e => update(ci, 'includes_pan', e.target.checked)}
                  className="w-3.5 h-3.5" />
                <UtensilsCrossed className="w-3.5 h-3.5" style={{ color: C.brassLight }} />
                <span style={{ color: C.cream }} className="text-xs">Pan</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={m.includes_bebida} onChange={e => update(ci, 'includes_bebida', e.target.checked)}
                  className="w-3.5 h-3.5" />
                <GlassWater className="w-3.5 h-3.5" style={{ color: C.brassLight }} />
                <span style={{ color: C.cream }} className="text-xs">Bebida</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={m.includes_cafe} onChange={e => update(ci, 'includes_cafe', e.target.checked)}
                  className="w-3.5 h-3.5" />
                <Coffee className="w-3.5 h-3.5" style={{ color: C.brassLight }} />
                <span style={{ color: C.cream }} className="text-xs">Café</span>
              </label>
              <div className="flex items-center gap-1 ml-2">
                {(m.extras || []).map((ex, ei) => (
                  <div key={ei} className="flex items-center gap-1">
                    <input value={ex.name} onChange={e => updateExtra(ci, ei, 'name', e.target.value)}
                      placeholder="Extra" style={{ background: C.surface, color: C.cream, width: 72 }}
                      className="rounded px-1.5 py-1 text-[10px]" />
                    <input type="number" step="0.1" min="0" value={ex.price}
                      onChange={e => updateExtra(ci, ei, 'price', parseFloat(e.target.value) || 0)}
                      style={{ background: C.surface, color: C.brassLight, width: 52 }}
                      className="rounded px-1 py-1 text-[10px] font-mono" placeholder="€" />
                    <button onClick={() => removeExtra(ci, ei)} style={{ color: C.wineLight }} className="p-0.5">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <button onClick={() => addExtra(ci)} style={{ color: C.sageLight, border: `1px dashed ${C.line}` }}
                  className="text-[10px] px-1.5 py-1 rounded">
                  + Extra
                </button>
              </div>
            </div>

            {/* Courses */}
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Cursos</p>
            <div className="flex flex-col gap-2 mb-4">
              {(m.courses || []).map((course, csi) => (
                <div key={course.id} style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input value={course.name} onChange={e => updateCourse(ci, csi, 'name', e.target.value)}
                      placeholder="Ej: Primer plato, Segundo, Postre..."
                      style={{ background: C.surface, color: C.cream }}
                      className="flex-1 rounded-lg px-2.5 py-1.5 text-sm font-medium" />
                    <button onClick={() => removeCourse(ci, csi)} style={{ color: C.wineLight }} className="p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(course.items || []).map((item, ii) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <select value={item.product_id}
                          onChange={e => updateItem(ci, csi, ii, 'product_id', e.target.value)}
                          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
                          className="flex-1 rounded-lg px-2.5 py-1.5 text-sm">
                          <option value="">Seleccionar plato...</option>
                          {allProducts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({euros(p.price)})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <span style={{ color: C.muted }} className="text-[10px]">+€</span>
                          <input type="number" step="0.1" min="0" value={item.surcharge ?? 0}
                            onChange={e => updateItem(ci, csi, ii, 'surcharge', parseFloat(e.target.value) || 0)}
                            style={{ background: C.surface, color: C.brassLight, width: 60 }}
                            className="rounded-lg px-1.5 py-1.5 text-xs font-mono text-center" />
                        </div>
                        <button onClick={() => removeCourseItem(ci, csi, ii)} style={{ color: C.wineLight }} className="p-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addCourseItem(ci, csi)}
                      style={{ color: C.sageLight, border: `1px dashed ${C.line}` }}
                      className="rounded-lg py-1.5 text-[11px] font-medium hover:opacity-80 flex items-center justify-center gap-1">
                      <Plus className="w-3 h-3" /> Añadir plato a este curso
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => addCourse(ci)}
                style={{ color: C.brassLight, border: `1px dashed ${C.brass}40` }}
                className="rounded-lg py-2 text-xs font-medium hover:opacity-80 flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Añadir curso
              </button>
            </div>

            {/* Schedule */}
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Horario de disponibilidad
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DAYS.map((day, i) => {
                const has = (m.schedules || []).some(s => s.day_of_week === i);
                return (
                  <button key={i} onClick={() => toggleDay(ci, i)}
                    style={{
                      background: has ? C.brass + '30' : C.surface,
                      border: `1px solid ${has ? C.brass : C.line}`,
                      color: has ? C.cream : C.muted,
                    }}
                    className="text-[10px] px-2 py-1.5 rounded-lg font-medium">
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESETS.map((p, i) => (
                <button key={i} onClick={() => addSchedule(ci, p)}
                  style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.muted }}
                  className="text-[10px] px-2 py-1 rounded-lg hover:opacity-80 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" /> {p.label}
                </button>
              ))}
            </div>
            {(m.schedules || []).length > 0 && (
              <div className="flex flex-col gap-1">
                {(m.schedules || []).map((s, si) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span style={{ color: C.cream }} className="w-8 font-medium">{DAYS[s.day_of_week]}</span>
                    <input type="time" value={s.start_time}
                      onChange={e => updateSchedule(ci, si, 'start_time', e.target.value)}
                      style={{ background: C.surface, color: C.cream, width: 80 }}
                      className="rounded px-1.5 py-1 font-mono text-[11px]" />
                    <span style={{ color: C.muted }}>→</span>
                    <input type="time" value={s.end_time}
                      onChange={e => updateSchedule(ci, si, 'end_time', e.target.value)}
                      style={{ background: C.surface, color: C.cream, width: 80 }}
                      className="rounded px-1.5 py-1 font-mono text-[11px]" />
                    <button onClick={() => removeSchedule(ci, si)} style={{ color: C.wineLight }} className="p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(!m.schedules || m.schedules.length === 0) && (
              <p style={{ color: C.muted }} className="text-[10px] italic">Sin horario — disponible siempre</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
