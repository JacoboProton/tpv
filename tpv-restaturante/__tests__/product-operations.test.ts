import { describe, it, expect } from 'vitest'
import {
  createProduct, ensureCategoryExists, removeProduct,
  toggleProductAgotado, getProductImage, detectStockChanges,
  addProductToCatalog, setProductField, getLowStockProducts,
} from '../domain/catalog/product-operations'

describe('createProduct', () => {
  it('creates a product with default ubicacion', () => {
    const p = createProduct({ name: 'Test', category: 'Bebidas', price: 10 })
    expect(p.name).toBe('Test')
    expect(p.category).toBe('Bebidas')
    expect(p.price).toBe(10)
    expect(p.ubicacion).toBe('Bar')
    expect(p.id).toMatch(/^p_\d+$/)
    expect(p.stockByLocation.Bar).toEqual({ stock: 0, lowStock: 0 })
  })

  it('creates a product with custom ubicacion and stock', () => {
    const p = createProduct({ name: 'Coca', category: 'Bebidas', price: 2.5, ubicacion: 'Cocina', stock: 10, lowStock: 3 })
    expect(p.ubicacion).toBe('Cocina')
    expect(p.stockByLocation.Cocina).toEqual({ stock: 10, lowStock: 3 })
  })

  it('converts string price to number', () => {
    const p = createProduct({ name: 'X', category: 'Y', price: '5' as any })
    expect(p.price).toBe(5)
  })
})

describe('ensureCategoryExists', () => {
  it('adds category if missing', () => {
    const catalog = { categories: ['Bebidas'], products: [] }
    const result = ensureCategoryExists(catalog, 'Cocina')
    expect(result.categories).toEqual(['Bebidas', 'Cocina'])
    expect(result).not.toBe(catalog)
  })

  it('returns same catalog if category exists', () => {
    const catalog = { categories: ['Bebidas', 'Cocina'], products: [] }
    const result = ensureCategoryExists(catalog, 'Bebidas')
    expect(result).toBe(catalog)
  })
})

describe('removeProduct', () => {
  it('removes product by id', () => {
    const catalog = { products: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }] }
    const result = removeProduct(catalog, 'p2')
    expect(result.products).toHaveLength(2)
    expect(result.products.map((p: any) => p.id)).toEqual(['p1', 'p3'])
  })
})

describe('toggleProductAgotado', () => {
  it('sets agotado to true', () => {
    const catalog = { products: [{ id: 'p1', name: 'Café' }, { id: 'p2', name: 'Té' }] }
    const result = toggleProductAgotado(catalog, 'p1', true)
    expect(result.products[0].agotado).toBe(true)
    expect(result.products[1].agotado).toBeUndefined()
  })

  it('sets agotado to false', () => {
    const catalog = { products: [{ id: 'p1', name: 'Café', agotado: true }] }
    const result = toggleProductAgotado(catalog, 'p1', false)
    expect(result.products[0].agotado).toBe(false)
  })
})

describe('getProductImage', () => {
  it('returns image URL if product has one', () => {
    const catalog = { products: [{ id: 'p1', image: '/img/cafe.jpg' }] }
    expect(getProductImage(catalog, 'p1')).toBe('/img/cafe.jpg')
  })

  it('returns undefined if product has no image', () => {
    const catalog = { products: [{ id: 'p1' }] }
    expect(getProductImage(catalog, 'p1')).toBeUndefined()
  })

  it('returns undefined if product not found', () => {
    const catalog = { products: [{ id: 'p1' }] }
    expect(getProductImage(catalog, 'p999')).toBeUndefined()
  })

  it('returns undefined for null catalog', () => {
    expect(getProductImage(null, 'p1')).toBeUndefined()
  })
})

