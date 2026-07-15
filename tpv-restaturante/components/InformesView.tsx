"use client";

import { useState, useMemo, useEffect, type FormEvent } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import {
  BarChart3, Banknote, CreditCard, Smartphone, Clock, Download, Printer, LogIn, ShieldCheck, User, Save,
} from 'lucide-react';
import { euros, round2, PAYMENT_METHODS } from './constants';
import { fetchAccessLogs, fetchBackup, fetchStockLog, fetchTurns, fetchClosures, saveClosure } from '../lib/api';
import VerifactuPanel from './VerifactuPanel';
import FoodCostView from './FoodCostView';
import type { Theme } from './constants';

// ---- Types ----
interface SaleItem { name: string; qty: number; }
interface Payment { method: string; amount: number; confirmed?: boolean; }
interface Sale {
  id: string; total: number; closedAt: number; items: SaleItem[];
  paymentMethod: string; payments?: Payment[];
  employeeName?: string; tableName?: string;
  tip?: number; tipMethod?: string;
  isFiado?: boolean; isDebtPayment?: boolean;
  totalWithTip?: number; tableId?: string;
}
interface AccessLogRow { id: string; loggedAt: number | string; employeeName: string; role: string; entryPoint: string; }
interface StockLogRow { id: string; product_name?: string; productName?: string; reason: string; created_at?: number; createdAt?: number; change_amount: number; old_stock: number; new_stock: number; }
interface TurnRow { employee_name?: string; employeeName?: string; action?: string; time?: number; }
interface ClosureMethod { method: string; label?: string; total: number; }
interface ClosureEmployee { name: string; total: number; count: number; }
interface DenomItem { value: number; label: string; count?: number; subtotal?: number; }
interface Closure {
  id: string; date: string; total: number; ticket_count: number;
  avg_ticket: number; methods?: ClosureMethod[]; employees?: ClosureEmployee[];
  sales_ids: string[]; closed_at: number; employee_name: string;
  cuadratura?: DenomItem[] | { denoms: DenomItem[]; expected: number; counted: number; diff: number; };
  cuadratura_expected?: number; cuadratura_counted?: number; cuadratura_diff?: number;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PAYMENT_METHODS_UI = PAYMENT_METHODS.map(m => ({
  ...m,
  icon: { efectivo: Banknote, tarjeta: CreditCard, bizum: Smartphone, fiado: Clock }[m.id] || Banknote,
}));

// ---------- Vista contenedor ----------
export default function InformesView({ sales, colors: C }: { sales: Sale[]; colors: Theme }) {
  const [tab, setTab] = useState('resumen');

  const tabs: { id: string; label: string }[] = [
    { id: 'resumen',   label: 'Resumen' },
    { id: 'extracto',  label: 'Extracto' },
    { id: 'cierre',    label: 'Cierre de caja' },
    { id: 'empleados', label: 'Por empleado' },
    { id: 'propinas', label: 'Propinas' },
    { id: 'control',   label: 'Control de caja' },
    { id: 'accesos',   label: 'Accesos' },
    { id: 'verifactu', label: 'Verifactu' },
    { id: 'stock',     label: 'Stock' },
    { id: 'turns',     label: 'Turnos' },
    { id: 'cierres',   label: 'Cierres' },
    { id: 'respaldo',  label: 'Respaldo' },
  ];

  if (sales.length === 0 && tab !== 'accesos' && tab !== 'verifactu' && tab !== 'respaldo' && tab !== 'extracto' && tab !== 'cierres') {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
        <p style={{ color: C.muted }} className="text-sm mb-4">
          Aun no hay ventas registradas. En cuanto cierres una cuenta, aparecera aqui.
        </p>
        <button
          onClick={() => setTab('accesos')}
          style={{ background: C.surfaceLight, color: C.muted }}
          className="text-sm font-medium px-3 py-2 rounded-lg"
        >
          Ver registros de acceso
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 no-print">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>INFORMES</h2>
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? C.brass : C.surfaceLight,
                color: tab === t.id ? C.base : C.muted,
              }}
              className="text-sm font-medium px-3 py-2 rounded-lg"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'extracto'  && <ExtractoTab  sales={sales} colors={C} />}
      {tab === 'resumen'   && <ResumenTab   sales={sales} colors={C} />}
      {tab === 'cierre'    && <CierreCajaTab sales={sales} colors={C} />}
      {tab === 'empleados' && <EmpleadosTabInformes sales={sales} colors={C} />}
      {tab === 'propinas'  && <PropinasTab sales={sales} colors={C} />}
      {tab === 'control'   && <ControlCajaTab sales={sales} colors={C} />}
      {tab === 'accesos'   && <AccesosTab colors={C} />}
      {tab === 'verifactu' && <VerifactuPanel colors={C} sales={sales as { id: string }[]} />}
      {tab === 'stock'     && <StockLogTab colors={C} />}
      {tab === 'turns'     && <TurnsTab colors={C} />}
      {tab === 'cierres'   && <CierresGuardadosTab colors={C} />}
      {tab === 'respaldo'  && <RespaldoTab colors={C} />}
    </div>
  );
}

// ---------- helpers ----------
function useYearLabel(sales: Sale[], year: number) {
  return useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthSales = sales.filter(s => {
        const d = new Date(Number(s.closedAt));
        return d.getFullYear() === year && d.getMonth() === i;
      });
      const total = monthSales.reduce((s, x) => s + x.total, 0);
      const count = monthSales.length;
      const byMethod: Record<string, number> = {};
      monthSales.forEach(s => {
        const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
        payments.forEach(p => {
          if (p.method === 'bizum' && p.confirmed === false) return;
          byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
        });
      });
      return { month: MONTHS[i], total, count, byMethod, sales: monthSales };
    });
    const yearTotal = months.reduce((s, m) => s + m.total, 0);
    const yearCount = months.reduce((s, m) => s + m.count, 0);
    const yearMethods: Record<string, number> = {};
    months.forEach(m => {
      Object.entries(m.byMethod).forEach(([method, amount]) => {
        yearMethods[method] = (yearMethods[method] || 0) + amount;
      });
    });
    const topProducts: [string, number][] = (() => {
      const map: Record<string, number> = {};
      sales.filter(s => new Date(Number(s.closedAt)).getFullYear() === year).forEach(s => {
        (s.items || []).forEach(i => { map[i.name] = (map[i.name] || 0) + i.qty; });
      });
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    })();
    return { months, yearTotal, yearCount, yearMethods, topProducts };
  }, [sales, year]);
}

