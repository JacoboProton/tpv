import type { CurrentUser } from '@/domain/types'

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
  if ((window as any).__keepaliveCleanup) (window as any).__keepaliveCleanup()
  try { localStorage.removeItem('tpv:current_user'); (window as any).__employeeRole = ''; (window as any).__employeeId = ''; } catch {}
}
