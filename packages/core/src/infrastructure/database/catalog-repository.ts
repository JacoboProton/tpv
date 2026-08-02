import type { Product } from '../../domain/types.js'

export interface CatalogProduct extends Product {
  category: string
  ubicacion: string
  image?: string | null
  description?: string | null
  showTpv?: boolean
  showQr?: boolean
  agotado?: boolean
  carouselSort?: number | null
  type?: string
  inventariable?: boolean
  stockByLocation?: Record<string, { stock: number; lowStock?: number }>
  course?: string
}

export interface Catalog {
  products: CatalogProduct[]
  categories: string[]
  combos: any[]
  mealMenus: any[]
  priceRules: any[]
  carrusel?: any[]
  cartas?: any[]
}

export function findProduct(catalog: Catalog | null, productId: string): CatalogProduct | null {
  return catalog?.products?.find(p => p.id === productId) || null
}
