"use client";

import { useState, useMemo } from 'react';
import { X, Check, Coffee, GlassWater, Clock, UtensilsCrossed } from 'lucide-react';
import { euros, type Theme } from './constants';

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface MenuCourseItem {
  id: string;
  product_id: string;
  surcharge: number;
}

interface MenuCourse {
  id: string;
  name: string;
  items: MenuCourseItem[];
}

interface MenuSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface MenuExtra {
  name: string;
  price: number;
}

interface MenuDelDiaMenu {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  courses: MenuCourse[];
  schedules: MenuSchedule[];
  extras: MenuExtra[];
  includes_pan: boolean;
  includes_bebida: boolean;
  includes_cafe: boolean;
}

interface MenuDelDiaProduct {
  id: string;
  name: string;
  price: number;
}

interface MenuDelDiaCatalog {
  products: MenuDelDiaProduct[];
}

interface MenuDelDiaSelection {
  courseName: string;
  productId: string;
  surcharge: number;
}

interface MenuDelDiaSelectorProps {
  menu: MenuDelDiaMenu;
  catalog: MenuDelDiaCatalog;
  colors: Theme;
  onConfirm: (selections: MenuDelDiaSelection[], menu: MenuDelDiaMenu) => void;
  onClose: () => void;
}

function isAvailableNow(menu: MenuDelDiaMenu) {
  if (!menu.schedules || menu.schedules.length === 0) return true;
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  return menu.schedules.some(s => s.day_of_week === day && time >= s.start_time && time <= s.end_time);
}

function nextAvailable(menu: MenuDelDiaMenu): { label: string } | null {
  const now = new Date();
  const currentDay = (now.getDay() + 6) % 7;
  const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  let best: { day_of_week: number; start_time: string; label: string } | null = null;
  for (const s of (menu.schedules || [])) {
    if (s.day_of_week < currentDay || (s.day_of_week === currentDay && s.end_time <= currentTime)) continue;
    const daysUntil = s.day_of_week - currentDay;
    const label = daysUntil === 0 ? 'hoy' : daysUntil === 1 ? 'mañana' : DAYS_SHORT[s.day_of_week];
    const timeLabel = s.start_time.slice(0, 5);
    if (!best || (s.day_of_week < best.day_of_week) || (s.day_of_week === best.day_of_week && s.start_time < best.start_time)) {
      best = { day_of_week: s.day_of_week, start_time: s.start_time, label: `${label} ${timeLabel}` };
    }
  }
  return best;
}

