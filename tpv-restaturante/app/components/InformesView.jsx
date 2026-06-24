"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import {
  BarChart3, Banknote, CreditCard, Smartphone, Clock, Download, Printer, LogIn, ShieldCheck, User,
} from 'lucide-react';
import { euros, round2 } from './constants';
import { fetchAccessLogs } from '../../lib/api';
import VerifactuPanel from './VerifactuPanel';

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'tarjeta',  label: 'Tarjeta',  icon: CreditCard },
  { id: 'bizum',    label: 'Bizum',    icon: Smartphone },
  { id: 'fiado',    label: 'Fiado',    icon: Clock },
];

// ---------- Vista contenedor ----------
export default function InformesView({ sales, employees, colors: C }) {
  const [tab, setTab] = useState('resumen');

  const tabs = [
    { id: 'resumen',   label: 'Resumen' },
    { id: 'cierre',    label: 'Cierre de caja' },
    { id: 'empleados', label: 'Por empleado' },
    { id: 'control',   label: 'Control de caja' },
    { id: 'accesos',   label: 'Accesos' },
    { id: 'verifactu', label: 'Verifactu' },
  ];

  if (sales.length === 0 && tab !== 'accesos' && tab !== 'verifactu') {
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

      {tab === 'resumen'   && <ResumenTab   sales={sales} colors={C} />}
      {tab === 'cierre'    && <CierreCajaTab sales={sales} colors={C} />}
      {tab === 'empleados' && <EmpleadosTabInformes sales={sales} colors={C} />}
      {tab === 'control'   && <ControlCajaTab sales={sales} colors={C} />}
      {tab === 'accesos'   && <AccesosTab colors={C} />}
      {tab === 'verifactu' && <VerifactuPanel colors={C} sales={sales} />}
    </div>
  );
}

