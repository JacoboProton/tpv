interface OrderItem {
  productId?: string
  price: number
  qty: number
  voided?: boolean
  overridePrice?: number
  lineDiscount?: number
  isCourtesy?: boolean
}

interface CatalogProduct {
  id: string
  discount?: number
}

export function calculateLineTotal(
  item: OrderItem,
  product?: CatalogProduct,
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
  catalog?: { products?: CatalogProduct[] },
): number {
  return items.reduce((sum, item) => {
    const product = catalog?.products?.find((p) => p.id === item.productId)
    return sum + calculateLineTotal(item, product)
  }, 0)
}
