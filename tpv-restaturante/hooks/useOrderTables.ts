"use client"

import { useCallback } from 'react'
import { saveCancelledOrder } from '../lib/api'
import type { Floor, CurrentUser } from '../domain/types'
import { moveTableOrder, mergeTables as mergeTableOrders, reopenOrder as reopenTableOrder } from '../domain/tables/table-operations'
import { cancelTable as cancelTableOp, voidTable as voidTableOp } from '../application/CancelTable/cancel-table'
import { toggleCuentaStatus } from '../application/TableStatus/toggle-table-status'

export function useOrderTables(
  floor: Floor,
  selectedTableId: string | null,
  activeTicketId: string | null,
  currentUser: CurrentUser | null,
  persistFloor: (next: Floor) => Promise<void>,
  setSelectedTableId: (v: string | null) => void,
  setActiveTicketId: (v: string | null) => void,
  showToast: (msg: string) => void,
) {
  const cancelTable = useCallback(() => {
    if (!selectedTableId) return
    const table = floor?.tables?.find((t: any) => t.id === selectedTableId)
    if (!table) return
    const result = cancelTableOp(floor, selectedTableId, currentUser?.name)
    for (const c of result.cancelled) {
      saveCancelledOrder(c).catch(() => {})
    }
    persistFloor(result.floor)
    setSelectedTableId(null)
    showToast(`${table.name} cancelada y liberada`)
  }, [floor, selectedTableId, currentUser, persistFloor, setSelectedTableId, showToast])

  const voidTable = useCallback((reason: string = '') => {
    if (!selectedTableId) return
    const table = floor?.tables?.find((t: any) => t.id === selectedTableId)
    if (!table) return
    const result = voidTableOp(floor, selectedTableId, reason, currentUser?.name)
    for (const c of result.cancelled) {
      saveCancelledOrder(c).catch(() => {})
    }
    persistFloor(result.floor)
    setSelectedTableId(null)
    setActiveTicketId(null)
    showToast(`${table.name} liberada`)
  }, [floor, selectedTableId, currentUser, persistFloor, setSelectedTableId, setActiveTicketId, showToast])

  const moveTable = useCallback((tableId: string, destTableId: string) => {
    if (tableId === destTableId) { showToast('No puedes mover una mesa sobre sí misma'); return }
    const src = floor?.tables?.find((t: any) => t.id === tableId)
    if (!src?.orderId) { showToast('La mesa origen no tiene pedido'); return }
    const next = moveTableOrder(floor, tableId, destTableId)
    if (next === floor) return
    const dst = next?.tables?.find((t: any) => t.id === destTableId)
    persistFloor(next)
    setSelectedTableId(destTableId)
    showToast(`Pedido movido a ${dst?.name}`)
  }, [floor, persistFloor, setSelectedTableId, showToast])

  const mergeTables = useCallback((tableId: string, sourceTableIds: string[]) => {
    const next = mergeTableOrders(floor, tableId, sourceTableIds, currentUser?.name)
    if (next === floor) return
    const dst = next?.tables?.find((t: any) => t.id === tableId)
    persistFloor(next)
    showToast(`Pedidos fusionados en ${dst?.name}`)
  }, [floor, currentUser, persistFloor, showToast])

  const reopenOrder = useCallback((tableId: string, historyEntry: any) => {
    const result = reopenTableOrder(floor, tableId, historyEntry)
    if (!result.orderId) return
    persistFloor(result.floor)
    setActiveTicketId(result.orderId)
    showToast('Pedido reabierto')
  }, [floor, persistFloor, setActiveTicketId, showToast])

  const toggleCuenta = useCallback(() => {
    if (!selectedTableId) return
    const next = toggleCuentaStatus(floor, selectedTableId)
    if (next) persistFloor(next)
  }, [floor, selectedTableId, persistFloor])

  return {
    cancelTable, voidTable, moveTable, mergeTables, reopenOrder, toggleCuenta,
  }
}