// ---------- Tab: Resumen ----------
function ResumenTab({ sales, colors: C }) {
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.closedAt).toDateString() === today);
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
        .filter(s => new Date(s.closedAt).toDateString() === d.toDateString())
        .reduce((s, x) => s + x.total, 0);
      return { day: key, total: Math.round(total * 100) / 100 };
    });
  }, [sales]);

  const topProducts = useMemo(() => {
    const map = {};
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
          {PAYMENT_METHODS.map(m => {
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
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Ventas — últimos 7 días</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={last7}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="day" stroke={C.muted} fontSize={12} />
              <YAxis stroke={C.muted} fontSize={12} />
              <Tooltip
                contentStyle={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                formatter={v => [euros(v), 'Total']}
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

// ---------- Tab: Cierre de caja ----------
function CierreCajaTab({ sales, colors: C }) {
  const [period, setPeriod] = useState('dia');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthValue, setMonthValue] = useState(() => new Date().toISOString().slice(0, 7));

  const periodSales = useMemo(() => {
    if (period === 'dia') return sales.filter(s => new Date(s.closedAt).toISOString().slice(0, 10) === dateValue);
    return sales.filter(s => new Date(s.closedAt).toISOString().slice(0, 7) === monthValue);
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

  const employeeTotals = useMemo(() => {
    const map = {};
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
    const rows = [
      ['Fecha', 'Hora', 'Mesa', 'Empleado', 'Total €', 'Métodos de pago'],
      ...periodSales.map(s => {
        const d = new Date(s.closedAt);
        const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
        const metodos = payments
          .map(p => `${PAYMENT_METHODS.find(m => m.id === p.method)?.label || p.method} ${p.amount.toFixed(2)}€`)
          .join(' + ');
        return [
          d.toLocaleDateString('es-ES'),
          d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          s.tableName, s.employeeName || 'Sin asignar', s.total.toFixed(2), metodos,
        ];
      }),
      [],
      ['TOTAL', '', '', '', total.toFixed(2), ''],
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cierre-${period === 'dia' ? dateValue : monthValue}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Tab: Por empleado ----------
function EmpleadosTabInformes({ sales, colors: C }) {
  const [period, setPeriod] = useState('dia');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().slice(0, 10));

  const periodSales = period === 'dia'
    ? sales.filter(s => new Date(s.closedAt).toISOString().slice(0, 10) === dateValue)
    : sales;

  const employeeBreakdown = useMemo(() => {
    const map = {};
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

// ---------- Tab: Control de caja ----------
function ControlCajaTab({ sales, colors: C }) {
  const [realCount, setRealCount] = useState('0');

  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.closedAt).toDateString() === today);

  const expectedCash = todaySales.reduce((sum, s) => {
    const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
    return sum + payments.filter(p => p.method === 'efectivo').reduce((a, p) => a + p.amount, 0);
  }, 0);

  const realCountNum = parseFloat(realCount) || 0;
  const difference = round2(realCountNum - expectedCash);
  const differenceColor = Math.abs(difference) < 0.005 ? C.sage : difference > 0 ? C.sageLight : C.wineLight;

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-5 max-w-md">
        <p className="font-display text-lg mb-4" style={{ color: C.cream }}>Cuadratura de efectivo</p>
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Esperado (según sistema)</p>
            <p className="font-display text-2xl" style={{ color: C.brassLight }}>{euros(expectedCash)}</p>
          </div>
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Efectivo real en caja</p>
            <input
              type="number" step="0.01" value={realCount}
              onChange={e => setRealCount(e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-3 text-xl font-mono font-bold text-center"
              placeholder="0.00"
            />
          </div>
          <div>
            <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Diferencia</p>
            <p className="font-display text-2xl" style={{ color: differenceColor }}>
              {difference > 0 ? '+' : ''}{euros(difference)}
            </p>
            {Math.abs(difference) < 0.005 && <p style={{ color: C.sage }} className="text-xs mt-1">✓ Cuadra perfectamente</p>}
            {difference > 0.01  && <p style={{ color: C.sageLight }} className="text-xs mt-1">Sobrante de {euros(difference)}</p>}
            {difference < -0.01 && <p style={{ color: C.wineLight }} className="text-xs mt-1">Faltante de {euros(Math.abs(difference))}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Tab: Registros de acceso ----------
const ENTRY_LABELS = {
  entrada:  'Entrada',
  almacen:  'Almacen',
  caja:     'Caja',
  config:   'Configuracion',
};

function AccesosTab({ colors: C }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchAccessLogs(300)
      .then(data => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = dateFilter
    ? logs.filter(l => new Date(Number(l.loggedAt)).toISOString().slice(0, 10) === dateFilter)
    : logs;

  function downloadCSV() {
    const rows = [
      ['Fecha', 'Hora', 'Empleado', 'Rol', 'Punto de entrada'],
      ...filtered.map(l => {
        const d = new Date(Number(l.loggedAt));
        return [
          d.toLocaleDateString('es-ES'),
          d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          l.employeeName,
          l.role,
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
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <LogIn className="w-4 h-4" style={{ color: C.muted }} />
        <h3 className="font-display text-lg" style={{ color: C.cream }}>REGISTROS DE ACCESO</h3>
        <div className="flex-1" />
        <input
          type="date" value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} style={{ color: C.muted }} className="text-sm hover:opacity-80">
            Limpiar
          </button>
        )}
        <button
          onClick={downloadCSV}
          disabled={filtered.length === 0}
          style={{ background: C.surfaceLight, color: C.cream }}
          className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
        >
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {/* Resumen del dia */}
      {!dateFilter && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {['entrada','almacen','caja','config'].map(ep => {
            const today = new Date().toDateString();
            const count = logs.filter(l =>
              l.entryPoint === ep && new Date(Number(l.loggedAt)).toDateString() === today
            ).length;
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

      {/* Lista */}
      {loading ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-6">Sin registros para mostrar.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map(l => {
            const d = new Date(Number(l.loggedAt));
            return (
              <div
                key={l.id}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="rounded-lg px-4 py-2.5 flex items-center gap-3"
              >
                <div
                  style={{ background: C.surfaceLight }}
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                >
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
    </div>
  );
}
