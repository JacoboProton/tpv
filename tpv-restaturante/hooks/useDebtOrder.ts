'use client'

import { useEffect } from 'react'
import type { Floor, Sale, Table, CurrentUser } from '../domain/types'
import { enqueueMutation } from '../lib/offline'
import { createDebtOrder } from '../domain/payments/debt'

interface UseDebtOrderProps {
  selectedTable: Table | null
  selectedTableId: string | null
  currentUser: CurrentUser | null
  sales: Sale[]
  floor: Floor
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
      .filter((s: Sale) => s.tableId === selectedTableId && s.isFiado)
      .sort((a, b) => String(b.closedAt).localeCompare(String(a.closedAt)))[0]
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
