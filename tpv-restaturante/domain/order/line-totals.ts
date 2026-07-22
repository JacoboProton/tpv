import type { OrderItem, Product } from '../types'

export function calculateLineTotal(
  item: OrderItem,
  product?: Product,
): number {
  if (item.voided || item.isCourtesy) return 0

  const effectivePrice = item.overridePrice != null ? item.overridePrice : item.price
  const defaultDisc = product?.discount || 0
  const lineDisc = item.lineDiscount || 0
  const appliedDisc = lineDisc > 0 ? lineDisc : defaultDisc

  return effectivePrice * (1 - appliedDisc / 100) * item.qty
}

export function calculateOrderSubtotal(
  items: OrderItem[],
  catalog?: { products?: Product[] },
): number {
  return items.reduce((sum, item) => {
    const product = catalog?.products?.find((p) => p.id === item.productId)
    return sum + calculateLineTotal(item, product)
  }, 0)
}
