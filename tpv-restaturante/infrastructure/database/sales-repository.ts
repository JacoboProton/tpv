import { fetchSales, addSale, unpackList } from '@/lib/api'
import { cacheSet } from '@/lib/offline'
import type { SaleItem, Payment } from '@tpv/core'

export interface Sale {
  id: string
  tableId?: string
  items: SaleItem[]
  payments: Payment[]
  total: number
  status: string
  createdAt: number
  closedAt?: number
  employeeId?: string
  employeeName?: string
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export interface SalesData {
  sales: Sale[]
}

export async function getSales(): Promise<SalesData | null> {
  try {
    const data = await fetchSales()
    const list = unpackList<Sale>(data)
    return { sales: list }
  } catch {
    return null
  }
}

export async function saveSale(sale: Sale): Promise<{ ok: boolean; ticketNumber?: string }> {
  cacheSet('sales', null)
  try {
    const res = await addSale(sale)
    return isRecord(res)
      ? { ok: res.ok === true, ticketNumber: typeof res.ticketNumber === 'string' ? res.ticketNumber : undefined }
      : { ok: false }
  } catch {
    return { ok: false }
  }
}