// ---------- Tab: Extracto ----------
function ExtractoTab({ sales, colors: C }: { sales: Sale[]; colors: Theme }) {
  const years = [...new Set(sales.map(s => new Date(Number(s.closedAt)).getFullYear()))].sort((a, b) => b - a);
  const [year, setYear] = useState(years[0] || new Date().getFullYear());
  const { months, yearTotal, yearCount, yearMethods, topProducts } = useYearLabel(sales, year);

  async function downloadXLSX() {
    try {
      const res = await fetch(`/api/export/sales?year=${year}`);
      if (!res.ok) throw new Error('Error en exportación');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ventas-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
  }

  function downloadCSV() {
    const rows: (string | number)[][] = [
      ['Mes', 'Tickets', 'Total €', 'Efectivo', 'Tarjeta', 'Bizum', 'Fiado'],
      ...months.map(m => [
        m.month, m.count, m.total.toFixed(2),
        (m.byMethod.efectivo || 0).toFixed(2),
        (m.byMethod.tarjeta || 0).toFixed(2),
        (m.byMethod.bizum || 0).toFixed(2),
        (m.byMethod.fiado || 0).toFixed(2),
      ]),
      [],
      ['TOTAL', yearCount, yearTotal.toFixed(2),
        (yearMethods.efectivo || 0).toFixed(2),
        (yearMethods.tarjeta || 0).toFixed(2),
        (yearMethods.bizum || 0).toFixed(2),
        (yearMethods.fiado || 0).toFixed(2),
      ],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracto-${year}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4 no-print">
        <h3 className="font-display text-lg" style={{ color: C.cream }}>EXTRACTO ANUAL</h3>
        <div className="flex gap-1.5">
          {years.map(y => (
            <button key={y} onClick={() => setYear(y)}
              style={{ background: year === y ? C.brass : C.surfaceLight, color: year === y ? C.base : C.muted }}
              className="text-sm font-medium px-3 py-1.5 rounded-lg">{y}</button>
          ))}
          {years.length === 0 && (
            <span style={{ color: C.muted }} className="text-sm">{new Date().getFullYear()}</span>
          )}
        </div>
        <div className="flex-1" />
        <button onClick={downloadXLSX} style={{ background: C.sage, color: '#fff' }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 hover:opacity-90">
          <Download className="w-4 h-4" /> XLSX
        </button>
        <button onClick={downloadCSV} style={{ background: C.surfaceLight, color: C.cream }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Total {year}</p>
          <p className="font-display text-2xl" style={{ color: C.brassLight }}>{euros(yearTotal)}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Tickets</p>
          <p className="font-display text-2xl" style={{ color: C.cream }}>{yearCount}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Ticket medio</p>
          <p className="font-display text-2xl" style={{ color: C.cream }}>{euros(yearCount ? yearTotal / yearCount : 0)}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Productos vendidos</p>
          <p className="font-display text-2xl" style={{ color: C.cream }}>{topProducts.reduce((s, m) => s + m[1], 0)}</p>
        </div>
      </div>

      {Object.keys(yearMethods).length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-5">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-3">Por método de pago — {year}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PAYMENT_METHODS_UI.map(m => {
              const total = yearMethods[m.id] || 0;
              const Icon = m.icon;
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: C.muted }} />
                  <div>
                    <p className="text-xs" style={{ color: C.muted }}>{m.label}</p>
                    <p className="font-mono text-sm" style={{ color: C.brassLight }}>{euros(total)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl overflow-hidden">
        <div style={{ background: C.surfaceLight, color: C.muted }} className="grid grid-cols-6 gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wide">
          <span className="col-span-2">Mes</span>
          <span className="text-right">Tickets</span>
          <span className="text-right">Total</span>
          <span className="text-right col-span-2">Ticket medio</span>
        </div>
        {months.map(m => (
          <div key={m.month} style={{ borderTop: `1px solid ${C.line}` }} className="grid grid-cols-6 gap-2 px-4 py-2.5 text-sm">
            <span className="col-span-2 font-medium" style={{ color: C.cream }}>{m.month}</span>
            <span className="text-right font-mono" style={{ color: m.count > 0 ? C.cream : C.muted }}>{m.count}</span>
            <span className="text-right font-mono" style={{ color: m.total > 0 ? C.brassLight : C.muted }}>{euros(m.total)}</span>
            <span className="text-right font-mono col-span-2" style={{ color: m.count > 0 ? C.sageLight : C.muted }}>
              {m.count > 0 ? euros(m.total / m.count) : '—'}
            </span>
          </div>
        ))}
      </div>

      {topProducts.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mt-5">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-3">Top 10 productos — {year}</p>
          <div className="flex flex-col gap-1.5">
            {topProducts.map(([name, qty], idx) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span>{idx + 1}. {name}</span>
                <span className="font-mono" style={{ color: C.brassLight }}>{qty} uds.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Tab: Resumen ----------
function ResumenTab({ sales, colors: C }: { sales: Sale[]; colors: Theme }) {
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(Number(s.closedAt)).toDateString() === today);
  const todayTotal = todaySales.reduce((s, x) => s + x.total, 0);

  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map(d => {
      const key = d.toLocaleDateString('es-ES', { weekday: 'short' });
      const total = sales
        .filter(s => new Date(Number(s.closedAt)).toDateString() === d.toDateString())
        .reduce((s, x) => s + x.total, 0);
      return { day: key, total: Math.round(total * 100) / 100 };
    });
  }, [sales]);

  const topProducts: [string, number][] = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => s.items.forEach(i => { map[i.name] = (map[i.name] || 0) + i.qty; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sales]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Hoy</p>
          <p className="font-display text-3xl" style={{ color: C.brassLight }}>{euros(todayTotal)}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Tickets hoy</p>
          <p className="font-display text-3xl" style={{ color: C.cream }}>{todaySales.length}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Ticket medio hoy</p>
          <p className="font-display text-3xl" style={{ color: C.cream }}>
            {euros(todaySales.length ? todayTotal / todaySales.length : 0)}
          </p>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-6">
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Ingresos por método — hoy</p>
        <div className="grid grid-cols-3 gap-3">
          {PAYMENT_METHODS_UI.map(m => {
            const Icon = m.icon;
            const total = todaySales.reduce((sum, s) => {
              const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
              return sum + payments.filter(p => p.method === m.id).reduce((a, p) => a + p.amount, 0);
            }, 0);
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 text-center">
                <Icon className="w-4 h-4" style={{ color: C.muted }} />
                <span className="text-xs" style={{ color: C.muted }}>{m.label}</span>
                <span className="font-mono text-sm" style={{ color: C.brassLight }}>{euros(total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-6">
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Deudas pendientes (fiado)</p>
        {(() => {
          const fiadoSales = sales.filter(s => s.isFiado && !s.isDebtPayment);
          const paidTableIds = new Set(sales.filter(s => s.isDebtPayment).map(s => s.tableId));
          const pending = fiadoSales.filter(s => !paidTableIds.has(s.tableId!));
          const totalPending = pending.reduce((s, x) => s + (x.totalWithTip || 0), 0);
          return pending.length === 0 ? (
            <p style={{ color: C.muted }} className="text-sm text-center py-3">No hay deudas pendientes</p>
          ) : (
            <div className="flex items-center justify-between">
              <span style={{ color: C.cream }} className="text-sm">{pending.length} mesa{pending.length !== 1 ? 's' : ''} con fiado pendiente</span>
              <span className="font-mono font-bold text-lg" style={{ color: C.wineLight }}>{euros(totalPending)}</span>
            </div>
          );
        })()}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-6">
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Ventas — últimos 7 días</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={last7}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="day" stroke={C.muted} fontSize={12} />
              <YAxis stroke={C.muted} fontSize={12} />
              <Tooltip
                contentStyle={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                formatter={(v: unknown) => [euros(Number((v as number) ?? 0)), 'Total']}
              />
              <Bar dataKey="total" fill={C.brass} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Productos más vendidos</p>
        <div className="flex flex-col gap-2">
          {topProducts.map(([name, qty], idx) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span>{idx + 1}. {name}</span>
              <span className="font-mono" style={{ color: C.brassLight }}>{qty} uds.</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Cuadratura Card ----------
function CuadraturaCard({ closure, colors: C }: { closure: Closure; colors: Theme }) {
  const [open, setOpen] = useState(false);
  const raw = closure.cuadratura;
  const cuadDenoms = Array.isArray(raw) ? raw : (raw?.denoms || []);
  const cuadExpected = (raw && !Array.isArray(raw)) ? raw.expected : (Array.isArray(raw) ? raw.reduce((s, d) => s + (d.subtotal || 0), 0) : 0);
  const cuadCounted = (raw && !Array.isArray(raw)) ? raw.counted : (Array.isArray(raw) ? raw.reduce((s, d) => s + (d.subtotal || 0), 0) : 0);
  const cuadDiff = (raw && !Array.isArray(raw) ? raw.diff : 0) ?? 0;
  const hasCuadratura = Array.isArray(cuadDenoms) && cuadDenoms.length > 0;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.brass}` }} className="rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-base" style={{ color: C.brassLight }}>
            <ShieldCheck className="w-4 h-4 inline mr-1.5" />
            Cierre de caja registrado
          </p>
          <p style={{ color: C.muted }} className="text-xs mt-1">
            {new Date(Number(closure.closed_at)).toLocaleString('es-ES')} — {euros(closure.total)} — {closure.ticket_count} tickets
          </p>
        </div>
        {hasCuadratura && (
          <button onClick={() => setOpen(!open)} style={{ color: C.muted }} className="text-xs underline">
            {open ? 'Ocultar' : 'Ver'} cuadratura
          </button>
        )}
      </div>
      {hasCuadratura && open && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-4 gap-2 text-xs mb-2">
            <span style={{ color: C.muted }}>Esperado:</span>
            <span className="font-mono" style={{ color: C.cream }}>{euros(cuadExpected)}</span>
            <span style={{ color: C.muted }}>Contado:</span>
            <span className="font-mono" style={{ color: C.cream }}>{euros(cuadCounted)}</span>
          </div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span style={{ color: C.muted }}>Diferencia:</span>
            <span className="font-mono" style={{ color: Math.abs(cuadDiff) < 0.01 ? C.cream : cuadDiff > 0 ? C.sageLight : C.wineLight }}>
              {cuadDiff >= 0 ? '+' : ''}{euros(Math.abs(cuadDiff) < 0.01 ? 0 : cuadDiff)}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1 text-xs">
            {cuadDenoms.filter((d: DenomItem) => d.count && d.count > 0).map((d: DenomItem) => (
              <div key={d.value} className="flex justify-between" style={{ color: C.muted }}>
                <span>{d.label}:</span>
                <span className="font-mono" style={{ color: C.cream }}>{d.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DENOMS = [
  { value: 500,  label: '500€' },
  { value: 200,  label: '200€' },
  { value: 100,  label: '100€' },
  { value: 50,   label: '50€' },
  { value: 20,   label: '20€' },
  { value: 10,   label: '10€' },
  { value: 5,    label: '5€' },
  { value: 2,    label: '2€' },
  { value: 1,    label: '1€' },
  { value: 0.50, label: '0,50€' },
  { value: 0.20, label: '0,20€' },
  { value: 0.10, label: '0,10€' },
  { value: 0.05, label: '0,05€' },
  { value: 0.02, label: '0,02€' },
  { value: 0.01, label: '0,01€' },
];

// ---------- Tab: Cierre de caja ----------
function CierreCajaTab({ sales, colors: C }: { sales: Sale[]; colors: Theme }) {
  const [period, setPeriod] = useState('dia');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthValue, setMonthValue] = useState(() => new Date().toISOString().slice(0, 7));
  const [closing, setClosing] = useState(false);
  const [lastClosure, setLastClosure] = useState<Closure | null>(null);
  const [existingClosures, setExistingClosures] = useState<Closure[]>([]);
  const [cuadraturaCounts, setCuadraturaCounts] = useState<Record<number, string>>(() => DENOMS.reduce((acc, d) => ({ ...acc, [d.value]: '' }), {}));
  const [cuadraturaOk, setCuadraturaOk] = useState(false);

  useEffect(() => {
    fetchClosures().then(data => setExistingClosures((data as Closure[]) || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const found = existingClosures.find(c => c.date === dateValue);
    setLastClosure(found || null);
    setCuadraturaOk(false);
    setCuadraturaCounts(DENOMS.reduce((acc, d) => ({ ...acc, [d.value]: '' }), {}));
  }, [dateValue, existingClosures]);

  const periodSales = useMemo(() => {
    if (period === 'dia') return sales.filter(s => new Date(Number(s.closedAt)).toISOString().slice(0, 10) === dateValue);
    return sales.filter(s => new Date(Number(s.closedAt)).toISOString().slice(0, 7) === monthValue);
  }, [sales, period, dateValue, monthValue]);

  const total = periodSales.reduce((s, x) => s + x.total, 0);
  const ticketCount = periodSales.length;
  const avgTicket = ticketCount ? total / ticketCount : 0;

  const methodTotals = PAYMENT_METHODS.map(m => {
    const t = periodSales.reduce((sum, s) => {
      const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
      return sum + payments.filter(p => p.method === m.id).reduce((a, p) => a + p.amount, 0);
    }, 0);
    return { ...m, total: t };
  });

  const employeeTotals: [string, { total: number; count: number }][] = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    periodSales.forEach(s => {
      const key = s.employeeName || 'Sin asignar';
      if (!map[key]) map[key] = { total: 0, count: 0 };
      map[key].total += s.total;
      map[key].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [periodSales]);

  const periodLabel = period === 'dia'
    ? new Date(dateValue + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date(monthValue + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  function downloadCSV() {
    const rows: (string | number)[][] = [
      ['Fecha', 'Hora', 'Mesa', 'Empleado', 'Total €', 'Métodos de pago'] as (string | number)[],
      ...periodSales.map(s => {
        const d = new Date(Number(s.closedAt));
        const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
        const metodos = payments
          .map(p => `${PAYMENT_METHODS.find(m => m.id === p.method)?.label || p.method} ${p.amount.toFixed(2)}€`)
          .join(' + ');
        return [
          d.toLocaleDateString('es-ES'),
          d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          s.tableName, s.employeeName || 'Sin asignar', s.total.toFixed(2), metodos,
        ] as (string | number)[];
      }),
      [] as (string | number)[],
      ['TOTAL', '', '', '', total.toFixed(2), ''] as (string | number)[],
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cierre-${period === 'dia' ? dateValue : monthValue}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        <button onClick={() => setPeriod('dia')} style={{ background: period === 'dia' ? C.brass : C.surfaceLight, color: period === 'dia' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Día</button>
        <button onClick={() => setPeriod('mes')} style={{ background: period === 'mes' ? C.brass : C.surfaceLight, color: period === 'mes' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Mes</button>
        {period === 'dia'
          ? <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
          : <input type="month" value={monthValue} onChange={e => setMonthValue(e.target.value)} style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
        }
        <div className="flex-1" />
        <button onClick={downloadCSV} disabled={periodSales.length === 0} style={{ background: C.surfaceLight, color: C.cream }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
          <Download className="w-4 h-4" /> CSV
        </button>
        <button onClick={() => window.print()} disabled={periodSales.length === 0} style={{ background: C.brass, color: C.base }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>

      <div id="printable-report" style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-xl" style={{ color: C.cream }}>CIERRE DE CAJA</h3>
          <span style={{ color: C.muted }} className="text-xs uppercase">{period === 'dia' ? 'Diario' : 'Mensual'}</span>
        </div>
        <p style={{ color: C.muted }} className="text-sm mb-4 capitalize">{periodLabel}</p>

        {periodSales.length === 0 ? (
          <p style={{ color: C.muted }} className="text-sm py-6 text-center">No hay ventas registradas en este periodo.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Total</p>
                <p className="font-display text-2xl" style={{ color: C.brassLight }}>{euros(total)}</p>
              </div>
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Tickets</p>
                <p className="font-display text-2xl" style={{ color: C.cream }}>{ticketCount}</p>
              </div>
              <div>
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Ticket medio</p>
                <p className="font-display text-2xl" style={{ color: C.cream }}>{euros(avgTicket)}</p>
              </div>
            </div>

            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Por método de pago</p>
            <div className="flex flex-col gap-1.5 mb-5">
              {methodTotals.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.label}</span>
                  <span className="font-mono" style={{ color: C.brassLight }}>{euros(m.total)}</span>
                </div>
              ))}
            </div>

            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Por empleado</p>
            <div className="flex flex-col gap-1.5">
              {employeeTotals.map(([name, data]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name} <span style={{ color: C.muted }} className="text-xs">({data.count} tickets)</span></span>
                  <span className="font-mono" style={{ color: C.brassLight }}>{euros(data.total)}</span>
                </div>
              ))}
            </div>

            <hr style={{ borderColor: C.line }} className="my-4" />
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Listado de tickets</p>
            <div className="max-h-64 overflow-y-auto text-xs space-y-1">
              {periodSales.map(s => {
                const d = new Date(Number(s.closedAt));
                return (
                  <div key={s.id} style={{ borderBottom: `1px solid ${C.line}` }} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono shrink-0" style={{ color: C.cream }}>
                        {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="shrink-0" style={{ color: C.muted }}>{s.tableName || '—'}</span>
                      <span className="truncate" style={{ color: C.muted }}>
                        {(s.items || []).slice(0, 2).map(i => `${i.qty}x ${i.name}`).join(', ')}
                        {(s.items || []).length > 2 && ' ...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: C.surfaceLight, color: C.muted }}>
                        {s.paymentMethod || '—'}
                      </span>
                      <span className="font-mono" style={{ color: C.brassLight }}>{euros(s.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="no-print mt-6">
        {lastClosure && (
          <CuadraturaCard closure={lastClosure} colors={C} />
        )}
        {!lastClosure && period === 'dia' && periodSales.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-5">
            <h4 className="font-display text-lg mb-2" style={{ color: C.cream }}>
              <Banknote className="w-5 h-5 inline mr-1.5" />
              Cuadratura y cierre de caja
            </h4>

            {(() => {
              const expectedEfectivo = periodSales.reduce((sum, s) => {
                const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
                return sum + payments.filter(p => p.method === 'efectivo').reduce((a, p) => a + p.amount, 0);
              }, 0);
              const totalCounted = DENOMS.reduce((s, d) => s + (parseFloat(cuadraturaCounts[d.value]) || 0) * d.value, 0);
              const diff = round2(totalCounted - expectedEfectivo);

              return (
                <>
                  <p style={{ color: C.muted }} className="text-sm mb-3">
                    Día {new Date(dateValue + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    — {ticketCount} tickets — {euros(total)}
                  </p>

                  <hr style={{ borderColor: C.line }} className="my-3" />

                  <p className="text-sm font-medium mb-2" style={{ color: C.cream }}>Recuento físico de efectivo</p>
                  <div className="text-sm mb-3 flex items-center justify-between" style={{ color: C.muted }}>
                    <span>Esperado en caja (ventas efectivo):</span>
                    <span className="font-mono" style={{ color: C.cream }}>{euros(expectedEfectivo)}</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {DENOMS.map(d => (
                      <div key={d.value} className="flex flex-col items-center">
                        <span className="text-xs mb-1" style={{ color: C.muted }}>{d.label}</span>
                        <input
                          type="number" min="0" step="1"
                          disabled={cuadraturaOk}
                          value={cuadraturaCounts[d.value]}
                          onChange={e => setCuadraturaCounts(prev => ({ ...prev, [d.value]: e.target.value }))}
                          style={{ background: cuadraturaOk ? C.surface : C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, width: '100%' }}
                          className="rounded-lg px-2 py-1.5 text-sm text-center"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
                    <span style={{ color: C.muted }}>Total contado:</span>
                    <span className="font-mono" style={{ color: C.cream }}>{euros(totalCounted)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span style={{ color: C.muted }}>Diferencia:</span>
                    <span className="font-mono" style={{ color: Math.abs(diff) < 0.01 ? C.cream : diff > 0 ? C.sageLight : C.wineLight }}>
                      {diff >= 0 ? '+' : ''}{euros(Math.abs(diff) < 0.01 ? 0 : diff)}
                    </span>
                  </div>

                  {cuadraturaOk ? (
                    <button
                      onClick={async () => {
                        setClosing(true);
                        try {
                          const methods = PAYMENT_METHODS.map(m => ({
                            method: m.id, label: m.label,
                            total: periodSales.reduce((sum, s) => {
                              const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
                              return sum + payments.filter(p => p.method === m.id).reduce((a, p) => a + p.amount, 0);
                            }, 0),
                          }));
                          const employees = employeeTotals.map(([name, data]) => ({ name, total: data.total, count: data.count }));
                          const cuadratura = DENOMS.map(d => ({
                            value: d.value, label: d.label,
                            count: parseInt(cuadraturaCounts[d.value]) || 0,
                            subtotal: ((parseInt(cuadraturaCounts[d.value]) || 0) * d.value),
                          }));
                          const data: Closure = {
                            id: `closure_${dateValue}`, date: dateValue, total,
                            ticket_count: ticketCount, avg_ticket: round2(avgTicket),
                            methods, employees,
                            sales_ids: periodSales.map(s => s.id),
                            closed_at: Date.now(), employee_name: 'Admin',
                            cuadratura, cuadratura_expected: expectedEfectivo,
                            cuadratura_counted: totalCounted, cuadratura_diff: round2(totalCounted - expectedEfectivo),
                          };
                          const res = await saveClosure(data as unknown as Record<string, unknown>);
                          if (res && (res as { ok: boolean }).ok) {
                            setLastClosure(data);
                            setExistingClosures(prev => [data, ...prev]);
                          }
                        } catch (e) {
                          console.error('Error al cerrar caja:', e);
                        }
                        setClosing(false);
                      }}
                      disabled={closing}
                      style={{ background: C.brass, color: C.base }}
                      className="w-full text-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {closing ? <>Cerrando...</> : <><Save className="w-5 h-5" /> CERRAR CAJA</>}
                    </button>
                  ) : (
                    <button onClick={() => setCuadraturaOk(true)}
                      style={{ background: C.brass, color: C.base }}
                      className="w-full text-base font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> CONFIRMAR CUADRATURA
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Tab: Por empleado ----------
function EmpleadosTabInformes({ sales, colors: C }: { sales: Sale[]; colors: Theme }) {
  const [period, setPeriod] = useState('dia');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().slice(0, 10));

  const periodSales = period === 'dia'
    ? sales.filter(s => new Date(Number(s.closedAt)).toISOString().slice(0, 10) === dateValue)
    : sales;

  const employeeBreakdown: [string, { total: number; count: number; items: Sale[] }][] = useMemo(() => {
    const map: Record<string, { total: number; count: number; items: Sale[] }> = {};
    periodSales.forEach(s => {
      const emp = s.employeeName || 'Sin asignar';
      if (!map[emp]) map[emp] = { total: 0, count: 0, items: [] };
      map[emp].total += s.total;
      map[emp].count += 1;
      map[emp].items.push(s);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [periodSales]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 no-print">
        <button onClick={() => setPeriod('dia')} style={{ background: period === 'dia' ? C.brass : C.surfaceLight, color: period === 'dia' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Día</button>
        <button onClick={() => setPeriod('mes')} style={{ background: period === 'mes' ? C.brass : C.surfaceLight, color: period === 'mes' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Mes</button>
        {period === 'dia' && (
          <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
        )}
      </div>

      {employeeBreakdown.length === 0 ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Sin datos para mostrar.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {employeeBreakdown.map(([name, data]) => (
            <div key={name} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-lg" style={{ color: C.cream }}>{name}</p>
                <span className="font-mono" style={{ color: C.brassLight }}>{euros(data.total)}</span>
              </div>
              <p style={{ color: C.muted }} className="text-xs mb-3">
                {data.count} transacciones — Ticket medio: {euros(data.total / data.count)}
              </p>
              <div className="text-xs space-y-1">
                {data.items.slice(0, 5).map(s => (
                  <div key={s.id} className="flex justify-between" style={{ color: C.muted }}>
                    <span>{s.tableName}</span>
                    <span className="font-mono">{euros(s.total)}</span>
                  </div>
                ))}
                {data.items.length > 5 && (
                  <p style={{ color: C.muted }}>... y {data.items.length - 5} más</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Tab: Propinas ----------
function PropinasTab({ sales, colors: C }: { sales: Sale[]; colors: Theme }) {
  const [period, setPeriod] = useState('dia');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthValue, setMonthValue] = useState(() => new Date().toISOString().slice(0, 7));

  const periodSales = useMemo(() => {
    if (period === 'dia') return sales.filter(s => new Date(Number(s.closedAt)).toISOString().slice(0, 10) === dateValue);
    return sales.filter(s => new Date(Number(s.closedAt)).toISOString().slice(0, 7) === monthValue);
  }, [sales, period, dateValue, monthValue]);

  const totalTip = periodSales.reduce((s, x) => s + (x.tip || 0), 0);
  const ticketCount = periodSales.length;
  const avgTip = ticketCount ? totalTip / ticketCount : 0;
  const withTip = periodSales.filter(s => (s.tip || 0) > 0).length;

  const byEmployee: [string, { tip: number; count: number; tickets: number }][] = useMemo(() => {
    const map: Record<string, { tip: number; count: number; tickets: number }> = {};
    periodSales.forEach(s => {
      const emp = s.employeeName || 'Sin asignar';
      if (!map[emp]) map[emp] = { tip: 0, count: 0, tickets: 0 };
      map[emp].tip += s.tip || 0;
      if ((s.tip || 0) > 0) map[emp].count += 1;
      map[emp].tickets += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].tip - a[1].tip);
  }, [periodSales]);

  const byMethod: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    periodSales.forEach(s => {
      if ((s.tip || 0) <= 0) return;
      const method = s.tipMethod || s.paymentMethod || 'efectivo';
      map[method] = (map[method] || 0) + (s.tip || 0);
    });
    return map;
  }, [periodSales]);

  function downloadCSV() {
    const rows: (string | number)[][] = [
      ['Fecha', 'Hora', 'Mesa', 'Empleado', 'Total', 'Propina', 'Método propina'] as (string | number)[],
      ...periodSales.filter(s => (s.tip || 0) > 0).map(s => {
        const d = new Date(Number(s.closedAt));
        return [
          d.toLocaleDateString('es-ES'),
          d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          s.tableName, s.employeeName || 'Sin asignar',
          s.total.toFixed(2), (s.tip || 0).toFixed(2),
          s.tipMethod || s.paymentMethod || 'efectivo',
        ] as (string | number)[];
      }),
      [] as (string | number)[],
      ['TOTAL', '', '', '', totalTip.toFixed(2), ''] as (string | number)[],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propinas-${period === 'dia' ? dateValue : monthValue}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const periodLabel = period === 'dia'
    ? new Date(dateValue + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date(monthValue + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        <button onClick={() => setPeriod('dia')} style={{ background: period === 'dia' ? C.brass : C.surfaceLight, color: period === 'dia' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Día</button>
        <button onClick={() => setPeriod('mes')} style={{ background: period === 'mes' ? C.brass : C.surfaceLight, color: period === 'mes' ? C.base : C.muted }} className="text-sm font-medium px-3 py-2 rounded-lg">Mes</button>
        {period === 'dia'
          ? <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
          : <input type="month" value={monthValue} onChange={e => setMonthValue(e.target.value)} style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
        }
        <div className="flex-1" />
        <button onClick={downloadCSV} disabled={totalTip === 0} style={{ background: C.surfaceLight, color: C.cream }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Propinas</p>
          <p className="font-display text-2xl" style={{ color: C.brassLight }}>{euros(totalTip)}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Tickets con propina</p>
          <p className="font-display text-2xl" style={{ color: C.cream }}>{withTip} / {ticketCount}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">Propina media</p>
          <p className="font-display text-2xl" style={{ color: C.cream }}>{euros(avgTip)}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-1">% tickets</p>
          <p className="font-display text-2xl" style={{ color: C.cream }}>
            {ticketCount ? ((withTip / ticketCount) * 100).toFixed(0) : 0}%
          </p>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 mb-5">
        <p style={{ color: C.muted }} className="text-xs uppercase mb-3">Por empleado — {periodLabel}</p>
        <div className="flex flex-col gap-1.5">
          {byEmployee.map(([name, data]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span style={{ color: C.cream }}>{name} <span style={{ color: C.muted }} className="text-xs">({data.count} propinas en {data.tickets} tickets)</span></span>
              <span className="font-mono" style={{ color: C.brassLight }}>{euros(data.tip)}</span>
            </div>
          ))}
          {byEmployee.length === 0 && (
            <p style={{ color: C.muted }} className="text-xs py-2">Sin datos para este período</p>
          )}
        </div>
      </div>

      {Object.keys(byMethod).length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase mb-3">Por método de pago de propina</p>
          <div className="flex flex-col gap-1.5">
            {Object.entries(byMethod).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between text-sm">
                <span style={{ color: C.cream }}>{method}</span>
                <span className="font-mono" style={{ color: C.brassLight }}>{euros(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Tab: Control de caja ----------
function ControlCajaTab({ sales, colors: C }: { sales: Sale[]; colors: Theme }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [cuadraturaCounts, setCuadraturaCounts] = useState<Record<number, string>>(() => DENOMS.reduce((acc, d) => ({ ...acc, [d.value]: '' }), {}));
  const [validated, setValidated] = useState(false);
  const [existingClosures, setExistingClosures] = useState<Closure[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClosures().then(data => setExistingClosures((data as Closure[]) || [])).catch(() => {});
  }, []);

  const todayClosure = existingClosures.find(c => c.date === todayStr);
  const hasClosure = !!todayClosure;

  const todaySales = sales.filter(s => new Date(Number(s.closedAt)).toISOString().slice(0, 10) === todayStr);

  const expectedCash = todaySales.reduce((sum, s) => {
    const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
    return sum + payments.filter(p => p.method === 'efectivo').reduce((a, p) => a + p.amount, 0);
  }, 0);

  const totalCounted = DENOMS.reduce((s, d) => s + (parseFloat(cuadraturaCounts[d.value]) || 0) * d.value, 0);
  const diff = round2(totalCounted - expectedCash);

  if (hasClosure) {
    return <CuadraturaCard closure={todayClosure} colors={C} />;
  }

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-5 max-w-md">
        <p className="font-display text-lg mb-4" style={{ color: C.cream }}>
          <Banknote className="w-5 h-5 inline mr-1.5" />
          Cuadratura de efectivo
        </p>

        <p style={{ color: C.muted }} className="text-sm mb-3">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <hr style={{ borderColor: C.line }} className="my-3" />

        <p className="text-sm font-medium mb-2" style={{ color: C.cream }}>Recuento físico de efectivo</p>
        <div className="text-sm mb-3 flex items-center justify-between" style={{ color: C.muted }}>
          <span>Esperado en caja (ventas efectivo):</span>
          <span className="font-mono" style={{ color: C.cream }}>{euros(expectedCash)}</span>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-3">
          {DENOMS.map(d => (
            <div key={d.value} className="flex flex-col items-center">
              <span className="text-xs mb-1" style={{ color: C.muted }}>{d.label}</span>
              <input type="number" min="0" step="1"
                disabled={validated}
                value={cuadraturaCounts[d.value]}
                onChange={e => setCuadraturaCounts(prev => ({ ...prev, [d.value]: e.target.value }))}
                style={{ background: validated ? C.surface : C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, width: '100%' }}
                className="rounded-lg px-2 py-1.5 text-sm text-center"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm mb-3 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <span style={{ color: C.muted }}>Total contado:</span>
          <span className="font-mono" style={{ color: C.cream }}>{euros(totalCounted)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-4">
          <span style={{ color: C.muted }}>Diferencia:</span>
          <span className="font-mono" style={{ color: Math.abs(diff) < 0.01 ? C.cream : diff > 0 ? C.sageLight : C.wineLight }}>
            {diff >= 0 ? '+' : ''}{euros(Math.abs(diff) < 0.01 ? 0 : diff)}
          </span>
        </div>

        {validated ? (
          <button onClick={async () => {
            setSaving(true);
            try {
              const methodTotals = PAYMENT_METHODS.map(m => ({
                method: m.id, label: m.label,
                total: todaySales.reduce((sum, s) => {
                  const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
                  return sum + payments.filter(p => p.method === m.id).reduce((a, p) => a + p.amount, 0);
                }, 0),
              }));
              const total = todaySales.reduce((s, x) => s + x.total, 0);
              const cuadDenoms = DENOMS.map(d => ({
                value: d.value, label: d.label,
                count: parseInt(cuadraturaCounts[d.value]) || 0,
                subtotal: ((parseInt(cuadraturaCounts[d.value]) || 0) * d.value),
              }));
              const data: Closure = {
                id: `closure_${todayStr}`, date: todayStr, total,
                ticket_count: todaySales.length,
                avg_ticket: round2(todaySales.length ? total / todaySales.length : 0),
                methods: methodTotals, employees: [],
                sales_ids: todaySales.map(s => s.id),
                closed_at: Date.now(), employee_name: 'Admin',
                cuadratura: cuadDenoms, cuadratura_expected: expectedCash,
                cuadratura_counted: totalCounted, cuadratura_diff: diff,
              };
              const res = await saveClosure(data as unknown as Record<string, unknown>);
              if (res && (res as { ok: boolean }).ok) {
                setExistingClosures(prev => [data, ...prev]);
              }
            } catch (e) {
              console.error('Error al guardar validación:', e);
            }
            setSaving(false);
          }} disabled={saving}
            style={{ background: C.brass, color: C.base }}
            className="w-full text-base font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? 'Guardando...' : <><Save className="w-5 h-5" /> FINALIZAR CIERRE DE CAJA</>}
          </button>
        ) : (
          <button onClick={() => setValidated(true)}
            style={{ background: C.brass, color: C.base }}
            className="w-full text-base font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5" /> VALIDAR CUADRATURA
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Tab: Registros de acceso ----------
const ENTRY_LABELS: Record<string, string> = {
  entrada:  'Entrada',
  almacen:  'Almacen',
  caja:     'Caja',
  config:   'Configuracion',
};

function AccesosTab({ colors: C }: { colors: Theme }) {
  const [logs, setLogs] = useState<AccessLogRow[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    fetchAccessLogs(pageSize, page * pageSize)
      .then((data: unknown) => {
        const d = data as { rows: AccessLogRow[]; total: number };
        setLogs(d.rows ?? (data as AccessLogRow[]));
        setTotalLogs(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const filtered = dateFilter && dateFilter.length > 0
    ? logs.filter(l => new Date(Number(l.loggedAt)).toISOString().slice(0, 10) === dateFilter)
    : logs;

  const totalPages = Math.ceil(totalLogs / pageSize);

  function downloadCSV() {
    const rows: (string | number)[][] = [
      ['Fecha', 'Hora', 'Empleado', 'Rol', 'Punto de entrada'],
      ...filtered.map(l => {
        const d = new Date(Number(l.loggedAt));
        return [
          d.toLocaleDateString('es-ES'),
          d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          l.employeeName, l.role,
          ENTRY_LABELS[l.entryPoint] ?? l.entryPoint,
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accesos-${dateFilter || 'todos'}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <LogIn className="w-4 h-4" style={{ color: C.muted }} />
        <h3 className="font-display text-lg" style={{ color: C.cream }}>REGISTROS DE ACCESO</h3>
        <div className="flex-1" />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} style={{ color: C.muted }} className="text-sm hover:opacity-80">Limpiar</button>
        )}
        <button onClick={downloadCSV} disabled={filtered.length === 0}
          style={{ background: C.surfaceLight, color: C.cream }} className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {!dateFilter && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {['entrada','almacen','caja','config'].map(ep => {
            const today = new Date().toDateString();
            const count = logs.filter(l => l.entryPoint === ep && new Date(Number(l.loggedAt)).toDateString() === today).length;
            return (
              <div key={ep} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-3 text-center">
                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">{ENTRY_LABELS[ep]}</p>
                <p className="font-display text-2xl" style={{ color: C.brassLight }}>{count}</p>
                <p style={{ color: C.muted }} className="text-xs">hoy</p>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Sin registros para mostrar.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map(l => {
            const d = new Date(Number(l.loggedAt));
            return (
              <div key={l.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-lg px-4 py-2.5 flex items-center gap-3">
                <div style={{ background: C.surfaceLight }} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                  {l.role === 'admin'
                    ? <ShieldCheck className="w-4 h-4" style={{ color: C.brassLight }} />
                    : <User className="w-4 h-4" style={{ color: C.muted }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.employeeName}</p>
                  <p style={{ color: C.muted }} className="text-xs">{ENTRY_LABELS[l.entryPoint] ?? l.entryPoint}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs" style={{ color: C.cream }}>
                    {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p style={{ color: C.muted }} className="text-xs">
                    {d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && !dateFilter && (
        <div className="flex items-center justify-center gap-2 mt-4 no-print">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ background: C.surfaceLight, color: C.muted }} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 hover:opacity-80">
            ← Anterior
          </button>
          <span style={{ color: C.muted }} className="text-xs">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ background: C.surfaceLight, color: C.muted }} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 hover:opacity-80">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Tab: Respaldo ----------
function RespaldoTab({ colors: C }: { colors: Theme }) {
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState<{ exportedAt?: number; stats?: Record<string, number> } | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  async function fetchBackupData() {
    const data = await fetchBackup() as { exportedAt?: number; stats?: Record<string, number>; data?: Record<string, unknown> };
    setBackupResult(data);
    return data;
  }

  async function handleBackup() {
    setBackupLoading(true);
    setBackupResult(null);
    setBackupError(null);
    try {
      const data = await fetchBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `respaldo-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setBackupError((err as Error).message || 'Error al realizar el respaldo');
    } finally {
      setBackupLoading(false);
    }
  }

  async function handlePDF() {
    setBackupLoading(true);
    setBackupError(null);
    try {
      const data = await fetchBackupData();
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const jsPDF = JsPDF as unknown as new (opts: { orientation: string; unit: string; format: string }) => unknown;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as unknown as {
        getCurrentPageInfo: () => { pageNumber: number };
        setFontSize: (s: number) => void;
        setTextColor: (r: number, g: number, b: number) => void;
        text: (t: string, x: number, y: number, opts?: { align?: string }) => void;
        line: (x1: number, y1: number, x2: number, y2: number) => void;
        addPage: () => void;
        save: (name: string) => void;
      };

      let page = 1;
      function header(title: string) {
        if (doc.getCurrentPageInfo().pageNumber > page) {
          page = doc.getCurrentPageInfo().pageNumber;
        }
        doc.setFontSize(16);
        doc.setTextColor(200, 169, 110);
        doc.text(title, 14, 20);
        doc.setFontSize(8);
        doc.setTextColor(140, 130, 120);
        doc.text(`La Comanda — ${new Date().toLocaleDateString('es-ES')}`, 196, 20, { align: 'right' });
        doc.line(14, 24, 196, 24);
      }

      function addTable(title: string, cols: { key: string; label: string }[], rows: Record<string, unknown>[]) {
        if (rows.length === 0) return;
        doc.addPage();
        header(title);
        autoTable(doc, {
          startY: 30,
          head: [cols.map(c => c.label)],
          body: rows.map(r => cols.map(c => {
            const v = r[c.key];
            if (v === null || v === undefined) return '';
            if (typeof v === 'object') return JSON.stringify(v).slice(0, 80);
            return String(v);
          })),
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [122, 139, 106] as unknown as number[], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [240, 238, 235] as unknown as number[] },
        } as unknown as Record<string, unknown>);
      }

      const d = (data.data || {}) as Record<string, unknown>;

      doc.setFontSize(20);
      doc.setTextColor(200, 169, 110);
      doc.text('RESPALDO DE DATOS', 105, 30, { align: 'center' });
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`La Comanda — ${new Date(data.exportedAt!).toLocaleString('es-ES')}`, 105, 40, { align: 'center' });
      doc.setFontSize(10);
      let yy = 55;
      const stats = data.stats || {};
      const LABELS: Record<string, string> = {
        categories: 'Categorías', products: 'Productos', productStock: 'Stock por ubicación',
        tables: 'Mesas', orders: 'Pedidos abiertos', sales: 'Ventas',
        employees: 'Empleados', accessLogs: 'Accesos', stockLog: 'Mov. stock',
        cancelledOrders: 'Pedidos cancelados', offers: 'Ofertas', settings: 'Configuración',
        modifiers: 'Modificadores', deliveryRunners: 'Repartidores',
        deliveryOrders: 'Pedidos domicilio', deliveryTracking: 'Tracking',
      };
      for (const [key, label] of Object.entries(LABELS)) {
        doc.text(`${label}: ${stats[key as keyof typeof stats] || 0}`, 20, yy);
        yy += 7;
      }

      addTable('Productos',
        [{key:'id',label:'ID'},{key:'name',label:'Nombre'},{key:'category',label:'Categoría'},{key:'price',label:'Precio'},{key:'ubicacion',label:'Ubic.'},{key:'course',label:'Curso'}],
        (d.products || []) as Record<string, unknown>[]);
      addTable('Stock por ubicación',
        [{key:'product_id',label:'Producto'},{key:'location',label:'Ubic.'},{key:'stock',label:'Stock'},{key:'low_stock',label:'Mínimo'}],
        (d.productStock || []) as Record<string, unknown>[]);
      addTable('Categorías',
        [{key:'name',label:'Nombre'}],
        ((d.categories || []) as ({ name: string } | string)[]).map(c => ({ name: typeof c === 'string' ? c : c.name })));
      addTable('Mesas',
        [{key:'id',label:'ID'},{key:'name',label:'Nombre'},{key:'status',label:'Estado'},{key:'type',label:'Tipo'}],
        (d.tables || []) as Record<string, unknown>[]);
      addTable('Ventas',
        [{key:'id',label:'ID'},{key:'table_name',label:'Mesa'},{key:'total',label:'Total'},{key:'payment_method',label:'Método'},{key:'closed_at',label:'Fecha'}],
        ((d.sales || []) as Record<string, unknown>[]).map(s => ({ ...s, closed_at: s.closed_at ? new Date(Number(s.closed_at)).toLocaleDateString('es-ES') : '' })));
      addTable('Empleados',
        [{key:'id',label:'ID'},{key:'name',label:'Nombre'},{key:'role',label:'Rol'}],
        (d.employees || []) as Record<string, unknown>[]);
      addTable('Ofertas',
        [{key:'id',label:'ID'},{key:'name',label:'Nombre'},{key:'discount_pct',label:'Dto%'},{key:'active',label:'Activa'}],
        ((d.offers || []) as Record<string, unknown>[]).map(o => ({ ...o, active: (o.active as boolean) ? 'Sí' : 'No' })));
      addTable('Repartidores',
        [{key:'name',label:'Nombre'},{key:'phone',label:'Tel.'},{key:'active',label:'Activo'}],
        ((d.deliveryRunners || []) as Record<string, unknown>[]).map(r => ({ ...r, active: (r.active as boolean) ? 'Sí' : 'No' })));

      doc.save(`respaldo-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      setBackupError((err as Error).message || 'Error al generar PDF');
    } finally {
      setBackupLoading(false);
    }
  }

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-5 max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <Save className="w-5 h-5" style={{ color: C.brassLight }} />
          <h3 className="font-display text-xl" style={{ color: C.cream }}>RESPALDO DE DATOS</h3>
        </div>
        <p style={{ color: C.muted }} className="text-sm mb-4">
          Descarga una copia completa de todos los datos del sistema.
        </p>
        <div className="flex gap-3">
          <button onClick={handleBackup} disabled={backupLoading}
            style={{ background: C.brass, color: C.base }}
            className="rounded-lg px-4 py-3 text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
            <Download className="w-4 h-4" /> {backupLoading ? 'Generando...' : 'JSON'}
          </button>
          <button onClick={handlePDF} disabled={backupLoading}
            style={{ background: C.sage, color: '#fff' }}
            className="rounded-lg px-4 py-3 text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
            <Download className="w-4 h-4" /> {backupLoading ? 'Generando...' : 'PDF'}
          </button>
        </div>
        {backupError && <p className="text-sm mt-3" style={{ color: C.wineLight }}>{backupError}</p>}
      </div>

      {backupResult && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-5 max-w-lg mt-4">
          <p className="text-sm font-medium mb-2" style={{ color: C.sage }}>Respaldo generado ✓</p>
          <div className="text-xs space-y-1" style={{ color: C.muted }}>
            {backupResult.exportedAt && <p>Exportado: {new Date(backupResult.exportedAt).toLocaleString('es-ES')}</p>}
            {backupResult.stats && Object.entries(backupResult.stats).map(([key, val]) => (
              <p key={key}>{key}: {val}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Tab: Log de stock ----------
function StockLogTab({ colors: C }: { colors: Theme }) {
  const [logs, setLogs] = useState<StockLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockLog(200)
      .then(data => setLogs(Array.isArray(data) ? data as StockLogRow[] : (data as { rows: StockLogRow[] }).rows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3 className="font-display text-lg mb-4" style={{ color: C.cream }}>MOVIMIENTOS DE STOCK</h3>
      {loading ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Cargando...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Sin movimientos registrados.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {logs.map(log => {
            const d = new Date(Number(log.created_at ?? log.createdAt));
            const isSale = log.reason === 'venta';
            return (
              <div key={log.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-lg px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{log.product_name ?? log.productName}</p>
                  <p style={{ color: C.muted }} className="text-xs">{log.reason} · {d.toLocaleString('es-ES')}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-sm" style={{ color: isSale ? C.wineLight : C.sageLight }}>
                    {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                  </span>
                  <p style={{ color: C.muted }} className="text-xs">{log.old_stock} → {log.new_stock}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Tab: Turnos de empleado ----------
function TurnsTab({ colors: C }: { colors: Theme }) {
  const [turns, setTurns] = useState<TurnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetchTurns('', dateFilter)
      .then(data => setTurns(Array.isArray(data) ? data as TurnRow[] : (data as { rows: TurnRow[] }).rows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dateFilter]);

  const byEmployee: Record<string, TurnRow[]> = {};
  turns.forEach(t => {
    const name = t.employee_name ?? t.employeeName ?? '';
    if (!byEmployee[name]) byEmployee[name] = [];
    byEmployee[name].push(t);
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-display text-lg" style={{ color: C.cream }}>TURNOS DE EMPLEADOS</h3>
        <div className="flex-1" />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="rounded-lg px-3 py-2 text-sm" />
      </div>
      {loading ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Cargando...</p>
      ) : Object.keys(byEmployee).length === 0 ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Sin registros para esta fecha.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(byEmployee).map(([name, entries]) => {
            const entrada = entries.find(t => (t.action ?? t.action) === 'entrada');
            const salida = entries.find(t => (t.action ?? t.action) === 'salida');
            const entradaTime = entrada ? new Date(Number(entrada.time ?? entrada.time)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—';
            const salidaTime = salida ? new Date(Number(salida.time ?? salida.time)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—';
            return (
              <div key={name} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg" style={{ color: C.cream }}>{name}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p style={{ color: C.muted }} className="text-xs">Entrada</p>
                      <p className="font-mono" style={{ color: C.sageLight }}>{entradaTime}</p>
                    </div>
                    <div className="text-center">
                      <p style={{ color: C.muted }} className="text-xs">Salida</p>
                      <p className="font-mono" style={{ color: C.wineLight }}>{salidaTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Tab: Cierres guardados ----------
function CierresGuardadosTab({ colors: C }: { colors: Theme }) {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchClosures()
      .then(data => setClosures(Array.isArray(data) ? data as Closure[] : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: C.muted }} className="text-sm text-center py-6">Cargando...</p>;
  }

  if (closures.length === 0) {
    return (
      <div className="text-center py-12">
        <Banknote className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
        <p style={{ color: C.muted }} className="text-sm">No hay cierres de caja registrados.</p>
      </div>
    );
  }

  const sorted = [...closures].sort((a, b) => (b.closed_at || 0) - (a.closed_at || 0));

  return (
    <div className="max-w-2xl space-y-3">
      {sorted.map(c => {
        const d = new Date(Number(c.closed_at));
        const dateLabel = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const timeLabel = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const open = expanded === c.id;
        return (
          <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.brass}` }} className="rounded-xl">
            <div className="p-4 cursor-pointer" onClick={() => setExpanded(open ? null : c.id)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-base" style={{ color: C.brassLight }}>
                    <ShieldCheck className="w-4 h-4 inline mr-1.5" />
                    {dateLabel}
                  </p>
                  <p style={{ color: C.muted }} className="text-xs mt-1">
                    Cerrado a las {timeLabel} por {c.employee_name || 'Admin'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg" style={{ color: C.cream }}>{euros(c.total)}</p>
                  <p style={{ color: C.muted }} className="text-xs">{c.ticket_count} tickets</p>
                </div>
              </div>
            </div>
            {open && (
              <div className="px-4 pb-4 pt-0">
                <hr style={{ borderColor: C.line }} className="mb-3" />

                <button onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('¿Eliminar este cierre?')) return;
                  try {
                    await fetch('/api/closures', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'delete', id: c.id }),
                    });
                    setClosures(prev => prev.filter(x => x.id !== c.id));
                  } catch (err) {
                    console.error('Error al eliminar cierre:', err);
                  }
                }}
                  style={{ color: C.wineLight }}
                  className="text-xs underline mb-3 block"
                >
                  Eliminar cierre
                </button>

                <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Ticket medio</p>
                <p className="font-mono text-sm mb-3" style={{ color: C.cream }}>{euros(c.avg_ticket)}</p>

                {c.methods && c.methods.length > 0 && (
                  <>
                    <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Por método</p>
                    <div className="flex flex-col gap-1 mb-3">
                      {c.methods!.map(m => (
                        <div key={m.method} className="flex justify-between text-sm">
                          <span style={{ color: C.muted }}>{m.label || m.method}</span>
                          <span className="font-mono" style={{ color: C.brassLight }}>{euros(m.total)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {c.employees && c.employees.length > 0 && (
                  <>
                    <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Por empleado</p>
                    <div className="flex flex-col gap-1 mb-3">
                      {c.employees!.map(e => (
                        <div key={e.name} className="flex justify-between text-sm">
                          <span style={{ color: C.muted }}>{e.name} <span className="text-xs">({e.count} tickets)</span></span>
                          <span className="font-mono" style={{ color: C.brassLight }}>{euros(e.total)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {c.cuadratura && (() => {
                  const raw = c.cuadratura;
                  const denoms = Array.isArray(raw) ? raw : (raw?.denoms || []);
                  const expected = !Array.isArray(raw) && raw ? raw.expected : (Array.isArray(raw) ? raw.reduce((s, d) => s + (d.subtotal || 0), 0) : 0);
                  const counted = !Array.isArray(raw) && raw ? raw.counted : (Array.isArray(raw) ? raw.reduce((s, d) => s + (d.subtotal || 0), 0) : 0);
                  const diff = (!Array.isArray(raw) && raw ? raw.diff : 0) ?? 0;
                  return (
                    <>
                      <hr style={{ borderColor: C.line }} className="mb-3" />
                      <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Cuadratura</p>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <div><span style={{ color: C.muted }}>Esperado: </span><span className="font-mono" style={{ color: C.cream }}>{euros(expected)}</span></div>
                        <div><span style={{ color: C.muted }}>Contado: </span><span className="font-mono" style={{ color: C.cream }}>{euros(counted)}</span></div>
                        <div>
                          <span style={{ color: C.muted }}>Diferencia: </span>
                          <span className="font-mono" style={{ color: Math.abs(diff) < 0.01 ? C.cream : diff > 0 ? C.sageLight : C.wineLight }}>
                            {diff >= 0 ? '+' : ''}{euros(Math.abs(diff) < 0.01 ? 0 : diff)}
                          </span>
                        </div>
                      </div>
                      {denoms.filter((d: DenomItem) => d.count && d.count > 0).length > 0 && (
                        <div className="grid grid-cols-5 gap-1 text-xs">
                          {denoms.filter((d: DenomItem) => d.count && d.count > 0).map((d: DenomItem) => (
                            <div key={d.value} className="flex justify-between" style={{ color: C.muted }}>
                              <span>{d.label}:</span>
                              <span className="font-mono" style={{ color: C.cream }}>{d.count}×</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
