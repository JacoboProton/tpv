import type { Sale } from '@tpv/core'

export interface SalesQueueDeps {
  addSale: (sale: Sale) => Promise<{ ok: boolean; ticketNumber?: string }>
  setSales: (updater: (prev: Sale[]) => Sale[]) => void
  cacheSet: (key: string, value: Sale[] | null) => void
  showToast: (msg: string) => void
  /**
   * Persiste la venta en la cola de mutaciones durable (localStorage) para
   * que el sync la reenvíe cuando vuelva la red. Evita perder la venta.
   */
  persistSale: (sale: Sale) => void
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
      console.warn('addSale error:', lastErr)
    }
    if (ok) {
      if (ticketNumber) {
        deps.setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, ticketNumber } : s))
        deps.cacheSet('sales', null)
      }
      queue.shift()
    } else {
      deps.showToast(`Error venta: ${lastErr}. Reintentando...`)
      await new Promise(r => setTimeout(r, 2000))
      try {
        const res = await deps.addSale(sale)
        if (res && res.ok) {
          queue.shift()
        } else {
          // No descartamos: lo guardamos en la cola durable para retry sinc.
          deps.persistSale(sale)
          deps.showToast(`Venta guardada sin conexión. Se sincronizará cuando vuelva la red.`)
          queue.shift()
        }
      } catch (e2) {
        deps.persistSale(sale)
        deps.showToast(`Venta guardada sin conexión. Se sincronizará cuando vuelva la red.`)
        queue.shift()
      }
    }
  }
  processingRef.current = false
}