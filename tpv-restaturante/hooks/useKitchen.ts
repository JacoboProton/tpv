'use client'

import { useEffect, useRef, useCallback } from 'react'
import { broadcastReadyNotification } from '../lib/realtime'
import { playKitchenAlert, showKitchenNotification, requestNotificationPermission } from '../lib/sound'

interface UseKitchenProps {
  floor: any
  setFloor: (f: any) => void
  persistFloor: (f: any) => void
  catalog: any
  setCatalog: (c: any) => void
  showToast: (msg: string) => void
  handlePrint: () => void
  tenantId: string
}

export function useKitchen({
  floor, setFloor, persistFloor,
  catalog, setCatalog,
  showToast,
  handlePrint,
  tenantId,
}: UseKitchenProps) {

  const prevPendingRef = useRef<number>(0)

  useEffect(() => { requestNotificationPermission() }, [])

  useEffect(() => {
    if (!floor) return
    const pending = (Object.values(floor.orders || {}) as any[]).reduce((sum: any, o: any) =>
      sum + o.items.filter((i: any) => i.sent && !i.ready).length, 0
    )
    if (pending > prevPendingRef.current && prevPendingRef.current > 0) {
      playKitchenAlert()
      showKitchenNotification(pending - prevPendingRef.current)
    }
    prevPendingRef.current = pending
  }, [floor])

  const updateItemState = useCallback((next: any, action: { orderId: string, itemId: string | null, previousState: string | null }) => {
    setFloor(next)
    if (action?.previousState === 'preparing') {
      const order = next.orders?.[action.orderId]
      const item = order?.items?.find((i: any) => i.id === action.itemId)
      const table = next.tables?.find((t: any) => t.id === order?.tableId)
      if (item) broadcastReadyNotification(table?.name || order?.tableId, [item.name], order?.employeeName, tenantId)
    }
    persistFloor(next)
  }, [setFloor, persistFloor, tenantId])

  const advanceOrder = useCallback((next: any) => {
    setFloor(next)
    persistFloor(next)
  }, [setFloor, persistFloor])

  const agotarProducto = useCallback(async (productId: string, agotado: boolean) => {
    const next = { ...catalog, products: (catalog.products as any[]).map((p: any) => p.id === productId ? { ...p, agotado } : p) }
    setCatalog(next as any)
    try { await fetch('/api/catalog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }) } catch {}
  }, [catalog, setCatalog])

  const reprintKitchenTicket = useCallback((_orderId: string) => {
    handlePrint()
  }, [handlePrint])

  const handleReadyNotification = useCallback((payload: { itemNames: string[], tableName: string }) => {
    const items = payload.itemNames.slice(0, 3).join(', ')
    const suffix = payload.itemNames.length > 3 ? ` y ${payload.itemNames.length - 3} más` : ''
    showToast(`🍽️ ${payload.tableName}: ${items}${suffix}`)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍽️ Plato listo', { body: `${payload.tableName}: ${items}${suffix}` })
    }
  }, [showToast])

  return {
    updateItemState,
    advanceOrder,
    agotarProducto,
    reprintKitchenTicket,
    handleReadyNotification,
  }
}
