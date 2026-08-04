import { incrementClock, mergeClocks, type VectorClock } from './vector-clock'
import { getDeviceId } from './session'

const VC_KEY = 'tpv:floor-vc'
const VC_TS_KEY = 'tpv:floor-updated'

export function getLocalClock(): VectorClock {
  try {
    const raw = localStorage.getItem(VC_KEY)
    return raw ? (JSON.parse(raw) as VectorClock) : {}
  } catch { return {} }
}

export function getLocalUpdatedAt(): number {
  try {
    return Number(localStorage.getItem(VC_TS_KEY) || 0)
  } catch { return 0 }
}

export function advanceLocalClock(): { vectorClock: VectorClock; updatedAt: number } {
  const next = incrementClock(getLocalClock(), getDeviceId())
  const updatedAt = Date.now()
  try {
    localStorage.setItem(VC_KEY, JSON.stringify(next))
    localStorage.setItem(VC_TS_KEY, String(updatedAt))
  } catch { /* quota */ }
  return { vectorClock: next, updatedAt }
}

export function mergeLocalClock(incoming: VectorClock | null | undefined): void {
  if (!incoming || typeof incoming !== 'object') return
  const merged = mergeClocks(getLocalClock(), incoming)
  try { localStorage.setItem(VC_KEY, JSON.stringify(merged)) } catch { /* quota */ }
}
