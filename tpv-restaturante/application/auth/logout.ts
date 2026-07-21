export function logoutUser(currentUser: any | null, deps: {
  logoutApi: (id: string) => Promise<any>
  turnsApi: (body: any) => void
}) {
  if (currentUser) {
    const body = { employeeId: currentUser.id, employeeName: currentUser.name, action: 'salida', turnDate: new Date().toISOString().slice(0, 10) }
    deps.turnsApi(body)
    deps.logoutApi(currentUser.id).catch(() => {})
  }
  if ((window as any).__keepaliveCleanup) (window as any).__keepaliveCleanup()
  try { localStorage.removeItem('tpv:current_user'); (window as any).__employeeRole = ''; (window as any).__employeeId = ''; } catch {}
}
