import { fetchCatalog as apiFetchCatalog, saveCatalog as apiSaveCatalog } from '@/lib/api'
import { cacheGet, cacheSet } from '@/lib/offline'

export interface CatalogProduct {
  id: string
  name: string
  category: string
  price: number
  ubicacion: string
  image?: string | null
  allergens?: string[]
  description?: string | null
  featured?: boolean
  active?: boolean
  showTpv?: boolean
  showQr?: boolean
  agotado?: boolean
  carouselSort?: number | null
  type?: string
  inventariable?: boolean
  discount?: number
  stockByLocation?: Record<string, { stock: number; lowStock?: number }>
  stock?: number
  lowStock?: number
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

export async function getCatalog(): Promise<Catalog | null> {
  try {
    return (await apiFetchCatalog()) as Catalog
  } catch {
    return null
  }
}

export async function saveCatalog(catalog: Catalog): Promise<void> {
  cacheSet('catalog', catalog)
  try {
    await apiSaveCatalog(catalog)
  } catch {
    /* offline — cache handles it */
  }
}

export function getCachedCatalog(): Catalog | null {
  return cacheGet('catalog') as Catalog | null
}

export function findProduct(catalog: Catalog | null, productId: string): CatalogProduct | null {
  return catalog?.products?.find(p => p.id === productId) || null
}
