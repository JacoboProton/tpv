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

export function getProductImage(catalog: Catalog, productId: string): string | undefined {
  return catalog?.products?.find(p => p.id === productId)?.image
}

export function addProductToCatalog(catalog: Catalog, productData: NewProductInput): Catalog {
  const next: Catalog = JSON.parse(JSON.stringify(catalog))
  next.products.push(createProduct(productData))
  return ensureCategoryExists(next, productData.category)
}

export function setProductField(catalog: Catalog, productId: string, field: string, value: any): Catalog | null {
  const next: Catalog = JSON.parse(JSON.stringify(catalog))
  const p = next.products.find(p => p.id === productId)
  if (!p) return null
  if (field === 'stockByLocation') {
    (p as any).stockByLocation = value
  } else {
    (p as any)[field] = (field === 'name' || field === 'category' || field === 'ubicacion') ? value : Number(value)
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
