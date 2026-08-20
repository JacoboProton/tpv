import { describe, it, expect } from 'vitest'
import {
  comparePeriod,
  previousWeekComparison,
  hourlySales,
  topProducts,
  paymentMethodTotals,
} from '../domain/reports/sales-insights'
import type { Sale } from '../domain/types'

const DAY = 86400000
const TODAY = Date.UTC(2026, 7, 19, 12, 0, 0) // 19 ago 2026

function makeSale(partial: Partial<Sale>): Sale {
  return {
    id: 's',
    items: [{ name: 'Cafe', qty: 1 }],
    subtotal: 0,
    discount: 0,
    total: 0,
    tip: 0,
    totalWithTip: 0,
    paymentMethod: 'efectivo',
    payments: [],
    isFiado: false,
    closedAt: TODAY,
    ...partial,
  } as Sale
}

describe('domain/reports/sales-insights', () => {
  it('comparePeriod calcula totals, deltas y %', () => {
    const dayStart = TODAY - (TODAY % DAY)
    const sales = [
      makeSale({ id: 'a', total: 100, closedAt: dayStart + 3600000 }),
      makeSale({ id: 'b', total: 50, closedAt: dayStart + 7200000 }),
      makeSale({ id: 'c', total: 80, closedAt: dayStart - DAY + 3600000 }),
    ]
    const result = comparePeriod(sales, dayStart, dayStart + DAY)
    expect(result.current.total).toBe(150)
    expect(result.current.tickets).toBe(2)
    expect(result.current.avgTicket).toBe(75)
    expect(result.previous.total).toBe(80)
    expect(result.deltaTotal).toBe(70)
    expect(result.deltaTickets).toBe(1)
    expect(result.deltaPct).toBeCloseTo(87.5, 2)
  })

  it('comparePeriod devuelve deltaPct null si el periodo anterior es 0', () => {
    const dayStart = TODAY - (TODAY % DAY)
    const sales = [makeSale({ id: 'a', total: 60, closedAt: dayStart + 1000 })]
    const result = comparePeriod(sales, dayStart, dayStart + DAY)
    expect(result.deltaTotal).toBe(60)
    expect(result.deltaPct).toBeNull()
  })

  it('previousWeekComparison genera 7 puntos con comparativa de hace una semana', () => {
    const dayStart = TODAY - (TODAY % DAY)
    const sales = [
      makeSale({ id: 'hoy', total: 200, closedAt: dayStart + DAY - 1 }),
      makeSale({ id: 'hoy-1s', total: 150, closedAt: dayStart - 7 * DAY + 1 }),
    ]
    const result = previousWeekComparison(sales, dayStart)
    expect(result.points).toHaveLength(7)
    const today = result.points[6]
    expect(today.total).toBe(200)
    expect(today.previous).toBe(150)
    expect(result.todayTotal).toBe(200)
    expect(result.todayPrevious).toBe(150)
    expect(result.deltaPct).toBeCloseTo(33.33, 2)
  })

  it('hourlySales agrupa por franja y descarta huecos vacios', () => {
    const dayStart = TODAY - (TODAY % DAY)
    const sales = [
      makeSale({ id: 'a', total: 20, closedAt: dayStart + 13 * 3600000 }),
      makeSale({ id: 'b', total: 30, closedAt: dayStart + 13 * 3600000 + 2400000 }),
    ]
    const result = hourlySales(sales, dayStart)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ hour: '13h', total: 50, tickets: 2 })
  })

  it('topProducts ordena por cantidad y respeta limite', () => {
    const dayStart = TODAY - (TODAY % DAY)
    const sales = [
      makeSale({ id: 'a', total: 10, closedAt: dayStart + 1000, items: [
        { id: 'i1', productId: 'p1', name: 'Cafe', qty: 2, price: 1 }, { id: 'i2', productId: 'p2', name: 'Tortilla', qty: 1, price: 2 },
      ] }),
      makeSale({ id: 'b', total: 10, closedAt: dayStart + 2000, items: [{ id: 'i3', productId: 'p1', name: 'Cafe', qty: 3, price: 1 }] }),
    ]
    const result = topProducts(sales, dayStart, dayStart + DAY, 2)
    expect(result[0]).toEqual({ name: 'Cafe', qty: 5 })
    expect(result[1]).toEqual({ name: 'Tortilla', qty: 1 })
    expect(result).toHaveLength(2)
  })

  it('paymentMethodTotals agrega por metodo usando payments cuando existe', () => {
    const dayStart = TODAY - (TODAY % DAY)
    const sales = [
      makeSale({
        id: 'a', total: 40, paymentMethod: 'efectivo',
        payments: [
          { method: 'efectivo', amount: 30 },
          { method: 'tarjeta', amount: 10 },
        ],
        closedAt: dayStart + 1000,
      }),
    ]
    const result = paymentMethodTotals(sales, dayStart, dayStart + DAY)
    expect(result).toEqual([
      { method: 'efectivo', total: 30 },
      { method: 'tarjeta', total: 10 },
    ])
  })
})