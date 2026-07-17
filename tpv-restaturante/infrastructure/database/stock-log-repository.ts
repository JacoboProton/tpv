import { saveStockLog as apiSaveStockLog } from '@/lib/api'

export interface StockLogEntry {
  productId: string
  productName: string
  oldStock: number
  newStock: number
  reason: string
  employeeName?: string
  createdAt: number
}

export async function saveStockLog(entry: StockLogEntry): Promise<void> {
  try {
    await apiSaveStockLog(entry)
  } catch {
    /* offline */
  }
}
