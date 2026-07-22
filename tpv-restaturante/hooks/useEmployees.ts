'use client'

import { useState, useCallback } from 'react'
import type { Employee, Floor, CurrentUser } from '../domain/types'
import { saveEmployees } from '../lib/api'
import { sessionLogin, sessionKeepalive, sessionLogout, startKeepalive } from '../lib/session'
import { enqueueMutation } from '../lib/offline'
import { clone } from '../components/constants'
import { createEmployee, canDeleteEmployee, buildTrainingFloor } from '../domain/employees/employee-operations'
import { executeLogin as executeLoginOp, tryRestoreSession as tryRestoreSessionOp } from '../application/auth/login'
import { logoutUser } from '../application/auth/logout'
import { handleClockinAction as handleClockinActionOp, loadClockinSummary as loadClockinSummaryOp } from '../application/auth/clockin'

interface UseEmployeesProps {
  employees: Employee[]
  setEmployees: (e: any) => void
  showToast: (msg: string) => void
  floor: Floor
  setFloor: (f: any) => void
}

export function useEmployees({
  employees, setEmployees,
  showToast,
  floor, setFloor,
}: UseEmployeesProps) {

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loginSelected, setLoginSelected] = useState<any>(null)
  const [pinInput, setPinInput] = useState<string>('')
  const [trainingMode, setTrainingMode] = useState(false)
  const [savedFloor, setSavedFloor] = useState<Floor | null>(null)
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

  const addEmployee = useCallback((emp: Partial<Employee>) => {
    persistEmployees([...employees, createEmployee(emp)])
  }, [employees, persistEmployees])

  const updateEmployeeField = useCallback((id: string, f: string, value: any) => {
    persistEmployees(employees.map((e: Employee) => e.id === id ? { ...e, [f]: value } : e))
  }, [employees, persistEmployees])

  const deleteEmployee = useCallback((id: string) => {
    const result = canDeleteEmployee(employees, id)
    if (!result.allowed) { showToast(result.error!); return }
    persistEmployees(employees.filter((e: Employee) => e.id !== id))
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
      setFloor(buildTrainingFloor(floor))
      setTrainingMode(true)
      showToast('🎓 Modo formación activado — los tickets no afectan a facturación real')
    }
  }, [trainingMode, savedFloor, floor, setFloor, showToast])

  const logout = useCallback(() => {
    logoutUser(currentUser, {
      logoutApi: (id) => sessionLogout(id),
      turnsApi: (body) => fetch('/api/turns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {}),
    })
    setCurrentUser(null)
    setLoginSelected(null)
    setPinInput('')
  }, [currentUser])

  const executeLogin = useCallback(async (pin: string) => {
    const emp = await executeLoginOp(pin, {
      fetchVerify: (p, hash) => fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin: p, pinHash: hash }),
      }),
      sessionLogin,
      startKeepalive,
      logout,
      showToast,
      setPinInput,
    })
    if (emp) {
      setCurrentUser(emp)
      try { localStorage.setItem('tpv:current_user', emp.id); (window as any).__employeeRole = emp.role; (window as any).__employeeId = emp.id; } catch {}
      setLoginSelected(null)
    }
  }, [showToast, logout])

  const pressDigit = useCallback(async (d: string) => {
    setPinInput(prev => {
      if (prev.length >= 4) return prev
      const next = prev + d
      if (next.length === 4) executeLogin(next)
      return next
    })
  }, [executeLogin])

  const deleteDigit = useCallback(() => {
    setPinInput(p => p.slice(0, -1))
  }, [])

  const clockDeps = {
    fetchSummary: (employeeId: string, date: string) =>
      fetch(`/api/clockin?employeeId=${employeeId}&date=${date}`).then(r => r.ok ? r.json() : Promise.reject()),
    fetchClockin: (body: any) => fetch('/api/clockin', { method: 'POST', body: JSON.stringify(body) }),
    showToast,
    setClockinSummary,
    setClockinLoading,
  }

  const loadClockinSummary = useCallback(async () => {
    loadClockinSummaryOp(currentUser, clockDeps)
  }, [currentUser, clockDeps])

  const handleClockinAction = useCallback(async (action: string) => {
    handleClockinActionOp(currentUser, action, clockDeps)
  }, [currentUser, clockDeps])

  const tryRestoreSession = useCallback(async (emps: Employee[]) => {
    return tryRestoreSessionOp(emps, {
      sessionKeepalive,
      startKeepalive,
      logout,
      showToast,
      setCurrentUser,
      currentUser,
    })
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
