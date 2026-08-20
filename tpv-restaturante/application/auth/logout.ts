import type { CurrentUser } from '@tpv/core'

interface KeepaliveGlobals {
  __keepaliveCleanup?: () => void
  __employeeRole?: string
  __employeeId?: string
}

declare global {
  interface Window {
    __keepaliveCleanup: (() => void) | undefined
    __employeeRole?: string
    __employeeId?: string
  }
}

function g(): KeepaliveGlobals {
  return window
}

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
  g().__keepaliveCleanup?.()
  try { localStorage.removeItem('tpv:current_user'); g().__employeeRole = ''; g().__employeeId = ''; } catch {}
}
