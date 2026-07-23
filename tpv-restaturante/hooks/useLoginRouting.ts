'use client'

import { useEffect, useRef } from 'react'
import type { CurrentUser } from '../domain/types'

type View = 'salon' | 'comandas' | 'cocina' | 'inventario' | 'almacen' | 'albaranes' | 'informes' | 'empleados' | 'ofertas' | 'combos' | 'menus' | 'carrusel' | 'precios' | 'reparto' | 'pedidos' | 'fiados' | 'gestoria' | 'pairing' | 'audit' | 'turnos' | 'registro-horario' | 'solicitudes' | 'pedidos-compra' | 'reservas' | 'waitlist' | 'onlineorders' | 'buffet' | 'tickets' | 'pagos' | 'kds' | 'barra' | 'carta' | 'produccion' | 'login'

interface UseLoginRoutingProps {
  currentUser: CurrentUser | null
  setCurrentUser: (u: any) => void
  entryPoint: string
  setView: (v: View) => void
  setMenuMode: (m: string) => void
  setSelectedTableId: (id: any) => void
  setAlmacenUbicacion: (u: any) => void
  showToast: (msg: string) => void
}

export function useLoginRouting({
  currentUser, setCurrentUser, entryPoint,
  setView, setMenuMode, setSelectedTableId,
  setAlmacenUbicacion, showToast,
}: UseLoginRoutingProps) {

  const prevUserRef = useRef<CurrentUser | null>(null)

  useEffect(() => {
    if (!currentUser || currentUser === prevUserRef.current) return
    prevUserRef.current = currentUser

    let targetView: View = 'salon'
    if (entryPoint === 'almacen') {
      if (currentUser.role !== 'admin') { setCurrentUser(null); showToast('Solo administradores pueden acceder al almacen'); return }
      targetView = 'almacen'; setAlmacenUbicacion(null)
    } else if (entryPoint === 'caja') {
      if (currentUser.role !== 'admin') { setCurrentUser(null); showToast('Solo administradores pueden acceder a la caja'); return }
      targetView = 'informes'
    } else if (entryPoint === 'config') {
      if (currentUser.role !== 'admin') { setCurrentUser(null); showToast('Solo administradores pueden acceder a configuracion'); return }
      targetView = 'empleados'
    }
    setView(targetView)
    setMenuMode('app')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (typeof window !== 'undefined') {
      if (window.__employeeId) headers['x-employee-id'] = window.__employeeId
      if (window.__employeeRole) headers['x-employee-role'] = window.__employeeRole
      const did = localStorage.getItem('tpv:device_id')
      if (did) headers['x-device-id'] = did
    }
    fetch('/api/access-log', {
      method: 'POST', headers,
      body: JSON.stringify({ employeeId: currentUser.id, employeeName: currentUser.name, role: currentUser.role, entryPoint }),
    }).catch(() => {})
    const body = { employeeId: currentUser.id, employeeName: currentUser.name, action: 'entrada', turnDate: new Date().toISOString().slice(0, 10) }
    fetch('/api/turns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
  }, [currentUser, entryPoint])

  useEffect(() => {
    if (currentUser !== null) return
    if (prevUserRef.current === null) return
    prevUserRef.current = null
    setSelectedTableId(null); setView('salon'); setMenuMode('menu')
  }, [currentUser])
}
