'use client'

import { useState, useEffect, useCallback } from 'react'
import { onNetworkChange, getMutations } from '../lib/offline'

export function useOfflineSync() {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' && !navigator.onLine
  )
  const [pendingMutations, setPendingMutations] = useState(0)

  const processMutations = useCallback(async () => {
    const q = getMutations()
    if (q.length === 0) return
    const now = Date.now()
    const MAX_AGE = 24 * 60 * 60 * 1000
    const remaining = []
    for (const m of q) {
      if (now - m.createdAt > MAX_AGE) continue
      try {
        const h: Record<string, string> = { 'Content-Type': 'application/json' }
        if (typeof window !== 'undefined') {
          if (window.__employeeId) h['x-employee-id'] = window.__employeeId
          if (window.__employeeRole) h['x-employee-role'] = window.__employeeRole
          const did = localStorage.getItem('tpv:device_id')
          if (did) h['x-device-id'] = did
        }
        const res = await fetch(m.key, { method: m.method || 'PUT', headers: h, body: m.payload as string })
        if (res.ok) continue
      } catch {}
      remaining.push(m)
    }
    localStorage.setItem('tpv:mutations', JSON.stringify(remaining))
    setPendingMutations(remaining.length)
  }, [])

  useEffect(() => {
    const unsub = onNetworkChange(online => {
      setIsOffline(!online)
      if (online) processMutations()
    })
    const interval = setInterval(() => {
      const q = getMutations()
      setPendingMutations(q.length)
      if (q.length > 0 && navigator.onLine) processMutations()
    }, 10000)
    return () => { unsub(); clearInterval(interval) }
  }, [processMutations])

  return { isOffline, pendingMutations }
}
