"use client"

import { useCallback } from 'react'
import type { Floor, CurrentUser } from '../domain/types'
import { createTicket, deleteTicket, renameTicket as renameTicketOp, linkCustomer as linkCustomerOp, unlinkCustomer as unlinkCustomerOp } from '../domain/orders/multi-ticket'

export function useOrderTickets(
  floor: Floor,
  persistFloor: (next: Floor) => Promise<void>,
  setActiveTicketId: (v: string | null) => void,
  showToast: (msg: string) => void,
  currentUser: CurrentUser | null,
) {
  const createNewTicket = useCallback((tableId: string) => {
    const result = createTicket(floor, tableId, currentUser?.name)
    if (!result.orderId) return
    persistFloor(result.floor)
    setActiveTicketId(result.orderId)
    showToast(`Nuevo ticket #${result.ticketNum} creado`)
  }, [floor, currentUser, persistFloor, setActiveTicketId, showToast])

  const switchTicket = useCallback((_tableId: string, orderId: string) => {
    setActiveTicketId(orderId)
  }, [setActiveTicketId])

  const deleteEmptyTicket = useCallback((tableId: string, orderId: string) => {
    const result = deleteTicket(floor, tableId, orderId)
    if (result.activeOrderId === null) return
    persistFloor(result.floor)
    setActiveTicketId(result.activeOrderId)
    showToast('Ticket vacío eliminado')
  }, [floor, persistFloor, setActiveTicketId, showToast])

  const renameTicket = useCallback((_tableId: string, orderId: string, label: string) => {
    persistFloor(renameTicketOp(floor, orderId, label))
  }, [floor, persistFloor])

  const linkCustomer = useCallback((orderId: string, customer: any) => {
    persistFloor(linkCustomerOp(floor, orderId, customer))
  }, [floor, persistFloor])

  const unlinkCustomer = useCallback((orderId: string) => {
    persistFloor(unlinkCustomerOp(floor, orderId))
  }, [floor, persistFloor])

  return {
    createNewTicket, switchTicket, deleteEmptyTicket,
    renameTicket, linkCustomer, unlinkCustomer,
  }
}
