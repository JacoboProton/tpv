export function calculateSubtotal(items: Array<{ price: number; qty: number }>): number {
  return items.reduce((s, i) => s + i.price * i.qty, 0)
}

export function calculateDiscountAmount(subtotal: number, discountPct: number): number {
  return round2(subtotal * (discountPct / 100))
}

export function calculateTotal(subtotal: number, discountAmount: number): number {
  return round2(subtotal - discountAmount)
}

export function calculateTotalWithTip(total: number, tip: number): number {
  return round2(total + tip)
}

export interface OrderTotals {
  subtotal: number
  discountAmount: number
  offerDiscountAmount: number
  total: number
  totalWithTip: number
}

export function calculateOrderTotals(
  items: Array<{ price: number; qty: number }>,
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
