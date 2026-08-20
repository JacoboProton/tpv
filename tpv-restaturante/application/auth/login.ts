import { sha256 } from '@/lib/crypto'
import type { Employee } from '@tpv/core'

interface LoginEmployee extends Employee {
  loginTicket?: string
}

interface KeepaliveWindow {
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

function keepaliveHandle(): KeepaliveWindow {
  return window
}

export interface LoginDeps {
  fetchVerify: (pin: string, pinHash: string) => Promise<Response>
  sessionLogin: (id: string, role: string, force?: boolean, loginTicket?: string) => Promise<{ conflict?: boolean }>
  startKeepalive: (id: string, onConflict: () => void) => (() => void) | undefined
  logout: () => void
  showToast: (msg: string) => void
  setPinInput: (v: string) => void
}

export async function executeLogin(pin: string, deps: LoginDeps): Promise<Employee | null> {
  const { fetchVerify, showToast, setPinInput } = deps
  try {
    const res = await fetchVerify(pin, await sha256(pin))
    if (!res.ok) { showToast('PIN incorrecto'); setPinInput(''); return null }
    const emp = (await res.json()) as LoginEmployee
    if (!emp || !emp.id) { showToast('PIN incorrecto'); setPinInput(''); return null }
    const loginTicket = emp.loginTicket

    if (emp.role !== 'admin') {
      const sessionRes = await deps.sessionLogin(emp.id, emp.role, undefined, loginTicket)
      if (sessionRes.conflict) {
        const forceLogin = window.confirm(`${emp.name} ya está conectado en otro terminal. ¿Cerrar esa sesión y continuar aquí?`)
        if (!forceLogin) { setPinInput(''); return null }
        await deps.sessionLogin(emp.id, emp.role, true, loginTicket)
      }
    } else {
      deps.sessionLogin(emp.id, emp.role, undefined, loginTicket).catch(() => {})
    }

    const w = keepaliveHandle()
    if (w.__keepaliveCleanup) w.__keepaliveCleanup()

    setPinInput('')

    keepaliveHandle().__keepaliveCleanup = deps.startKeepalive(emp.id, () => {
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
  sessionKeepalive: (id: string) => Promise<{ ok?: boolean }>
  startKeepalive: (id: string, onConflict: () => void) => (() => void) | undefined
  logout: () => void
  showToast: (msg: string) => void
  setCurrentUser: (u: Employee) => void
  currentUser: Employee | null
}

export async function tryRestoreSession(
  emps: Employee[],
  deps: RestoreSessionDeps,
): Promise<Employee | null> {
  const storedUserId = localStorage.getItem('tpv:current_user')
  if (!storedUserId || deps.currentUser) return null

  const emp = emps.find((e) => e.id === storedUserId)
  if (!emp) { localStorage.removeItem('tpv:current_user'); return null }

  try {
    const data = await deps.sessionKeepalive(emp.id)
    if (data.ok) {
      deps.setCurrentUser(emp)
      try { const w = keepaliveHandle(); w.__employeeRole = emp.role; w.__employeeId = emp.id; } catch {}
      keepaliveHandle().__keepaliveCleanup = deps.startKeepalive(emp.id, () => {
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
