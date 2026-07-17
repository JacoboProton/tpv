'use client'

import { useState, useCallback } from 'react'
import { saveEmployees } from '../lib/api'
import { sessionLogin, sessionKeepalive, sessionLogout, startKeepalive } from '../lib/session'
import { enqueueMutation } from '../lib/offline'
import { clone } from '../components/constants'

interface UseEmployeesProps {
  employees: any[]
  setEmployees: (e: any[]) => void
  showToast: (msg: string) => void
  floor: any
  setFloor: (f: any) => void
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b: any) => b.toString(16).padStart(2, '0')).join('')
}

export function useEmployees({
  employees, setEmployees,
  showToast,
  floor, setFloor,
}: UseEmployeesProps) {

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loginSelected, setLoginSelected] = useState<any>(null)
  const [pinInput, setPinInput] = useState<string>('')
  const [trainingMode, setTrainingMode] = useState(false)
  const [savedFloor, setSavedFloor] = useState<any>(null)
  const [showClockinModal, setShowClockinModal] = useState(false)
  const [clockinSummary, setClockinSummary] = useState<any>(null)
  const [clockinLoading, setClockinLoading] = useState(false)

  const persistEmployees = useCallback(async (next: any) => {
    setEmployees(next)
    try { await saveEmployees(next) }
    catch {
      enqueueMutation('/api/employees', JSON.stringify(next))
      showToast('Sin conexión — el equipo se guardará cuando vuelva la red')
    }
  }, [setEmployees, showToast])

  const addEmployee = useCallback((emp: any) => {
    persistEmployees([...employees, { id: 'e_' + Date.now(), ...emp }])
  }, [employees, persistEmployees])

  const updateEmployeeField = useCallback((id: string, f: string, value: any) => {
    persistEmployees(employees.map((e: any) => e.id === id ? { ...e, [f]: value } : e))
  }, [employees, persistEmployees])

  const deleteEmployee = useCallback((id: string) => {
    const admins = employees.filter((e: any) => e.role === 'admin')
    const target = employees.find((e: any) => e.id === id)
    if (target?.role === 'admin' && admins.length <= 1) { showToast('Tiene que quedar al menos un administrador'); return }
    persistEmployees(employees.filter((e: any) => e.id !== id))
  }, [employees, persistEmployees, showToast])

  const toggleTraining = useCallback(() => {
    if (trainingMode) {
      if (savedFloor) {
        setFloor(savedFloor)
        setSavedFloor(null)
      }
      setTrainingMode(false)
      showToast('Modo formación desactivado')
    } else {
      setSavedFloor(clone(floor))
      const tables = (floor?.tables || []).map((t: any) => ({
        ...t, orderId: null, orderIds: [], status: 'libre', reserved: null, isFiado: false,
      }))
      const training = { ...clone(floor), tables, orders: {}, history: {} }
      setFloor(training)
      setTrainingMode(true)
      showToast('🎓 Modo formación activado — los tickets no afectan a facturación real')
    }
  }, [trainingMode, savedFloor, floor, setFloor, showToast])

  const logout = useCallback(() => {
    if (currentUser) {
      const body = { employeeId: currentUser.id, employeeName: currentUser.name, action: 'salida', turnDate: new Date().toISOString().slice(0, 10) }
      fetch('/api/turns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
      sessionLogout(currentUser.id).catch(() => {})
    }
    if (window.__keepaliveCleanup) window.__keepaliveCleanup()
    setCurrentUser(null)
    try { localStorage.removeItem('tpv:current_user'); window.__employeeRole = ''; window.__employeeId = ''; } catch {}
    setLoginSelected(null)
    setPinInput('')
  }, [currentUser])

  const pressDigit = useCallback(async (d: string) => {
    setPinInput(prev => {
      if (prev.length >= 4) return prev
      const next = prev + d
      if (next.length === 4) {
        executeLogin(next)
      }
      return next
    })
  }, [])

  const executeLogin = useCallback(async (pin: string) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin, pinHash: await sha256(pin) }),
      })
      if (!res.ok) { showToast('PIN incorrecto'); setPinInput(''); return }
      const emp = await res.json()
      if (!emp || !emp.id) { showToast('PIN incorrecto'); setPinInput(''); return }

      if (emp.role !== 'admin') {
        const sessionRes: any = await sessionLogin(emp.id, emp.role)
        if (sessionRes.conflict) {
          const forceLogin = window.confirm(`${emp.name} ya está conectado en otro terminal. ¿Cerrar esa sesión y continuar aquí?`)
          if (!forceLogin) { setPinInput(''); return }
          await sessionLogin(emp.id, emp.role, true)
        }
      } else {
        sessionLogin(emp.id, emp.role).catch(() => {})
      }

      if (window.__keepaliveCleanup) window.__keepaliveCleanup()

      setCurrentUser(emp)
      try { localStorage.setItem('tpv:current_user', emp.id); window.__employeeRole = emp.role; window.__employeeId = emp.id; } catch {}
      setLoginSelected(null)
      setPinInput('')

      window.__keepaliveCleanup = startKeepalive(emp.id, () => {
        showToast('Sesión cerrada en otro terminal')
        logout()
      })
    } catch {
      showToast('Error de conexión')
      setPinInput('')
    }
  }, [showToast, logout])

  const deleteDigit = useCallback(() => {
    setPinInput(p => p.slice(0, -1))
  }, [])

  const loadClockinSummary = useCallback(async () => {
    if (!currentUser) return
    setClockinLoading(true)
    try {
      const r = await fetch(`/api/clockin?employeeId=${currentUser.id}&date=${new Date().toISOString().slice(0, 10)}`)
      if (r.ok) {
        const data = await r.json()
        setClockinSummary(data.summary || null)
      }
    } catch {}
    setClockinLoading(false)
  }, [currentUser])

  const handleClockinAction = useCallback(async (action: string) => {
    if (!currentUser) return
    try {
      const r = await fetch('/api/clockin', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          method: 'tpc',
          action,
        }),
      })
      const data = await r.json()
      if (data.ok) {
        showToast(`✅ ${action} registrada`)
        loadClockinSummary()
      } else {
        showToast('❌ ' + (data.error || 'Error'))
      }
    } catch {
      showToast('❌ Error de conexión')
    }
  }, [currentUser, showToast, loadClockinSummary])

  const tryRestoreSession = useCallback(async (emps: any[]) => {
    const storedUserId = localStorage.getItem('tpv:current_user')
    if (!storedUserId || currentUser) return
    const emp = emps.find((e: any) => e.id === storedUserId)
    if (!emp) { localStorage.removeItem('tpv:current_user'); return }
    try {
      const data: any = await sessionKeepalive(emp.id)
      if (data.ok) {
        setCurrentUser(emp)
        try { window.__employeeRole = emp.role; window.__employeeId = emp.id; } catch {}
        window.__keepaliveCleanup = startKeepalive(emp.id, () => {
          showToast('Sesión cerrada en otro terminal')
          logout()
        })
        return emp
      } else {
        localStorage.removeItem('tpv:current_user')
      }
    } catch {
      localStorage.removeItem('tpv:current_user')
    }
  }, [currentUser, showToast, logout])

  return {
    currentUser, setCurrentUser,
    loginSelected, setLoginSelected,
    pinInput, setPinInput,
    trainingMode, setTrainingMode,
    savedFloor, setSavedFloor,
    showClockinModal, setShowClockinModal,
    clockinSummary, setClockinSummary,
    clockinLoading, setClockinLoading,
    persistEmployees,
    addEmployee,
    updateEmployeeField,
    deleteEmployee,
    toggleTraining,
    pressDigit,
    deleteDigit,
    logout,
    loadClockinSummary,
    handleClockinAction,
    tryRestoreSession,
  }
}

declare global {
  interface Window {
    __keepaliveCleanup: (() => void) | undefined
    __employeeRole?: string
    __employeeId?: string
  }
}
