'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { onNetworkChange, getMutations, getDueMutations, updateMutation, removeMutation, computeBackoff, MAX_ATTEMPTS, validateMutationPayload } from '../lib/offline'

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

function isRetryableStatus(status: number): boolean {
  return TRANSIENT_STATUS.has(status)
}

function isTransientError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && /network|fetch|load failed|Failed to fetch/i.test(err.message))
}

function buildHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    if (window.__employeeId) h['x-employee-id'] = window.__employeeId
    if (window.__employeeRole) h['x-employee-role'] = window.__employeeRole
    const did = localStorage.getItem('tpv:device_id')
    if (did) h['x-device-id'] = did
  }
  return h
}

export function useOfflineSync() {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' && !navigator.onLine
  )
  const [pendingMutations, setPendingMutations] = useState(0)
  const processingRef = useRef(false)

  const processMutations = useCallback(async () => {
    if (processingRef.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    processingRef.current = true
    try {
      const due = getDueMutations()
      if (due.length === 0) {
        setPendingMutations(getMutations().length)
        return
      }
      for (const m of due) {
        const validation = validateMutationPayload(m.key, m.payload)
        if (!validation.ok) {
          removeMutation(m.id)
          continue
        }
        try {
          const h = buildHeaders()
          h['x-idempotency-key'] = m.idempotencyKey
          const res = await fetch(m.key, { method: m.method, headers: h, body: JSON.stringify(m.payload) })
          if (res.ok) {
            removeMutation(m.id)
            continue
          }
          if (isRetryableStatus(res.status)) {
            const nextAttempts = m.attempts + 1
            if (nextAttempts >= MAX_ATTEMPTS) {
              removeMutation(m.id)
              continue
            }
            updateMutation(m.id, {
              attempts: nextAttempts,
              nextRetryAt: Date.now() + computeBackoff(nextAttempts),
              lastError: `HTTP ${res.status}`,
            })
          } else if (res.status === 409) {
            // Conflict: otro dispositivo ganó LWW. Descartar y dejar que el
            // poll de realtime re-sincronice el floor.
            removeMutation(m.id)
          } else {
            // 4xx permanente — no reintentar
            removeMutation(m.id)
          }
        } catch (err) {
          if (!isTransientError(err)) {
            removeMutation(m.id)
            continue
          }
          const nextAttempts = m.attempts + 1
          if (nextAttempts >= MAX_ATTEMPTS) {
            removeMutation(m.id)
            continue
          }
          updateMutation(m.id, {
            attempts: nextAttempts,
            nextRetryAt: Date.now() + computeBackoff(nextAttempts),
            lastError: err instanceof Error ? err.message : String(err),
          })
        }
      }
    } finally {
      processingRef.current = false
      setPendingMutations(getMutations().length)
    }
  }, [])

  useEffect(() => {
    const unsub = onNetworkChange(online => {
      setIsOffline(!online)
      if (online) processMutations()
    })
    const interval = setInterval(() => {
      setPendingMutations(getMutations().length)
      if (navigator.onLine) processMutations()
    }, 5000)
    return () => { unsub(); clearInterval(interval) }
  }, [processMutations])

  return { isOffline, pendingMutations }
}
