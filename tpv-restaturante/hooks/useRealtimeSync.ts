'use client'

import { useEffect, useRef } from 'react'
import { connectRealtime, disconnectRealtime } from '../lib/realtime'
import { setLastFloor } from '../lib/api'

import type { Floor, Sale } from '../domain/types'

interface UseRealtimeSyncProps {
  tenantId: string
  setFloor: (f: Floor) => void
  setSales: (s: Sale[]) => void
  onReadyNotification: (payload: unknown) => void
}

export function useRealtimeSync({ tenantId, setFloor, setSales, onReadyNotification }: UseRealtimeSyncProps) {
  const floorHashRef = useRef<string>('')
  const salesHashRef = useRef<string>('')

  useEffect(() => {
    const ch = connectRealtime(tenantId)
    if (ch) {
      ch.on('broadcast', { event: 'floor:updated' }, ({ payload }) => {
        const floorData = payload.floor as Floor
        setFloor(floorData)
        setLastFloor(floorData)
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
        if (h !== floorHashRef.current) { floorHashRef.current = h; setFloor(data as Floor) }
      } catch {}
    }, 10000)
    const ivSales = setInterval(async () => {
      try {
        const res = await fetch('/api/sales')
        if (!res.ok) return
        const data = await res.json()
        if (!Array.isArray(data)) return
        const h = JSON.stringify(data)
        if (h !== salesHashRef.current) { salesHashRef.current = h; setSales(data as Sale[]) }
      } catch {}
    }, 15000)
    return () => { disconnectRealtime(); clearInterval(iv); clearInterval(ivSales) }
  }, [tenantId, onReadyNotification, setFloor, setSales])
}
