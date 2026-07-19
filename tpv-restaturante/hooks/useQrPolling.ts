'use client'

import { useEffect } from 'react'

export function useQrPolling(setQrCalls: (c: any[]) => void) {
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
