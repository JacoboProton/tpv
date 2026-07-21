import { sha256 } from '@/lib/crypto'

export interface LoginDeps {
  fetchVerify: (pin: string, pinHash: string) => Promise<Response>
  sessionLogin: (id: string, role: string, force?: boolean) => Promise<any>
  startKeepalive: (id: string, onConflict: () => void) => (() => void) | undefined
  logout: () => void
  showToast: (msg: string) => void
  setPinInput: (v: string) => void
}

export async function executeLogin(pin: string, deps: LoginDeps): Promise<any | null> {
  const { fetchVerify, showToast, setPinInput } = deps
  try {
    const res = await fetchVerify(pin, await sha256(pin))
    if (!res.ok) { showToast('PIN incorrecto'); setPinInput(''); return null }
    const emp = await res.json()
    if (!emp || !emp.id) { showToast('PIN incorrecto'); setPinInput(''); return null }

    if (emp.role !== 'admin') {
      const sessionRes: any = await deps.sessionLogin(emp.id, emp.role)
      if (sessionRes.conflict) {
        const forceLogin = window.confirm(`${emp.name} ya está conectado en otro terminal. ¿Cerrar esa sesión y continuar aquí?`)
        if (!forceLogin) { setPinInput(''); return null }
        await deps.sessionLogin(emp.id, emp.role, true)
      }
    } else {
      deps.sessionLogin(emp.id, emp.role).catch(() => {})
    }

    if ((window as any).__keepaliveCleanup) (window as any).__keepaliveCleanup()

    setPinInput('')

    ;(window as any).__keepaliveCleanup = deps.startKeepalive(emp.id, () => {
      deps.showToast('Sesión cerrada en otro terminal')
      deps.logout()
    })

    return emp
  } catch {
    showToast('Error de conexión')
    setPinInput('')
    return null
  }
}

export interface RestoreSessionDeps {
  sessionKeepalive: (id: string) => Promise<any>
  startKeepalive: (id: string, onConflict: () => void) => (() => void) | undefined
  logout: () => void
  showToast: (msg: string) => void
  setCurrentUser: (u: any) => void
  currentUser: any
}

export async function tryRestoreSession(
  emps: any[],
  deps: RestoreSessionDeps,
): Promise<any | null> {
  const storedUserId = localStorage.getItem('tpv:current_user')
  if (!storedUserId || deps.currentUser) return null

  const emp = emps.find((e: any) => e.id === storedUserId)
  if (!emp) { localStorage.removeItem('tpv:current_user'); return null }

  try {
    const data: any = await deps.sessionKeepalive(emp.id)
    if (data.ok) {
      deps.setCurrentUser(emp)
      try { (window as any).__employeeRole = emp.role; (window as any).__employeeId = emp.id; } catch {}
      ;(window as any).__keepaliveCleanup = deps.startKeepalive(emp.id, () => {
        deps.showToast('Sesión cerrada en otro terminal')
        deps.logout()
      })
      return emp
    } else {
      localStorage.removeItem('tpv:current_user')
    }
  } catch {
    localStorage.removeItem('tpv:current_user')
  }
  return null
}
