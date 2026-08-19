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

  const flush = useCallback(async () => {
    await processSalesQueue(queueRef.current, processingRef, {
      addSale: addSale as (sale: Sale) => Promise<{ ok: boolean; ticketNumber?: string }>,
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
  }, [setSales, showToast])

  const pendingCount = queue.length

  return { queue, enqueue, flush, pendingCount }
}