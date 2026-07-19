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
        const apiKey = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY
          ? process.env.NEXT_PUBLIC_TPV_API_KEY
          : (typeof window !== 'undefined' && window.__TPV_API_KEY) || ''
        if (apiKey) h['x-tpv-key'] = apiKey
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
