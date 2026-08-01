'use client'

import { useEffect } from 'react'

import type { QrCall } from '../domain/types'

export function useQrPolling(setQrCalls: (c: QrCall[]) => void) {
  useEffect(() => {
    async function pollCalls() {
      try {
        const r = await fetch('/api/qr-calls')
        if (r.ok) setQrCalls(await r.json())
      } catch {}
    }
    pollCalls()
    const interval = setInterval(pollCalls, 15000)
    return () => clearInterval(interval)
  }, [setQrCalls])
}
