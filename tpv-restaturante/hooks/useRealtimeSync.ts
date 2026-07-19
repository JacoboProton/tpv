'use client'

import { useEffect, useRef } from 'react'
import { connectRealtime, disconnectRealtime } from '../lib/realtime'
import { setLastFloor } from '../lib/api'

interface UseRealtimeSyncProps {
  tenantId: string
  setFloor: (f: any) => void
  setSales: (s: any[]) => void
  onReadyNotification: (payload: any) => void
}

export function useRealtimeSync({ tenantId, setFloor, setSales, onReadyNotification }: UseRealtimeSyncProps) {
  const floorHashRef = useRef<string>('')
  const salesHashRef = useRef<string>('')

  useEffect(() => {
    const ch = connectRealtime(tenantId)
    if (ch) {
      ch.on('broadcast', { event: 'floor:updated' }, ({ payload }) => {
        setFloor(payload.floor)
        setLastFloor(payload.floor)
      })
      ch.on('broadcast', { event: 'ready:notification' }, ({ payload }) => {
        onReadyNotification(payload)
      })
    }
    const iv = setInterval(async () => {
      try {
        const data = await (await fetch('/api/floor')).json()
        if (!data) return
        const h = JSON.stringify(data)
        if (h !== floorHashRef.current) { floorHashRef.current = h; setFloor(data) }
      } catch {}
    }, 10000)
    const ivSales = setInterval(async () => {
      try {
        const data = await (await fetch('/api/sales')).json()
        if (!data) return
        const h = JSON.stringify(data)
        if (h !== salesHashRef.current) { salesHashRef.current = h; setSales(data as any[]) }
      } catch {}
    }, 15000)
    return () => { disconnectRealtime(); clearInterval(iv); clearInterval(ivSales) }
  }, [tenantId, onReadyNotification, setFloor, setSales])
}
