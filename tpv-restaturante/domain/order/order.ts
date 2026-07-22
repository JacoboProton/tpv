import type { OrderItem } from '../types'
import type { OrderTotals } from '../types'

export type { OrderTotals }

export function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((s, i) => s + i.price * i.qty, 0)
}

export function calculateDiscountAmount(subtotal: number, discountPct: number): number {
  return round2(subtotal * (discountPct / 100))
}

export function calculateTotal(subtotal: number, discountAmount: number): number {
  return round2(Math.max(0, subtotal - discountAmount))
}

export function calculateTotalWithTip(total: number, tip: number): number {
  return round2(total + tip)
}

export function calculateOrderTotals(
  items: OrderItem[],
  discountPct: number,
  offerDiscountAmount: number,
  tip: number
): OrderTotals {
  const subtotal = calculateSubtotal(items)
  const pctDiscount = calculateDiscountAmount(subtotal, discountPct)
  const discountAmount = round2(pctDiscount + offerDiscountAmount)
  const total = calculateTotal(subtotal, discountAmount)
  const totalWithTip = calculateTotalWithTip(total, tip)
  return { subtotal, discountAmount, offerDiscountAmount, total, totalWithTip }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
