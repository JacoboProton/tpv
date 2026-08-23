import { calculateOrderSubtotal } from '../../domain/order/line-totals'
import { round2 } from '../../lib/utils'

import type { OrderItem, Catalog } from '../../domain/types'

export interface PaymentSplitState {
  id: string
  method: string
  amount: number
  itemIds?: string[]
  code?: string
}

export function addSplit(
  splits: PaymentSplitState[],
  method: string,
  finalTotal: number,
): PaymentSplitState[] {
  if (method === 'fiado') {
    return [{ id: 'sp_fiado', method: 'fiado', amount: finalTotal }]
  }
  const used = round2(splits.reduce((s, p) => s + (p.method === 'fiado' ? 0 : p.amount), 0))
  const rem = round2(finalTotal - used)
  if (rem <= 0) return splits
  return [...splits.filter((p) => p.method !== 'fiado'), { id: 'sp_' + Date.now(), method, amount: rem, itemIds: [] }]
}

export function updateSplitAmount(
  splits: PaymentSplitState[],
  id: string,
  value: string,
): PaymentSplitState[] {
  const amount = value === '' ? 0 : Math.max(0, parseFloat(value))
  return splits.map((p) => p.id === id ? { ...p, amount: isNaN(amount) ? 0 : amount } : p)
}

export function removeSplit(
  splits: PaymentSplitState[],
  id: string,
): PaymentSplitState[] {
  return splits.filter((p) => p.id !== id)
}

export function toggleSplitItem(
  splits: PaymentSplitState[],
  splitId: string,
  itemId: string,
  items: OrderItem[],
): PaymentSplitState[] {
  return splits.map((p) => {
    if (p.id !== splitId) return p
    const ids = p.itemIds || []
    const next = ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId]
    const itemAmount = items
      .filter((i) => next.includes(i.id))
      .reduce((s, i) => s + i.price * i.qty, 0)
    return { ...p, itemIds: next, amount: itemAmount > 0 ? itemAmount : p.amount }
  })
}

export interface PaymentTotals {
  orderTotal: number
  discountedTotal: number
  finalTotal: number
  splitsUsed: number
  remaining: number
  canConfirm: boolean
}

export function computePaymentTotals(
  items: OrderItem[],
  catalog: Catalog | undefined,
  orderDiscount: number,
  tipAmount: number,
  splits: PaymentSplitState[],
): PaymentTotals {
  const orderTotal = calculateOrderSubtotal(items, catalog)
  const discountedTotal = round2(orderTotal * (1 - orderDiscount / 100))
  const finalTotal = round2(discountedTotal + tipAmount)
  const splitsUsed = round2(splits.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const remaining = round2(finalTotal - splitsUsed)
  const canConfirm = splits.length > 0 && Math.abs(remaining) < 0.005
  return { orderTotal, discountedTotal, finalTotal, splitsUsed, remaining, canConfirm }
}
