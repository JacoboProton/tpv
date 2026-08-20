"use client"

import { useState, useCallback, useRef } from 'react'
import type { Sale } from '../domain/types'
import { addSale } from '../lib/api'
import { cacheSet, enqueueMutation } from '../lib/offline'
import { processSalesQueue } from '../application/sales/sales-queue'

interface UseSalesQueueProps {
  setSales: (updater: (prev: Sale[]) => Sale[]) => void
  showToast: (msg: string) => void
}

export function useSalesQueue({ setSales, showToast }: UseSalesQueueProps) {
  const [queue, setQueue] = useState<Sale[]>([])
  const queueRef = useRef<Sale[]>([])
  const processingRef = useRef(false)

  const enqueue = useCallback((sale: Sale) => {
    queueRef.current = [...queueRef.current, sale]
    setQueue([...queueRef.current])
  }, [])

  const addSaleTyped = useCallback(async (sale: Sale): Promise<{ ok: boolean; ticketNumber?: string }> => {
    const res = await addSale(sale)
    if (res && typeof res === 'object') {
      const rec = res as { ok?: boolean; ticketNumber?: string }
      return { ok: rec.ok === true, ticketNumber: rec.ticketNumber }
    }
    return { ok: false }
  }, [])

  const flush = useCallback(async () => {
    await processSalesQueue(queueRef.current, processingRef, {
      addSale: addSaleTyped,
      setSales,
      cacheSet,
      showToast,
      persistSale: (sale) => {
        enqueueMutation({
          key: '/api/sales',
          method: 'POST',
          payload: sale,
          idempotencyKey: sale.id ? `sale:${sale.id}` : undefined,
        })
      },
    })
    setQueue([...queueRef.current])
  }, [setSales, showToast, addSaleTyped])

  const pendingCount = queue.length

  return { queue, enqueue, flush, pendingCount }
}