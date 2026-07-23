export interface StockModifierOption {
  id: string
  stockDeduct?: boolean
  stockArticleId?: string
  stockQuantity?: number
  priceDelta?: number
}

export interface StockModifierGroup {
  id: string
  options: StockModifierOption[]
}

export interface ModifierData {
  productModifiers: Record<string, string[]>
  groups: StockModifierGroup[]
}

export function getModifierGroupsForProduct(
  modifierData: ModifierData,
  productId: string,
): StockModifierGroup[] {
  const groupIds = modifierData.productModifiers[productId] || []
  return modifierData.groups.filter(g => groupIds.includes(g.id))
}
