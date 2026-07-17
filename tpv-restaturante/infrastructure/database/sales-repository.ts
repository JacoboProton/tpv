import { fetchSales, addSale } from '@/lib/api'
import { cacheSet } from '@/lib/offline'

export interface Sale {
  id: string
  tableId?: string
  items: any[]
  payments: any[]
  total: number
  status: string
  createdAt: number
  closedAt?: number
  employeeId?: string
  employeeName?: string
}

export interface SalesData {
  sales: Sale[]
}

export async function getSales(): Promise<SalesData | null> {
  try {
    return (await fetchSales()) as SalesData
  } catch {
    return null
  }
}

export async function saveSale(sale: Sale): Promise<{ ok: boolean; ticketNumber?: string }> {
  cacheSet('sales', null)
  try {
    const res = await addSale(sale) as { ok: boolean; ticketNumber?: string } | null
    return res || { ok: false }
  } catch {
    return { ok: false }
  }
}