export default function MenuDelDiaSelector({ menu, catalog, colors: C, onConfirm, onClose }: MenuDelDiaSelectorProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  function toggleProduct(courseId: string, productId: string) {
    setSelections(s => {
      const current = s[courseId];
      if (current === productId) {
        const next = { ...s };
        delete next[courseId];
        return next;
      }
      return { ...s, [courseId]: productId };
    });
  }

  const { totalSurcharge, totalSaving } = useMemo(() => {
    let surcharge = 0, indTotal = 0;
    for (const course of (menu.courses || [])) {
      const pid = selections[course.id];
      if (!pid) continue;
      const item = course.items.find(i => i.product_id === pid);
      const prod = catalog.products.find(p => p.id === pid);
      if (item) surcharge += item.surcharge || 0;
      if (prod) indTotal += prod.price;
    }
    return { totalSurcharge: surcharge, totalSaving: Math.max(0, indTotal - menu.price) };
  }, [selections, menu.courses, menu.price, catalog.products]);

  const available = isAvailableNow(menu);
  const nextAvail = !available ? nextAvailable(menu) : null;

  function canConfirm() {
    return menu.courses && menu.courses.length > 0 && menu.courses.every(c => selections[c.id]);
  }

  function handleConfirm() {
    const chosen: MenuDelDiaSelection[] = [];
    for (const course of (menu.courses || [])) {
      const pid = selections[course.id];
      if (!pid) continue;
      const item = course.items.find(i => i.product_id === pid);
      chosen.push({
        courseName: course.name,
        productId: pid,
        surcharge: item?.surcharge || 0,
      });
    }
    onConfirm(chosen, menu);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.line}` }}
        className="rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 style={{ color: C.cream }} className="text-lg font-bold uppercase tracking-wide">{menu.name}</h3>
            <p style={{ color: C.muted }} className="text-xs">{menu.description}</p>
          </div>
          <button onClick={onClose} style={{ color: C.muted }} className="p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Availability badge */}
        {!available && (
          <div style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
            className="rounded-lg px-3 py-2 text-xs mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            No disponible ahora
            {nextAvail && <> — próximo: <strong>{nextAvail.label}</strong></>}
          </div>
        )}

        {/* Price & savings */}
        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: C.muted }}>Precio menú</span>
            <span style={{ color: C.brassLight }} className="font-mono font-bold">{euros(menu.price)}</span>
          </div>
          {totalSaving > 0 && (
            <div className="flex items-center justify-between text-xs mt-1">
              <span style={{ color: C.muted }}>Ahorro estimado</span>
              <span style={{ color: C.sageLight }} className="font-mono">{euros(totalSaving)}</span>
            </div>
          )}
          {totalSurcharge > 0 && (
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span style={{ color: C.muted }}>Suplementos</span>
              <span style={{ color: C.wineLight }} className="font-mono">+{euros(totalSurcharge)}</span>
            </div>
          )}
        </div>

        {/* Includes */}
        <div className="flex flex-wrap gap-2 mb-4">
          {menu.includes_pan && (
            <span style={{ background: C.surfaceLight, color: C.brassLight }} className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <UtensilsCrossed className="w-3 h-3" /> Pan incluido
            </span>
          )}
          {menu.includes_bebida && (
            <span style={{ background: C.surfaceLight, color: C.brassLight }} className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <GlassWater className="w-3 h-3" /> Bebida incluida
            </span>
          )}
          {menu.includes_cafe && (
            <span style={{ background: C.surfaceLight, color: C.brassLight }} className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <Coffee className="w-3 h-3" /> Café incluido
            </span>
          )}
        </div>

        {/* Courses */}
        <div className="flex flex-col gap-4">
          {menu.courses.map(course => {
            const selected = selections[course.id];
            return (
              <div key={course.id} style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
                className="rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: C.cream }} className="text-sm font-bold uppercase tracking-wide">{course.name}</span>
                  {selected && <span className="text-[10px]" style={{ color: C.sageLight }}>✓ Elegido</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {course.items.map(item => {
                    const prod = catalog.products.find(p => p.id === item.product_id);
                    if (!prod) return null;
                    const sel = selected === item.product_id;
                    return (
                      <button key={item.id} onClick={() => toggleProduct(course.id, item.product_id)}
                        style={{
                          background: sel ? C.brass + '30' : C.surface,
                          border: `1px solid ${sel ? C.brass : C.line}`,
                          color: sel ? C.cream : C.muted,
                        }}
                        className="text-[11px] px-2.5 py-2 rounded-lg flex items-center gap-1.5 font-medium transition-all"
                      >
                        {sel && <Check className="w-3 h-3" style={{ color: C.brassLight }} />}
                        {prod.name}
                        <span className="font-mono" style={{ color: C.brassLight }}>{euros(prod.price)}</span>
                        {item.surcharge > 0 && (
                          <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.wine + '30', color: C.wineLight }}>
                            +{euros(item.surcharge)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {course.items.length === 0 && (
                    <span style={{ color: C.muted }} className="text-xs">Sin platos asignados</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Extras */}
        {menu.extras && menu.extras.length > 0 && (
          <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="rounded-lg p-3 mt-3">
            <span style={{ color: C.muted }} className="text-xs uppercase tracking-wide font-medium">Extras</span>
            {menu.extras.map((ex, i) => (
              <div key={i} className="flex items-center justify-between text-xs mt-1.5">
                <span style={{ color: C.cream }}>{ex.name}</span>
                <span style={{ color: C.brassLight }} className="font-mono">{euros(ex.price)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Schedules info */}
        {menu.schedules && menu.schedules.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {menu.schedules.map((s, i) => {
              const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
              return (
                <span key={i} style={{ color: C.muted, background: C.surfaceLight }} className="text-[9px] px-1.5 py-0.5 rounded">
                  {dayNames[s.day_of_week]} {s.start_time}-{s.end_time}
                </span>
              );
            })}
          </div>
        )}

        <button onClick={handleConfirm} disabled={!canConfirm()}
          style={{
            background: canConfirm() ? C.sage : C.line,
            color: '#fff',
            opacity: canConfirm() ? 1 : 0.5,
          }}
          className="w-full mt-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider hover:opacity-90 disabled:cursor-not-allowed transition-all">
          {canConfirm()
            ? `Añadir menú — ${euros(menu.price + totalSurcharge)}`
            : 'Elige un plato de cada curso'}
        </button>
      </div>
    </div>
  );
}
