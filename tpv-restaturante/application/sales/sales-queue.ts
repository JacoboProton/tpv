export interface SalesQueueDeps {
  addSale: (sale: any) => Promise<any>
  setSales: (updater: (prev: any[]) => any[]) => void
  cacheSet: (key: string, value: any) => void
  showToast: (msg: string) => void
}

export async function processSalesQueue(
  queue: any[],
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
      const res: any = await deps.addSale(sale)
      ok = res && res.ok
      if (res && res.ticketNumber) ticketNumber = res.ticketNumber
      if (!ok) lastErr = 'respuesta vacía'
    } catch (e) {
      lastErr = e && (e as Error).message ? (e as Error).message : String(e)
      console.warn('addSale error:', lastErr)
    }
    if (ok) {
      if (ticketNumber) {
        deps.setSales((prev: any) => prev.map((s: any) => s.id === sale.id ? { ...s, ticketNumber } : s))
        deps.cacheSet('sales', null)
      }
      queue.shift()
    } else {
      deps.showToast(`Error venta: ${lastErr}. Reintentando...`)
      await new Promise(r => setTimeout(r, 2000))
      try {
        const res: any = await deps.addSale(sale)
        if (res && res.ok) {
          queue.shift()
        } else {
          deps.showToast(`Error venta: ${lastErr}. No se pudo guardar`)
          queue.shift()
        }
      } catch (e2) {
        deps.showToast(`Error venta: ${e2 && (e2 as Error).message ? (e2 as Error).message : String(e2)}. No se pudo guardar`)
        queue.shift()
      }
    }
  }
  processingRef.current = false
}
