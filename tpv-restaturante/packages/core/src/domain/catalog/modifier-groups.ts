export interface ModifierOption {
  id: string
  stockDeduct?: boolean
  stockArticleId?: string
  stockQuantity?: number
  priceDelta?: number
}

export interface ModifierGroup {
  id: string
  options: ModifierOption[]
}

export interface ModifierData {
  productModifiers: Record<string, string[]>
  groups: ModifierGroup[]
}

export function getModifierGroupsForProduct(
  modifierData: ModifierData,
  productId: string,
): ModifierGroup[] {
  const groupIds = modifierData.productModifiers[productId] || []
  return modifierData.groups.filter(g => groupIds.includes(g.id))
}
