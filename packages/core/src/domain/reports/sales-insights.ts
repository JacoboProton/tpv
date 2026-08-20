export interface SaleLike {
  closedAt: number
  total: number
  items?: { name?: string; qty?: number }[]
  paymentMethod?: string
  payments?: { method?: string; amount: number }[]
}

export interface PeriodTotals {
  total: number
  tickets: number
  avgTicket: number
}

export interface PeriodComparison {
  current: PeriodTotals
  previous: PeriodTotals
  deltaTotal: number
  deltaTickets: number
  deltaPct: number | null
}

export interface DailyPoint {
  day: string
  total: number
  previous: number
}

function totalsInRange(sales: SaleLike[], start: number, endExclusive: number): PeriodTotals {
  let total = 0
  let tickets = 0
  for (const s of sales) {
    const t = s.closedAt
    if (t >= start && t < endExclusive) {
      total += s.total
      tickets += 1
    }
  }
  return { total, tickets, avgTicket: tickets > 0 ? total / tickets : 0 }
}

const DAY_MS = 86400000

/**
 * Compara el periodo [start, end) con el periodo equivalente inmediatamente
 * anterior, devolviendo deltas absolutos y porcentuales. deltaPct es null
 * cuando el periodo anterior no tiene ventas (no hay base de comparación).
 */
export function comparePeriod(
  sales: SaleLike[],
  start: number,
  endExclusive: number,
): PeriodComparison {
  const span = endExclusive - start
  const current = totalsInRange(sales, start, endExclusive)
  const previous = totalsInRange(sales, start - span, start)
  const deltaTotal = current.total - previous.total
  const deltaTickets = current.tickets - previous.tickets
  const deltaPct = previous.total > 0 ? (deltaTotal / previous.total) * 100 : null
  return { current, previous, deltaTotal, deltaTickets, deltaPct }
}

export interface DailyComparison {
  points: DailyPoint[]
  todayTotal: number
  todayPrevious: number
  deltaPct: number | null
}

/**
 * Serie de 7 dias (de inicio a hoy incluido) con el total de cada dia y el del
 * dia correspondiente de la semana anterior, para comparativa visual.
 * `todayStart` debe fijarse a medianoche local de hoy.
 */
export function previousWeekComparison(
  sales: SaleLike[],
  todayStart: number,
): DailyComparison {
  const points: DailyPoint[] = []
  let todayTotal = 0
  let todayPrevious = 0
  for (let i = 6; i >= 0; i--) {
    const start = todayStart - i * DAY_MS
    const end = start + DAY_MS
    const curr = totalsInRange(sales, start, end)
    const prev = totalsInRange(sales, start - 7 * DAY_MS, end - 7 * DAY_MS)
    if (i === 0) {
      todayTotal = curr.total
      todayPrevious = prev.total
    }
    points.push({
      day: new Date(start).toLocaleDateString('es-ES', { weekday: 'short' }),
      total: curr.total,
      previous: prev.total,
    })
  }
  const deltaPct = todayPrevious > 0 ? ((todayTotal - todayPrevious) / todayPrevious) * 100 : null
  return { points, todayTotal, todayPrevious, deltaPct }
}

/**
 * Ventas por franja horaria de un dia, para detectar horas punta.
 */
export function hourlySales(sales: SaleLike[], dayStart: number): { hour: string; total: number; tickets: number }[] {
  const out: { hour: string; total: number; tickets: number }[] = []
  for (let h = 0; h < 24; h++) {
    const start = dayStart + h * 3600000
    const t = totalsInRange(sales, start, start + 3600000)
    if (t.tickets > 0 || t.total > 0) {
      out.push({ hour: `${h.toString().padStart(2, '0')}h`, total: t.total, tickets: t.tickets })
    }
  }
  return out
}

export interface ProductRank {
  name: string
  qty: number
}

/**
 * Top productos por cantidad vendida en [start, end).
 */
export function topProducts(sales: SaleLike[], start: number, endExclusive: number, limit = 5): ProductRank[] {
  const counts: Record<string, number> = {}
  for (const s of sales) {
    if (s.closedAt < start || s.closedAt >= endExclusive) continue
    for (const i of s.items || []) {
      const name = i?.name
      if (!name) continue
      counts[name] = (counts[name] || 0) + (i?.qty || 1)
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, qty]) => ({ name, qty }))
}

export interface MethodTotal {
  method: string
  total: number
}

export function paymentMethodTotals(sales: SaleLike[], start: number, endExclusive: number): MethodTotal[] {
  const map: Record<string, number> = {}
  for (const s of sales) {
    if (s.closedAt < start || s.closedAt >= endExclusive) continue
    const payments = s.payments?.length ? s.payments : [{ method: s.paymentMethod, amount: s.total }]
    for (const p of payments) {
      const m = p.method || 'otro'
      map[m] = (map[m] || 0) + p.amount
    }
  }
  return Object.entries(map).map(([method, total]) => ({ method, total }))
}