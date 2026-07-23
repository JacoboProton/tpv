import type { CurrentUser } from '../../domain/types'

export interface LogoutDeps {
  logoutApi: (id: string) => Promise<void>
  turnsApi: (body: { employeeId: string; employeeName: string; action: string; turnDate: string }) => void
  keepaliveCleanup?: () => void
  clearSession?: () => void
}

export function logoutUser(
  currentUser: CurrentUser | null,
  deps: LogoutDeps,
) {
  if (currentUser) {
    const body = { employeeId: currentUser.id, employeeName: currentUser.name, action: 'salida' as const, turnDate: new Date().toISOString().slice(0, 10) }
    deps.turnsApi(body)
    deps.logoutApi(currentUser.id).catch(() => {})
  }
  deps.keepaliveCleanup?.()
  deps.clearSession?.()
}
