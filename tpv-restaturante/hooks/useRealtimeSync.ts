'use client'

import { useEffect, useRef } from 'react'
import { connectRealtime, disconnectRealtime, applyFloorDiff, type FloorUpdatePayload, type SyncFloor } from '../lib/realtime'
import { setLastFloor } from '../lib/api'
import { mergeLocalClock } from '../lib/floor-vc'

import type { Floor, Sale } from '../domain/types'

interface UseRealtimeSyncProps {
  tenantId: string
  setFloor: (f: Floor | ((prev: Floor | null) => Floor | null)) => void
  setSales: (s: Sale[]) => void
  onReadyNotification: (payload: unknown) => void
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isUnknownArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function isFloor(v: unknown): v is SyncFloor {
  return isRecord(v) && isUnknownArray(v.tables) && isRecord(v.orders)
}

function isSale(v: unknown): v is Sale {
  return isRecord(v) && typeof v.id === 'string'
}

function isVectorClock(v: unknown): v is Record<string, number> {
  return isRecord(v) && Object.values(v).every(x => typeof x === 'number')
}

export function useRealtimeSync({ tenantId, setFloor, setSales, onReadyNotification }: UseRealtimeSyncProps) {
  const floorHashRef = useRef<string>('')
  const salesHashRef = useRef<string>('')

  useEffect(() => {
    const ch = connectRealtime(tenantId)
    if (ch) {
      ch.on('broadcast', { event: 'floor:updated' }, ({ payload }: { payload: FloorUpdatePayload }) => {
        setFloor((prevFloor: Floor | null) => {
          const nextFloor = applyFloorDiff(prevFloor, payload)
          if (nextFloor) {
            mergeLocalClock(nextFloor.vectorClock)
            setLastFloor(nextFloor)
          }
          return nextFloor
        })
      })
      ch.on('broadcast', { event: 'ready:notification' }, ({ payload }: { payload: unknown }) => {
        onReadyNotification(payload)
      })
    }
    const floorController = new AbortController()
    const iv = setInterval(async () => {
      try {
        const res = await fetch('/api/floor', { signal: floorController.signal })
        if (!res.ok) return
        const data: unknown = await res.json()
        if (!isFloor(data)) return
        const vc: unknown = data.vectorClock
        if (isVectorClock(vc)) mergeLocalClock(vc)
        const h = JSON.stringify(data)
        if (h !== floorHashRef.current) { floorHashRef.current = h; setFloor(data) }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }, 10000)
    const salesController = new AbortController()
    const ivSales = setInterval(async () => {
      try {
        const res = await fetch('/api/sales', { signal: salesController.signal })
        if (!res.ok) return
        const data: unknown = await res.json()
        const list: unknown[] = isUnknownArray(data) ? data : []
        const h = JSON.stringify(list)
        if (h !== salesHashRef.current) { salesHashRef.current = h; setSales(list.filter((s): s is Sale => isSale(s))) }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }, 15000)
    return () => { disconnectRealtime(); clearInterval(iv); clearInterval(ivSales); floorController.abort(); salesController.abort() }
  }, [tenantId, onReadyNotification, setFloor, setSales])
}
