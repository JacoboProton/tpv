export interface NewProductInput {
  name: string
  category: string
  price: number
  ubicacion?: string
  stock?: number
  lowStock?: number
}

export function createProduct(data: NewProductInput): any {
  const loc = data.ubicacion || 'Bar'
  return {
    id: 'p_' + Date.now(),
    name: data.name,
    category: data.category,
    price: Number(data.price),
    ubicacion: loc,
    discount: 0,
    stockByLocation: {
      [loc]: { stock: Number(data.stock ?? 0), lowStock: Number(data.lowStock ?? 0) },
    },
  }
}

export function ensureCategoryExists(catalog: any, category: string): any {
  if (catalog.categories.includes(category)) return catalog
  return { ...catalog, categories: [...catalog.categories, category] }
}

export function removeProduct(catalog: any, productId: string): any {
  return {
    ...catalog,
    products: catalog.products.filter((p: any) => p.id !== productId),
  }
}

export interface StockDelta {
  productId: string
  productName: string
  ubicacion: string
  delta: number
  newStock: number
}

export function toggleProductAgotado(catalog: any, productId: string, agotado: boolean): any {
  return {
    ...catalog,
    products: catalog.products.map((p: any) => p.id === productId ? { ...p, agotado } : p),
  }
}

export function getProductImage(catalog: any, productId: string): string | undefined {
  return catalog?.products?.find((p: any) => p.id === productId)?.image ?? undefined
}

export function addProductToCatalog(catalog: any, productData: NewProductInput): any {
  const next = JSON.parse(JSON.stringify(catalog))
  next.products.push(createProduct(productData))
  return ensureCategoryExists(next, productData.category)
}

export function setProductField(catalog: any, productId: string, field: string, value: any): any {
  const next = JSON.parse(JSON.stringify(catalog))
  const p = next.products.find((p: any) => p.id === productId)
  if (!p) return null
  if (field === 'stockByLocation') {
    p.stockByLocation = value
  } else {
    p[field] = (field === 'name' || field === 'category' || field === 'ubicacion') ? value : Number(value)
  }
  return next
}

export function getLowStockProducts(catalog: any): any[] {
  if (!catalog?.products) return []
  return catalog.products.filter((p: any) => {
    if (!p.stockByLocation) return false
    return Object.values(p.stockByLocation).some((entry: any) => entry.stock <= entry.lowStock)
  })
}

export function detectStockChanges(oldCatalog: any, newCatalog: any, productId: string): StockDelta[] {
  const oldProduct = oldCatalog?.products?.find((p: any) => p.id === productId)
  const newProduct = newCatalog?.products?.find((p: any) => p.id === productId)
  if (!oldProduct || !newProduct) return []

  const deltas: StockDelta[] = []
  const oldStockByLocation = oldProduct.stockByLocation || {}
  const newStockByLocation = newProduct.stockByLocation || {}

  for (const [loc, entry] of Object.entries(newStockByLocation) as any) {
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
