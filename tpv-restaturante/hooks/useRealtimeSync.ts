'use client'

import { useEffect, useRef } from 'react'
import { connectRealtime, disconnectRealtime, applyFloorDiff } from '../lib/realtime'
import { setLastFloor } from '../lib/api'
import { mergeLocalClock } from '../lib/floor-vc'

import type { Floor, Sale } from '../domain/types'

interface UseRealtimeSyncProps {
  tenantId: string
  setFloor: (f: any) => void
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
        setFloor((prevFloor: any) => {
          const nextFloor = applyFloorDiff(prevFloor, payload);
          if (nextFloor) {
            mergeLocalClock(nextFloor.vectorClock);
            setLastFloor(nextFloor as unknown as Record<string, unknown>);
          }
          return nextFloor;
        });
      })
      ch.on('broadcast', { event: 'ready:notification' }, ({ payload }) => {
        onReadyNotification(payload)
      })
    }
    const floorController = new AbortController()
    const iv = setInterval(async () => {
      try {
        const res = await fetch('/api/floor', { signal: floorController.signal })
        if (!res.ok) return
        const data = await res.json()
        if (!data) return
        mergeLocalClock((data as { vectorClock?: Record<string, number> }).vectorClock)
        const h = JSON.stringify(data)
        if (h !== floorHashRef.current) { floorHashRef.current = h; setFloor(data as Floor) }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
      }
    }, 10000)
    const salesController = new AbortController()
    const ivSales = setInterval(async () => {
      try {
        const res = await fetch('/api/sales', { signal: salesController.signal })
        if (!res.ok) return
        const data = await res.json()
        if (!Array.isArray(data)) return
        const h = JSON.stringify(data)
        if (h !== salesHashRef.current) { salesHashRef.current = h; setSales(data as Sale[]) }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
      }
    }, 15000)
    return () => { disconnectRealtime(); clearInterval(iv); clearInterval(ivSales); floorController.abort(); salesController.abort() }
  }, [tenantId, onReadyNotification, setFloor, setSales])
}
