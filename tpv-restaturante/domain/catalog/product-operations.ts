import type { NewProductInput, StockDelta, Product, Catalog, StockEntry } from '../types'

export type { NewProductInput, StockDelta }

export function createProduct(data: NewProductInput): Product {
  const loc = data.ubicacion || 'Bar'
  return {
    id: 'p_' + Date.now(),
    name: data.name,
    price: Number(data.price),
    category: data.category,
    ubicacion: loc,
    discount: 0,
    stockByLocation: {
      [loc]: { stock: Number(data.stock ?? 0), lowStock: Number(data.lowStock ?? 0) },
    },
  } as Product
}

export function ensureCategoryExists(catalog: Catalog, category: string): Catalog {
  if (catalog.categories.some(c => c.name === category)) return catalog
  return { ...catalog, categories: [...catalog.categories, { id: 'cat_' + Date.now(), name: category }] }
}

export function removeProduct(catalog: Catalog, productId: string): Catalog {
  return {
    ...catalog,
    products: catalog.products.filter(p => p.id !== productId),
  }
}

export function toggleProductAgotado(catalog: Catalog, productId: string, agotado: boolean): Catalog {
  return {
    ...catalog,
    products: catalog.products.map(p => p.id === productId ? { ...p, agotado } : p),
  }
}

export function getProductImage(catalog: Catalog, productId: string): string | null | undefined {
  return catalog?.products?.find(p => p.id === productId)?.image
}

export function addProductToCatalog(catalog: Catalog, productData: NewProductInput): Catalog {
  const next: Catalog = JSON.parse(JSON.stringify(catalog))
  next.products.push(createProduct(productData))
  return ensureCategoryExists(next, productData.category)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function toProductField(field: string, value: unknown): Partial<Product> {
  switch (field) {
    case 'name': return { name: String(value) }
    case 'category': return { category: String(value) }
    case 'ubicacion': return { ubicacion: String(value) }
    case 'price': return { price: Number(value) }
    case 'cost': return { cost: Number(value) }
    case 'stock': return { stock: Number(value) }
    case 'lowStock': return { lowStock: Number(value) }
    case 'discount': return { discount: Number(value) }
    case 'barcode': return { barcode: String(value) }
    case 'course': return { course: String(value) }
    case 'image': return { image: value === '' ? null : String(value) }
    case 'description': return { description: value === '' ? null : String(value) }
    case 'agotado': return { agotado: Boolean(value) }
    case 'active': return { active: Boolean(value) }
    case 'showTpv': return { showTpv: Boolean(value) }
    case 'showQr': return { showQr: Boolean(value) }
    case 'featured': return { featured: Boolean(value) }
    case 'carouselSort': return { carouselSort: Number(value) }
    default: return {}
  }
}

export function setProductField(catalog: Catalog, productId: string, field: string, value: unknown): Catalog | null {
  const next: Catalog = JSON.parse(JSON.stringify(catalog))
  const p = next.products.find(p => p.id === productId)
  if (!p) return null
  if (field === 'stockByLocation') {
    if (isRecord(value)) {
      const stockByLocation: Record<string, StockEntry> = {}
      for (const [loc, entry] of Object.entries(value)) {
        if (isRecord(entry)) {
          stockByLocation[loc] = {
            stock: Number(entry.stock ?? 0),
            lowStock: typeof entry.lowStock === 'number' ? Number(entry.lowStock) : undefined,
          }
        }
      }
      p.stockByLocation = stockByLocation
    }
  } else {
    Object.assign(p, toProductField(field, value))
  }
  return next
}

export function getLowStockProducts(catalog: Catalog): Product[] {
  if (!catalog?.products) return []
  return catalog.products.filter(p => {
    if (!p.stockByLocation) return false
    return Object.values(p.stockByLocation).some((entry: StockEntry) => entry.stock <= (entry.lowStock ?? 0))
  })
}

export function detectStockChanges(oldCatalog: Catalog, newCatalog: Catalog, productId: string): StockDelta[] {
  const oldProduct = oldCatalog?.products?.find(p => p.id === productId)
  const newProduct = newCatalog?.products?.find(p => p.id === productId)
  if (!oldProduct || !newProduct) return []

  const deltas: StockDelta[] = []
  const oldStockByLocation = oldProduct.stockByLocation || {}
  const newStockByLocation = newProduct.stockByLocation || {}

  for (const [loc, entry] of Object.entries(newStockByLocation)) {
    const oldEntry = oldStockByLocation[loc] || { stock: 0 }
    const delta = entry.stock - oldEntry.stock
    if (delta !== 0) {
      deltas.push({
        productId,
        productName: newProduct.name,
        ubicacion: loc,
        delta,
        newStock: entry.stock,
      })
    }
  }
  return deltas
}
