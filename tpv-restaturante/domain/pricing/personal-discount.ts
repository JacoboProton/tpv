import type { OrderItem, Product, Catalog, Employee } from '../types'

export type { }

export function calculatePersonalDiscountAmount(
  items: OrderItem[],
  rates: Record<string, number>,
  catalog?: Catalog,
): number {
  let total = 0
  for (const item of items) {
    if (item.voided) continue
    const p = catalog?.products?.find((pr: Product) => pr.id === item.productId)
    if (!p) continue
    const rate = rates[p.category || ''] || 0
    if (rate <= 0) continue
    const effectivePrice = item.overridePrice != null ? item.overridePrice : item.price
    total += effectivePrice * item.qty * rate / 100
  }
  return Math.round((total + Number.EPSILON) * 100) / 100
}

export function applyDiscountRates(
  items: OrderItem[],
  rates: Record<string, number>,
  catalog?: Catalog,
): OrderItem[] {
  return items.map((item) => {
    if (item.voided) return item
    const p = catalog?.products?.find((pr: Product) => pr.id === item.productId)
    if (!p) return item
    const rate = rates[p.category || ''] || 0
    return { ...item, lineDiscount: rate > 0 ? rate : 0, isCourtesy: rate > 0 ? false : item.isCourtesy }
  })
}

export function removeDiscountRates(
  items: OrderItem[],
  rates: Record<string, number>,
  catalog?: Catalog,
): OrderItem[] {
  return items.map((item) => {
    const p = catalog?.products?.find((pr: Product) => pr.id === item.productId)
    if (!p) return item
    const rate = rates[p.category || ''] || 0
    if (rate > 0 && item.lineDiscount === rate) {
      return { ...item, lineDiscount: 0 }
    }
    return item
  })
}

export function buildEmployeeMonthlyUsage(
  employees: Employee[],
  empId: string,
  discountAmount: number,
  now?: Date,
): Employee[] {
  const d = now || new Date()
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return employees.map((e) => {
    if (e.id !== empId) return e
    const used = e.monthlyUsedMonth === currentMonth ? (e.monthlyUsed || 0) : 0
    return { ...e, monthlyUsedMonth: currentMonth, monthlyUsed: used + discountAmount }
  })
}

export function buildEmployeeMonthlyUsageDecrement(
  employees: Employee[],
  empId: string,
  discountAmount: number,
  now?: Date,
): Employee[] {
  const d = now || new Date()
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return employees.map((e) => {
    if (e.id !== empId) return e
    const used = e.monthlyUsedMonth === currentMonth ? (e.monthlyUsed || 0) : 0
    return { ...e, monthlyUsedMonth: currentMonth, monthlyUsed: Math.max(0, used - discountAmount) }
  })
}
