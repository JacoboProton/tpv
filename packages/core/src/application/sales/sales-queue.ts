import type { Sale } from '../../domain/types'

export interface SalesQueueDeps {
  addSale: (sale: Sale) => Promise<{ ok: boolean; ticketNumber?: string }>
  setSales: (updater: (prev: Sale[]) => Sale[]) => void
  cacheSet: (key: string, value: Sale[] | null) => void
  showToast: (msg: string) => void
  log: (msg: string) => void
  wait: (ms: number) => Promise<void>
}

export async function processSalesQueue(
  queue: Sale[],
  processingRef: { current: boolean },
  deps: SalesQueueDeps,
): Promise<void> {
  if (processingRef.current || queue.length === 0) return
  processingRef.current = true
  while (queue.length > 0) {
    const sale = queue[0]
    let ok = false
    let lastErr = ''
    let ticketNumber: string | null = null
    try {
      const res = await deps.addSale(sale)
      ok = res && res.ok
      if (res && res.ticketNumber) ticketNumber = res.ticketNumber
      if (!ok) lastErr = 'respuesta vacía'
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
      deps.log?.('addSale error: ' + lastErr)
    }
    if (ok) {
      if (ticketNumber) {
        deps.setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, ticketNumber } : s))
        deps.cacheSet('sales', null)
      }
      queue.shift()
    } else {
      deps.showToast(`Error venta: ${lastErr}. Reintentando...`)
      await deps.wait(2000)
      try {
        const res = await deps.addSale(sale)
        if (res && res.ok) {
          queue.shift()
        } else {
          deps.showToast(`Error venta: ${lastErr}. No se pudo guardar`)
          queue.shift()
        }
      } catch (e2) {
        deps.showToast(`Error venta: ${e2 instanceof Error ? e2.message : String(e2)}. No se pudo guardar`)
        queue.shift()
      }
    }
  }
  processingRef.current = false
}
