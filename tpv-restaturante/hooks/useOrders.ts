"use client"

import { useCallback, useRef } from 'react'
import type { Floor, Catalog, Sale, Employee, CurrentUser, Offer, TicketSettings } from '../domain/types'
import type { ModifierData } from '../domain/catalog/modifier-groups'
import { round2 } from '../components/constants'
import { enqueueMutation, cacheSet } from '../lib/offline'
import { saveFloor } from '../infrastructure/database/floor-repository'
import { broadcastFloorUpdate, broadcastReadyNotification } from '../lib/realtime'
import { buildTicketHtml, printTicketHtml } from '../lib/ticket-template'
import { calculateIgic } from '../domain/invoice/invoice'
import { countPendingBar, countPendingCocina } from '@tpv/core'
import { useSalesQueue } from './useSalesQueue'
import { useTableSelection } from './useTableSelection'
import { useModifierSelector } from './useModifierSelector'
import { useOrderItems } from './useOrderItems'
import { useOrderTickets } from './useOrderTickets'
import { useOrderTables } from './useOrderTables'
import { useOrderPayments } from './useOrderPayments'
import { usePersonalDiscount } from './usePersonalDiscount'

export type View = 'salon' | 'comandas' | 'cocina' | 'inventario' | 'almacen' | 'albaranes' | 'informes' | 'empleados' | 'ofertas' | 'combos' | 'menus' | 'carrusel' | 'precios' | 'reparto' | 'pedidos' | 'fiados' | 'gestoria' | 'pairing' | 'audit' | 'turnos' | 'registro-horario' | 'solicitudes' | 'pedidos-compra' | 'reservas' | 'waitlist' | 'onlineorders' | 'buffet' | 'tickets' | 'pagos' | 'kds' | 'barra' | 'carta' | 'produccion' | 'login'

interface UseOrdersProps {
  floor: Floor
  setFloor: (f: Floor) => void
  catalog: Catalog
  setCatalog: (c: Catalog) => void
  sales: Sale[]
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>
  employees: Employee[]
  setEmployees: (e: Employee[]) => void
  currentUser: CurrentUser | null
  tenantId: string
  modifierData: ModifierData
  ticketSettings: TicketSettings
  offers: Offer[]
  trainingMode: boolean
  showToast: (msg: string) => void
}

export function useOrders({
  floor, setFloor, catalog, setCatalog, sales, setSales,
  employees, setEmployees, currentUser, tenantId,
  modifierData,
  ticketSettings, offers, trainingMode, showToast,
}: UseOrdersProps) {

  const { enqueue: enqueueSale, flush: flushSales, pendingCount: pendingSalesCount } = useSalesQueue({ setSales, showToast })

  // ---------- Persistence ----------
  const persistFloor = useCallback(async (next: Floor) => {
    setFloor(next)
    if (trainingMode) return
    try {
      await saveFloor(next)
      broadcastFloorUpdate(next, tenantId)
    } catch {
      enqueueMutation({ key: '/api/floor', method: 'PUT', payload: next, idempotencyKey: `floor:${Date.now()}:${Math.random().toString(36).slice(2, 8)}` })
      showToast('Sin conexión — la sala se guardará cuando vuelva la red')
    }
  }, [setFloor, trainingMode, tenantId, showToast])

  const persistSales = useCallback((next: Sale[]) => {
    setSales(next)
    cacheSet('sales', next)
    const newSale = next[next.length - 1]
    if (newSale) enqueueSale(newSale)
    flushSales()
  }, [setSales, enqueueSale, flushSales])

  // ---------- Sub-hooks ----------
  const tableSelection = useTableSelection(floor)
  const {
    selectedTableId, setSelectedTableId,
    activeTicketId, setActiveTicketId,
    activeCategory, setActiveCategory,
    selectedTable, activeOrderId, selectedOrder,
  } = tableSelection

  const modifierSelector = useModifierSelector()
  const { showModifierSelector, setShowModifierSelector, editingItemModifiers, setEditingItemModifiers } = modifierSelector

  const orderItems = useOrderItems(
    floor, selectedTableId, activeTicketId, catalog, currentUser, modifierData,
    showModifierSelector, editingItemModifiers,
    setShowModifierSelector, setEditingItemModifiers,
    setActiveTicketId, persistFloor, showToast, broadcastReadyNotification, tenantId,
  )

  const orderTickets = useOrderTickets(
    floor, persistFloor, setActiveTicketId, showToast, currentUser,
  )

  const orderTables = useOrderTables(
    floor, selectedTableId, activeTicketId, currentUser,
    persistFloor, setSelectedTableId, setActiveTicketId, showToast,
  )

  const orderPayments = useOrderPayments(
    floor, catalog, offers, sales, modifierData, currentUser,
    trainingMode, selectedTableId, selectedOrder,
    persistFloor, persistSales, setSelectedTableId, setCatalog,
    showToast,
  )

  const personalDiscount = usePersonalDiscount(
    floor, employees, catalog, ticketSettings as Record<string, unknown> | undefined,
    persistFloor, setEmployees, showToast,
  )

  const pendingBarCount = countPendingBar(floor)
  const pendingCocinaCount = countPendingCocina(floor)

  // ---------- Printing ----------
  const handlePrint = useCallback(() => {
    const order = selectedOrder
    if (!order) return
    const items = order.items.filter((i) => i.productId)
    const subtotal = items.reduce((s: number, i) => s + i.price * i.qty, 0)
    const discountAmount = round2(subtotal * (orderPayments.orderDiscount / 100))
    const totalConIgic = subtotal - discountAmount
    const { baseImponible, cuotaIgic } = calculateIgic(totalConIgic)
    const totalWithTip = totalConIgic + orderPayments.tipAmount
    const { restaurantName, companyCif, companyAddress, companyPhone, logoUrl, footerText, ticketWidth } = ticketSettings
    const html = buildTicketHtml({
      items, subtotal, discountAmount, totalConIgic, baseImponible, cuotaIgic,
      tip: orderPayments.tipAmount, tipMethod: orderPayments.tipMethod, totalWithTip,
      restaurantName, companyCif, companyAddress, companyPhone, logoUrl, footerText, ticketWidth,
      tableName: selectedTable?.name || '',
      employeeName: currentUser?.name || '',
      ticketLabel: order.label ? `Comanda ${order.label}` : '',
      ticketNumber: selectedTable?.orderId ? String(selectedTable.orderId).slice(-6).toUpperCase() : '',
      date: new Date().toLocaleString('es-ES'),
      catalog, allergensList: [],
    })
    printTicketHtml(html)
  }, [selectedOrder, orderPayments.orderDiscount, orderPayments.tipAmount, orderPayments.tipMethod, ticketSettings, selectedTable, currentUser, catalog])

  // ---------- Debt order auto-creation ----------
  const debtFloorRef = useRef<Floor | null>(null)

  return {
    selectedTableId, setSelectedTableId,
    activeTicketId, setActiveTicketId,
    activeCategory, setActiveCategory,
    showModifierSelector, setShowModifierSelector,
    editingItemModifiers, setEditingItemModifiers,
    debtFloorRef,
    selectedTable, activeOrderId, selectedOrder,
    pendingBarCount, pendingCocinaCount,
    pendingSalesCount,
    persistFloor, persistSales,
    ...orderItems,
    ...orderTickets,
    ...orderTables,
    ...orderPayments,
    ...personalDiscount,
    handlePrint,
  }
}
