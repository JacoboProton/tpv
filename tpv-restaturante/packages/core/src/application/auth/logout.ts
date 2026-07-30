import type { CurrentUser } from '../../domain/types'

export function logoutUser(
  currentUser: CurrentUser | null,
  deps: {
    logoutApi: (id: string) => Promise<void>
    turnsApi: (body: { employeeId: string; employeeName: string; action: string; turnDate: string }) => void
  },
) {
  if (currentUser) {
    const body = { employeeId: currentUser.id, employeeName: currentUser.name, action: 'salida' as const, turnDate: new Date().toISOString().slice(0, 10) }
    deps.turnsApi(body)
    deps.logoutApi(currentUser.id).catch(() => {})
  }
  try {
    const w = globalThis as Record<string, unknown>
    if (typeof w.__keepaliveCleanup === 'function') (w.__keepaliveCleanup as () => void)()
    if (typeof w.localStorage !== 'undefined') (w.localStorage as { removeItem: (k: string) => void }).removeItem('tpv:current_user')
    w.__employeeRole = ''
    w.__employeeId = ''
  } catch {}
}
