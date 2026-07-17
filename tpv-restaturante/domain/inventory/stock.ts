export interface StockEntry {
  stock: number
  lowStock?: number
}

export function deductStock(stockByLocation: Record<string, StockEntry> | undefined, ubicacion: string, qty: number): { stockByLocation: Record<string, StockEntry>; newStock: number } {
  const locs = Object.keys(stockByLocation || {})
  const location = locs.length > 0 ? locs[0] : ubicacion
  const entry: StockEntry = (stockByLocation || {})[location] || { stock: 0 }
  const newStock = Math.max(0, (entry.stock || 0) - qty)
  const result = { ...(stockByLocation || {}), [location]: { ...entry, stock: newStock } }
  return { stockByLocation: result, newStock }
}

export function getStockEntry(stockByLocation: Record<string, StockEntry> | undefined, ubicacion: string): StockEntry {
  const locs = Object.keys(stockByLocation || {})
  const location = locs.length > 0 ? locs[0] : ubicacion
  return (stockByLocation || {})[location] || { stock: 0 }
}

export function isLowStock(entry: StockEntry): boolean {
  return entry.stock <= (entry.lowStock || 0)
}
