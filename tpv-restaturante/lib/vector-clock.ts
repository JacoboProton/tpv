export type VectorClock = Record<string, number>

export function incrementClock(vc: VectorClock, deviceId: string): VectorClock {
  return { ...vc, [deviceId]: (vc[deviceId] || 0) + 1 }
}

export function mergeClocks(a: VectorClock, b: VectorClock): VectorClock {
  const out: VectorClock = { ...a }
  for (const [d, c] of Object.entries(b)) {
    out[d] = Math.max(out[d] || 0, c)
  }
  return out
}

export type ClockOrder = 'a-dominates' | 'b-dominates' | 'concurrent' | 'equal'

export function compareClocks(a: VectorClock, b: VectorClock): ClockOrder {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])
  let aGreater = false
  let bGreater = false
  for (const k of allKeys) {
    const av = a[k] || 0
    const bv = b[k] || 0
    if (av > bv) aGreater = true
    if (bv > av) bGreater = true
  }
  if (aGreater && bGreater) return 'concurrent'
  if (aGreater) return 'a-dominates'
  if (bGreater) return 'b-dominates'
  return 'equal'
}
