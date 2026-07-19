'use client'

import { useEffect } from 'react'
import { enqueueMutation } from '../lib/offline'
import { createDebtOrder } from '../domain/payments/debt'

interface UseDebtOrderProps {
  selectedTable: any
  selectedTableId: string | null
  currentUser: any
  sales: any[]
  floor: any
  setFloor: (f: any) => void
  showToast: (msg: string) => void
  debtFloorRef: React.MutableRefObject<any>
}

export function useDebtOrder({
  selectedTable, selectedTableId, currentUser, sales, floor,
  setFloor, showToast, debtFloorRef,
}: UseDebtOrderProps) {
  useEffect(() => {
    if (!selectedTableId || !selectedTable?.isFiado || selectedTable?.orderId || !currentUser) return
    const lastFiadoSale = [...sales]
      .filter((s: any) => s.tableId === selectedTableId && s.isFiado)
      .sort((a: any, b: any) => b.closedAt - a.closedAt)[0]
    if (!lastFiadoSale) return
    debtFloorRef.current = createDebtOrder(floor, selectedTableId, lastFiadoSale)
  }, [selectedTableId, currentUser])

  useEffect(() => {
    if (!debtFloorRef.current) return
    const f = debtFloorRef.current
    debtFloorRef.current = null
    setFloor(f)
    ;(async () => {
      try { await (await fetch('/api/floor', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })).json() }
      catch { enqueueMutation('/api/floor', JSON.stringify(f)); showToast('Sin conexión — la deuda se guardará cuando vuelva la red') }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
