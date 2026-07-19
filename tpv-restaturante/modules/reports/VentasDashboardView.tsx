'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line } from 'recharts'
import { Euro, TrendingUp, Ticket, Clock, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { euros, round2, type Theme } from '@/components/constants'

interface DashboardSale {
  id: string
  total: number
  closedAt: number
  items: { name: string; qty: number }[]
  paymentMethod: string
  employeeName?: string
  tableName?: string
  tip?: number
}

interface VentasDashboardViewProps {
  sales: DashboardSale[]
  colors: Theme
}

export default function VentasDashboardView({ sales, colors: C }: VentasDashboardViewProps) {
  const now = Date.now()
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

  const dailyData = useMemo(() => {
    const days: { day: string; total: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 86400000)
      const dayKey = d.toLocaleDateString('es-ES', { weekday: 'short' })
      const dayTotal = sales
        .filter(s => s.closedAt >= d.getTime() && s.closedAt < d.getTime() + 86400000)
        .reduce((sum, s) => sum + s.total, 0)
      days.push({ day: dayKey, total: round2(dayTotal) })
    }
    return days
  }, [sales, todayStart])

  const hourlyData = useMemo(() => {
    const hours: { hour: string; total: number; tickets: number }[] = []
    for (let h = 0; h < 24; h++) {
      const hStart = todayTs + h * 3600000
      const hEnd = hStart + 3600000
      const hSales = todaySales.filter(s => s.closedAt >= hStart && s.closedAt < hEnd)
      hours.push({
        hour: `${h.toString().padStart(2, '0')}h`,
        total: round2(hSales.reduce((sum, s) => sum + s.total, 0)),
        tickets: hSales.length,
      })
    }
    return hours.filter(h => h.tickets > 0 || h.total > 0)
  }, [todaySales, todayTs])

  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {}
    todaySales.forEach(s => (s.items || []).forEach(i => {
      counts[i.name] = (counts[i.name] || 0) + i.qty
    }))
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }, [todaySales])

  const paymentMethods = useMemo(() => {
    const counts: Record<string, number> = {}
    todaySales.forEach(s => {
      const m = s.paymentMethod || 'otro'
      counts[m] = (counts[m] || 0) + s.total
    })
    return Object.entries(counts).map(([method, total]) => ({ method, total: round2(total) }))
  }, [todaySales])

  const methodLabels: Record<string, string> = {
    efectivo: 'Efectivo', tarjeta: 'Tarjeta', bizum: 'Bizum', fiado: 'Fiado',
  }
  const methodIcons: Record<string, any> = {
    efectivo: Banknote, tarjeta: CreditCard, bizum: Smartphone,
  }

  const recentSales = useMemo(() => {
    return [...todaySales].sort((a, b) => b.closedAt - a.closedAt).slice(0, 10)
  }, [todaySales])

  function KpiCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
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
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl" style={{ color: C.cream }}>Dashboard de Ventas</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Euro} label="Hoy" value={`${euros(todayTotal)}`} sub={`${todayCount} tickets`} color={C.sage} />
        <KpiCard icon={Clock} label="Ayer" value={`${euros(yesterdayTotal)}`} sub={`${yesterdaySales.length} tickets`} color={C.brass} />
        <KpiCard icon={TrendingUp} label="Últimos 7 días" value={`${euros(weekTotal)}`} sub={`${weekSales.length} tickets`} color={C.brassLight} />
        <KpiCard icon={Ticket} label="Ticket medio" value={`${euros(avgTicket)}`} sub="hoy" color={C.sageLight} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-day chart */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="day" stroke={C.muted} fontSize={12} />
              <YAxis stroke={C.muted} fontSize={12} />
              <Tooltip
                contentStyle={{ background: C.surfaceLight, border: `1px solid ${C.line}`, borderRadius: '8px', color: C.cream }}
                formatter={(v: any) => euros(Number(v))} />
              <Bar dataKey="total" fill={C.brass} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly chart */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Ventas por hora (hoy)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourlyData}>
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
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Top 5 productos (hoy)</h3>
          {topProducts.length === 0 ? (
            <p className="text-xs" style={{ color: C.muted }}>Sin ventas hoy</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map(([name, qty], i) => (
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
          <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Métodos de pago (hoy)</h3>
          {paymentMethods.length === 0 ? (
            <p className="text-xs" style={{ color: C.muted }}>Sin ventas hoy</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(({ method, total }) => {
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