describe('detectStockChanges', () => {
  const oldCatalog = {
    products: [
      { id: 'p1', name: 'Café', stockByLocation: { Bar: { stock: 10, lowStock: 3 } } },
    ],
  }

  it('detects stock decrease', () => {
    const newCatalog = {
      products: [
        { id: 'p1', name: 'Café', stockByLocation: { Bar: { stock: 7, lowStock: 3 } } },
      ],
    }
    const deltas = detectStockChanges(oldCatalog, newCatalog, 'p1')
    expect(deltas).toHaveLength(1)
    expect(deltas[0].delta).toBe(-3)
    expect(deltas[0].newStock).toBe(7)
    expect(deltas[0].ubicacion).toBe('Bar')
  })

  it('detects stock increase', () => {
    const newCatalog = {
      products: [
        { id: 'p1', name: 'Café', stockByLocation: { Bar: { stock: 15, lowStock: 3 } } },
      ],
    }
    const deltas = detectStockChanges(oldCatalog, newCatalog, 'p1')
    expect(deltas).toHaveLength(1)
    expect(deltas[0].delta).toBe(5)
  })

  it('returns empty array if no change', () => {
    const deltas = detectStockChanges(oldCatalog, oldCatalog, 'p1')
    expect(deltas).toHaveLength(0)
  })

  it('returns empty array if product not found', () => {
    expect(detectStockChanges(oldCatalog, oldCatalog, 'p999')).toHaveLength(0)
  })

  it('detects new location added', () => {
    const newCatalog = {
      products: [
        { id: 'p1', name: 'Café', stockByLocation: { Bar: { stock: 10, lowStock: 3 }, Cocina: { stock: 5, lowStock: 2 } } },
      ],
    }
    const deltas = detectStockChanges(oldCatalog, newCatalog, 'p1')
    expect(deltas).toHaveLength(1)
    expect(deltas[0].ubicacion).toBe('Cocina')
    expect(deltas[0].delta).toBe(5)
  })
})

describe('addProductToCatalog', () => {
  it('adds product and ensures category exists', () => {
    const catalog = { categories: ['Bebidas'], products: [] }
    const next = addProductToCatalog(catalog, { name: 'Vino', category: 'Bebidas', price: 5 })
    expect(next.products).toHaveLength(1)
    expect(next.products[0].name).toBe('Vino')
    expect(next.categories).toEqual(['Bebidas'])
  })
})

describe('setProductField', () => {
  it('updates a string field', () => {
    const catalog = { products: [{ id: 'p1', name: 'Vino', price: 5 }] }
    const next = setProductField(catalog, 'p1', 'name', 'Vino Tinto')
    expect(next.products[0].name).toBe('Vino Tinto')
  })

  it('coerces numeric fields', () => {
    const catalog = { products: [{ id: 'p1', name: 'Vino', price: 5 }] }
    const next = setProductField(catalog, 'p1', 'price', '10')
    expect(next.products[0].price).toBe(10)
  })

  it('handles stockByLocation object', () => {
    const catalog = { products: [{ id: 'p1', name: 'Vino', price: 5, stockByLocation: { Bar: { stock: 5, lowStock: 2 } } }] }
    const next = setProductField(catalog, 'p1', 'stockByLocation', { Bar: { stock: 10, lowStock: 2 } })
    expect(next.products[0].stockByLocation.Bar.stock).toBe(10)
  })

  it('returns null if product not found', () => {
    const catalog = { products: [] }
    expect(setProductField(catalog, 'bogus', 'name', 'test')).toBeNull()
  })

  it('does not mutate original catalog', () => {
    const catalog = { products: [{ id: 'p1', name: 'Vino', price: 5 }] }
    setProductField(catalog, 'p1', 'name', 'Vino Tinto')
    expect(catalog.products[0].name).toBe('Vino')
  })
})

describe('getLowStockProducts', () => {
  it('returns products with stock below lowStock', () => {
    const catalog = {
      products: [
        { id: 'p1', name: 'Vino', stockByLocation: { Bar: { stock: 1, lowStock: 5 } } },
        { id: 'p2', name: 'Agua', stockByLocation: { Bar: { stock: 10, lowStock: 5 } } },
      ],
    }
    const result = getLowStockProducts(catalog)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })

  it('returns empty array if no stockByLocation', () => {
    const catalog = { products: [{ id: 'p1', name: 'Vino' }] }
    expect(getLowStockProducts(catalog)).toHaveLength(0)
  })

  it('returns empty array for null catalog', () => {
    expect(getLowStockProducts(null)).toHaveLength(0)
  })
})
