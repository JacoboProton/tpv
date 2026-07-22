import type { MenuExpansionItem, Product } from '../types'

export type { MenuExpansionItem }

export function expandMenu(
  product: any,
  catalog: { products: Product[] },
  menuSel?: { productId: string }[],
): MenuExpansionItem[] {
  const menu = product.menuData
  const items: MenuExpansionItem[] = []

  if (menuSel && menuSel.length > 0) {
    for (const s of menuSel) {
      const p = catalog.products.find((pr) => pr.id === s.productId)
      if (!p) continue
      items.push({
        productId: p.id,
        name: p.name + ` (${menu.name})`,
        price: 0,
        qty: 1,
        course: p.course || '',
        isMenuItem: true,
        ubicacion: p.ubicacion || 'Bar',
      })
    }
  }

  items.push({
    productId: null,
    name: `→ Menú: ${menu.name}`,
    price: menu.price,
    qty: 1,
    course: '',
    isMenuPrice: true,
  })

  return items
}

export function expandCombo(
  product: any,
  catalog: { products: Product[] },
  comboSel?: { productId: string }[],
): MenuExpansionItem[] {
  const combo = product.comboData
  const items: MenuExpansionItem[] = []

  if (comboSel && comboSel.length > 0) {
    for (const s of comboSel) {
      const p = catalog.products.find((pr) => pr.id === s.productId)
      if (!p) continue
      items.push({
        productId: p.id,
        name: p.name + ` (${combo.name})`,
        price: 0,
        qty: 1,
        course: p.course || '',
        isComboItem: true,
      })
    }
  } else if (!combo.slots || combo.slots.length === 0) {
    for (const item of combo.items || []) {
      const p = catalog.products.find((pr: any) => pr.id === item.product_id)
      if (!p) continue
      items.push({
        productId: p.id,
        name: p.name + (combo.name ? ` (${combo.name})` : ''),
        price: 0,
        qty: item.quantity || 1,
        course: p.course || '',
        isComboItem: true,
      })
    }
  }

  items.push({
    productId: null,
    name: `→ Combo: ${combo.name}`,
    price: combo.price,
    qty: 1,
    course: '',
    isComboPrice: true,
  })

  return items
}
