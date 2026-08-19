'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line, Legend } from '@/modules/reports/charts-lazy'
import { Euro, TrendingUp, Ticket, Clock, Banknote, CreditCard, Smartphone, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { euros, round2, type Theme } from '@/components/constants'
import { useSales, useUi } from '@/modules/core/app-contexts'
import {
  comparePeriod, previousWeekComparison, hourlySales, topProducts, paymentMethodTotals,
} from '@tpv/core'

interface DashboardSale {
  id: string
  total: number
  closedAt: number
  items: { name: string; qty: number }[]
  paymentMethod: string
  payments?: { method: string; amount: number }[]
  employeeName?: string
  tableName?: string
  tip?: number
}

export interface VentasDashboardViewProps {
  sales: DashboardSale[]
  colors: Theme
}

function Delta({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) {
    return <span className="text-[10px] opacity-60">{label}</span>
  }
  const positive = pct >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${positive ? 'text-green-500' : 'text-red-400'}`}>
      <Icon className="w-3 h-3" />
      {positive ? '+' : ''}{round2(pct)}% <span className="opacity-60">{label}</span>
    </span>
  )
}

export default function VentasDashboardView() {
  const { sales } = useSales()
  const { colors: C } = useUi()
  const [rangeDays, setRangeDays] = useState(7)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()
  const yesterdayStart = todayTs - 86400000
  const weekStart = todayTs - 6 * 86400000

  const todaySales = useMemo(() => sales.filter(s => s.closedAt >= todayTs), [sales, todayTs])
  const yesterdaySales = useMemo(() => sales.filter(s => s.closedAt >= yesterdayStart && s.closedAt < todayTs), [sales, yesterdayStart, todayTs])
  const weekSales = useMemo(() => sales.filter(s => s.closedAt >= weekStart), [sales, weekStart])

  const todayTotal = round2(todaySales.reduce((sum, s) => sum + s.total, 0))
  const yesterdayTotal = round2(yesterdaySales.reduce((sum, s) => sum + s.total, 0))
  const weekTotal = round2(weekSales.reduce((sum, s) => sum + s.total, 0))
  const todayCount = todaySales.length
  const avgTicket = todayCount > 0 ? round2(todayTotal / todayCount) : 0

  const todayVsYesterday = useMemo(
    () => comparePeriod(sales as any[], todayTs, todayTs + 86400000),
    [sales, todayTs],
  )
  const weekVsPrev = useMemo(
    () => comparePeriod(sales as any[], todayTs - 6 * 86400000, todayTs + 86400000),
    [sales, todayTs],
  )

  const dailyData = useMemo(
    () => previousWeekComparison(sales as any[], todayTs).points,
    [sales, todayTs],
  )

  const hourly = useMemo(
    () => hourlySales(sales as any[], todayTs),
    [sales, todayTs],
  )

  const top = useMemo(
    () => topProducts(sales as any[], todayTs - (rangeDays - 1) * 86400000, todayTs + 86400000, 5),
    [sales, todayTs, rangeDays],
  )

  const methodTotals = useMemo(
    () => paymentMethodTotals(sales as any[], todayTs - (rangeDays - 1) * 86400000, todayTs + 86400000),
    [sales, todayTs, rangeDays],
  )

  const methodLabels: Record<string, string> = {
    efectivo: 'Efectivo', tarjeta: 'Tarjeta', bizum: 'Bizum', fiado: 'Fiado',
  }
  const methodIcons: Record<string, any> = {
    efectivo: Banknote, tarjeta: CreditCard, bizum: Smartphone,
  }

  const recentSales = useMemo(() => {
    return [...todaySales].sort((a, b) => b.closedAt - a.closedAt).slice(0, 10)
  }, [todaySales])

  function KpiCard({ icon: Icon, label, value, sub, color, extra }: { icon: any; label: string; value: string; sub?: string; color: string; extra?: React.ReactNode }) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.line}` }}
        className="rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: C.muted }}>{label}</p>
          <p className="text-lg font-bold" style={{ color: C.cream }}>{value}</p>
          {sub && <p className="text-[10px]" style={{ color: C.muted }}>{sub}</p>}
          {extra}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl" style={{ color: C.cream }}>Dashboard de Ventas</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Euro} label="Hoy" value={`${euros(todayTotal)}`} sub={`${todayCount} tickets`} color={C.sage} extra={<Delta pct={todayVsYesterday.deltaPct} label="vs ayer" />} />
        <KpiCard icon={Clock} label="Ayer" value={`${euros(yesterdayTotal)}`} sub={`${yesterdaySales.length} tickets`} color={C.brass} />
        <KpiCard icon={TrendingUp} label="Últimos 7 días" value={`${euros(weekTotal)}`} sub={`${weekSales.length} tickets`} color={C.brassLight} extra={<Delta pct={weekVsPrev.deltaPct} label="vs semana anterior" />} />
        <KpiCard icon={Ticket} label="Ticket medio" value={`${euros(avgTicket)}`} sub="hoy" color={C.sageLight} />
      </div>

      {/* Filtro de rango para top/metodos */}
      <div className="flex items-center gap-2 no-print">
        <span className="text-xs" style={{ color: C.muted }}>Rango top productos y métodos:</span>
        {[7, 30].map(d => (
          <button key={d} onClick={() => setRangeDays(d)}
            style={{ background: rangeDays === d ? C.brass : C.surfaceLight, color: rangeDays === d ? C.base : C.muted }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg">
            {d} días
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-day chart con comparativa semana anterior */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Últimos 7 días (vs semana anterior)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="day" stroke={C.muted} fontSize={12} />
              <YAxis stroke={C.muted} fontSize={12} />
              <Tooltip
                contentStyle={{ background: C.surfaceLight, border: `1px solid ${C.line}`, borderRadius: '8px', color: C.cream }}
                formatter={(v: any) => euros(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
              <Bar dataKey="total" name="Esta semana" fill={C.brass} radius={[4, 4, 0, 0]} />
              <Bar dataKey="previous" name="Semana anterior" fill={C.surfaceLight} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly chart */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Ventas por hora (hoy)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourly}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="hour" stroke={C.muted} fontSize={11} />
              <YAxis stroke={C.muted} fontSize={11} />
              <Tooltip
                contentStyle={{ background: C.surfaceLight, border: `1px solid ${C.line}`, borderRadius: '8px', color: C.cream }}
                formatter={(v: any) => euros(Number(v))} />
              <Line type="monotone" dataKey="total" stroke={C.sage} strokeWidth={2} dot={{ r: 3, fill: C.sage }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top products */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Top 5 productos (últimos {rangeDays} días)</h3>
          {top.length === 0 ? (
            <p className="text-xs" style={{ color: C.muted }}>Sin ventas en el rango</p>
          ) : (
            <div className="space-y-2">
              {top.map(({ name, qty }, i) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: C.brass + '30', color: C.brassLight }}>{i + 1}</span>
                  <span className="text-xs flex-1 truncate" style={{ color: C.cream }}>{name}</span>
                  <span className="text-xs font-medium" style={{ color: C.sage }}>×{qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Métodos de pago (últimos {rangeDays} días)</h3>
          {methodTotals.length === 0 ? (
            <p className="text-xs" style={{ color: C.muted }}>Sin ventas en el rango</p>
          ) : (
            <div className="space-y-2">
              {methodTotals.map(({ method, total }) => {
                const Icon = methodIcons[method]
                const pct = todayTotal > 0 ? round2((total / todayTotal) * 100) : 0
                return (
                  <div key={method} className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" style={{ color: C.muted }} />}
                    <span className="text-xs flex-1" style={{ color: C.cream }}>{methodLabels[method] || method}</span>
                    <span className="text-xs font-medium" style={{ color: C.cream }}>{euros(total)}</span>
                    <span className="text-[10px]" style={{ color: C.muted }}>{pct}%</span>
                    <div className="w-16 h-1.5 rounded-full" style={{ background: C.surfaceLight }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.brass }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Últimas ventas</h3>
          {recentSales.length === 0 ? (
            <p className="text-xs" style={{ color: C.muted }}>Sin ventas hoy</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {recentSales.map(s => (
                <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0"
                  style={{ borderColor: C.line }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: C.cream }}>
                      {s.tableName || '—'}
                    </p>
                    <p className="text-[9px]" style={{ color: C.muted }}>
                      {new Date(s.closedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      {s.employeeName ? ` · ${s.employeeName}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-medium shrink-0 ml-2" style={{ color: C.cream }}>{euros(s.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
