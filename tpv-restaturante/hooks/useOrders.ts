"use client"

import { useState, useMemo, useCallback, useRef } from 'react'
import { clone, round2, euros } from '../components/constants'
import { addSale, saveCancelledOrder, registerVerifactu } from '../lib/api'
import { enqueueMutation, cacheSet } from '../lib/offline'
import { saveCatalog } from '../infrastructure/database/catalog-repository'
import { saveFloor } from '../infrastructure/database/floor-repository'
import { saveStockLog } from '../infrastructure/database/stock-log-repository'
import { saveEmployees } from '../infrastructure/database/employees-repository'
import { broadcastFloorUpdate, broadcastReadyNotification } from '../lib/realtime'
import { printESCPOS, escposOpenDrawer, isPrinterConnected } from '../lib/thermal-printer'
import { buildTicketHtml, printTicketHtml } from '../lib/ticket-template'
import { sha256 } from '../lib/crypto'
import { eventBus } from '../lib/event-bus'
import { calculateOfferDiscount } from '../domain/pricing/offers'
import { calculateOrderTotals } from '../domain/order/order'
import { calculateIgic } from '../domain/invoice/invoice'
import { expandMenu, expandCombo } from '../domain/order/menu-expansion'
import { executeCloseOrder } from '../application/CloseOrder/close-order'
import { buildPayments, isFiado, hasPendingBizum, formatPaymentMethod } from '../domain/payments/payments'
import { closeTableOrders, isDebtPayment as checkDebtPayment } from '../domain/tables/table'
import { deductStock } from '../domain/inventory/stock'

declare const API_KEY: string

export type View = 'salon' | 'comandas' | 'cocina' | 'inventario' | 'almacen' | 'albaranes' | 'informes' | 'empleados' | 'ofertas' | 'combos' | 'menus' | 'carrusel' | 'precios' | 'reparto' | 'pedidos' | 'fiados' | 'gestoria' | 'pairing' | 'audit' | 'turnos' | 'registro-horario' | 'solicitudes' | 'pedidos-compra' | 'reservas' | 'waitlist' | 'onlineorders' | 'buffet' | 'tickets' | 'pagos' | 'kds' | 'barra' | 'carta' | 'produccion' | 'login'

interface UseOrdersProps {
  floor: any
  setFloor: (f: any) => void
  catalog: any
  setCatalog: (c: any) => void
  sales: any[]
  setSales: (s: any) => void
  employees: any[]
  setEmployees: (e: any) => void
  currentUser: any
  tenantId: string
  modifierData: any
  ticketSettings: any
  offers: any[]
  trainingMode: boolean
  showToast: (msg: string) => void
}

export function useOrders({
  floor, setFloor, catalog, setCatalog, sales, setSales,
  employees, setEmployees, currentUser, tenantId,
  modifierData,
  ticketSettings, offers, trainingMode, showToast,
}: UseOrdersProps) {

  // ---------- Selected table state ----------
  const [selectedTableId, setSelectedTableId] = useState<any>(null as any)
  const [activeTicketId, setActiveTicketId] = useState<any>(null as any)
  const [activeCategory, setActiveCategory] = useState<string>('Todos')

  // Payment state
  const [paying, setPaying] = useState<boolean>(false)
  const [paymentSplits, setPaymentSplits] = useState<any[]>([] as any[])
  const [orderDiscount, setOrderDiscount] = useState<number>(0)
  const [tipAmount, setTipAmount] = useState<number>(0)
  const [tipMethod, setTipMethod] = useState<string>('efectivo')
  const [paymentIntentId, setPaymentIntentId] = useState<string>('')
  const [invoiceNif, setInvoiceNif] = useState<string>('')
  const [invoiceName, setInvoiceName] = useState<string>('')
  const [invoiceAddress, setInvoiceAddress] = useState<string>('')
  const [invoiceEmail, setInvoiceEmail] = useState<string>('')

  // Modifier selector state
  const [showModifierSelector, setShowModifierSelector] = useState<any>(null as any)
  const [editingItemModifiers, setEditingItemModifiers] = useState<any>(null as any)

  // Sales queue for offline persistence
  const salesQueue = useRef<any[]>([])
  const salesProcessing = useRef<boolean>(false)

  // ---------- Computed ----------
  const selectedTable = floor ? floor.tables.find((t: any) => t.id === selectedTableId) : null
  const activeOrderId = activeTicketId || selectedTable?.orderIds?.[0] || selectedTable?.orderId
  const selectedOrder = activeOrderId ? floor?.orders?.[activeOrderId] : null

  const orderTotal = selectedOrder ? selectedOrder.items.reduce((s: any, i: any) => {
    if (i.voided) return s
    const p = catalog?.products?.find((pr: any) => pr.id === i.productId)
    const disc = p?.discount || 0
    const effectivePrice = i.overridePrice != null ? i.overridePrice : i.price
    const lineDisc = i.lineDiscount || 0
    const lineTotal = effectivePrice * (1 - (lineDisc > 0 ? lineDisc : disc) / 100) * i.qty
    return s + (i.isCourtesy ? 0 : lineTotal)
  }, 0) : 0
  const discountedTotal = round2(orderTotal * (1 - orderDiscount / 100))
  const finalTotal = round2(discountedTotal + tipAmount)
  const splitsUsed = round2(paymentSplits.reduce((s: any, p: any) => s + (Number(p.amount) || 0), 0))
  const remaining = round2(finalTotal - splitsUsed)
  const canConfirm = paymentSplits.length > 0 && Math.abs(remaining) < 0.005

  const pendingBarCount = useMemo(() =>
    floor ? (Object.values(floor.orders) as any[]).reduce((s: any, o: any) =>
      s + o.items.filter((i: any) => i.sent && !i.ready && i.ubicacion === 'Bar').length, 0) : 0,
    [floor]
  )
  const pendingCocinaCount = useMemo(() =>
    floor ? (Object.values(floor.orders) as any[]).reduce((s: any, o: any) =>
      s + o.items.filter((i: any) => i.sent && !i.ready && i.ubicacion !== 'Bar').length, 0) : 0,
    [floor]
  )

  // ---------- Persistence ----------
  const persistFloor = useCallback(async (next: any) => {
    setFloor(next)
    if (trainingMode) return
    try {
      await saveFloor(next)
      broadcastFloorUpdate(next, tenantId)
    } catch {
      enqueueMutation('/api/floor', JSON.stringify(next))
      showToast('Sin conexión — la sala se guardará cuando vuelva la red')
    }
  }, [setFloor, trainingMode, tenantId, showToast])

  const processSalesQueue = useCallback(async () => {
    if (salesProcessing.current || salesQueue.current.length === 0) return
    salesProcessing.current = true
    while (salesQueue.current.length > 0) {
      const sale = salesQueue.current[0]
      let ok = false
      let lastErr = ''
      let ticketNumber = null
      try {
        const res: any = await addSale(sale)
        ok = res && res.ok
        if (res && res.ticketNumber) ticketNumber = res.ticketNumber
        if (!ok) lastErr = 'respuesta vacía'
      } catch (e) {
        lastErr = e && (e as Error).message ? (e as Error).message : String(e)
        console.warn('addSale error:', lastErr)
      }
      if (ok) {
        if (ticketNumber) {
          setSales((prev: any) => prev.map((s: any) => s.id === sale.id ? { ...s, ticketNumber } : s))
          cacheSet('sales', null)
        }
        salesQueue.current.shift()
      } else {
        showToast(`Error venta: ${lastErr}. Reintentando...`)
        await new Promise(r => setTimeout(r, 2000))
        try {
          const res: any = await addSale(sale)
          if (res && res.ok) {
            salesQueue.current.shift()
          } else {
            showToast(`Error venta: ${lastErr}. No se pudo guardar`)
            salesQueue.current.shift()
          }
        } catch (e2) {
          showToast(`Error venta: ${e2 && (e2 as Error).message ? (e2 as Error).message : String(e2)}. No se pudo guardar`)
          salesQueue.current.shift()
        }
      }
    }
    salesProcessing.current = false
  }, [setSales, showToast])

  const persistSales = useCallback(async (next: any) => {
    setSales(next)
    cacheSet('sales', next)
    const newSale = next[next.length - 1]
    salesQueue.current.push(newSale)
    processSalesQueue()
  }, [setSales, processSalesQueue])

  // ---------- Order mutation helpers ----------
  const getContext = useCallback(() => {
    if (!selectedTableId || !floor) return null
    const table = floor.tables.find((t: any) => t.id === selectedTableId)
    if (!table) return null
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId
    const order = activeOid ? floor.orders[activeOid] : null
    return { table, order, activeOid }
  }, [selectedTableId, floor, activeTicketId])

  // ---------- Item operations ----------
  const addItem = useCallback((product: any) => {
    if (product.isMenu && product.menuData) {
      const next = clone(floor)
      const table = next.tables.find((t: any) => t.id === selectedTableId)
      let order = table.orderId ? next.orders[table.orderId] : null
      if (!order) {
        const orderId = 'o_' + Date.now()
        order = { id: orderId, tableId: table.id, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '-' }
        next.orders[orderId] = order
        table.orderId = orderId
        table.status = 'ocupada'
      }
      const menuItems = expandMenu(product, catalog, product.menuSel)
      for (const mi of menuItems) {
        if (mi.productId && !mi.isMenuPrice) {
          const existing = order.items.find((i: any) => i.productId === mi.productId && !i.sent && !i.isCombo && !i.isMenuItem)
          if (existing) { existing.qty += mi.qty; continue }
        }
        order.items.push({
          id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
          ...mi,
          sent: mi.isMenuPrice,
          ready: mi.isMenuPrice,
          sentAt: mi.isMenuPrice ? Date.now() : null,
          notes: '',
          modifiers: [],
        })
      }
      persistFloor(next)
      return
    }
    if (product.isCombo && product.comboData) {
      const next = clone(floor)
      const table = next.tables.find((t: any) => t.id === selectedTableId)
      let order = table.orderId ? next.orders[table.orderId] : null
      if (!order) {
        const orderId = 'o_' + Date.now()
        order = { id: orderId, tableId: table.id, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '-' }
        next.orders[orderId] = order
        table.orderId = orderId
        table.status = 'ocupada'
      }
      const comboItems = expandCombo(product, catalog, product.comboSel)
      for (const ci of comboItems) {
        if (ci.productId && !ci.isComboPrice) {
          const existing = order.items.find((i: any) => i.productId === ci.productId && !i.sent && !i.isCombo)
          if (existing) { existing.qty += ci.qty; continue }
        }
        order.items.push({
          id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
          ...ci,
          sent: ci.isComboPrice,
          ready: ci.isComboPrice,
          sentAt: ci.isComboPrice ? Date.now() : null,
          notes: '',
          modifiers: [],
        })
      }
      persistFloor(next)
      return
    }
    handleAddItemWithModifiers(product)
  }, [floor, catalog, selectedTableId, currentUser, persistFloor])

  const getModifierGroupsForProduct = useCallback((productId: string) => {
    const groupIds = modifierData.productModifiers[productId] || []
    return modifierData.groups.filter((g: any) => groupIds.includes(g.id))
  }, [modifierData])

  const handleAddItemWithModifiers = useCallback((product: any) => {
    const groups = getModifierGroupsForProduct(product.id)
    if (groups.length > 0) {
      setShowModifierSelector({ product, groups })
    } else {
      addItemWithPrice(product, [], 0)
    }
  }, [getModifierGroupsForProduct])

  const addItemWithPrice = useCallback((product: any, modifiers: any[], extraPrice: number) => {
    const next = clone(floor)
    const table = next.tables.find((t: any) => t.id === selectedTableId)
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId
    let order = activeOid ? next.orders[activeOid] : null
    let isNewOrder = false

    if (!order) {
      const orderId = 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      order = { id: orderId, tableId: table.id, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '-' }
      next.orders[orderId] = order
      if (!table.orderIds) table.orderIds = []
      table.orderIds.push(orderId)
      table.orderId = orderId
      table.status = 'ocupada'
      setActiveTicketId(orderId)
      isNewOrder = true
    }
    const basePrice = product.price || catalog?.products?.find((p: any) => p.id === product.id)?.price || 0
    const effectivePrice = round2(basePrice + extraPrice)
    const existing = order.items.find((i: any) => i.productId === product.id && !i.sent && JSON.stringify(i.modifiers) === JSON.stringify(modifiers))
    if (existing) existing.qty += 1
    else {
      const prod = catalog?.products?.find((p: any) => p.id === product.id)
      order.items.push({
        id: 'i_' + Date.now() + Math.random().toString(16).slice(2),
        productId: product.id, name: product.name, price: effectivePrice,
        qty: 1, sent: false, ready: false, sentAt: null, notes: '', modifiers,
        course: product.course || '',
        ubicacion: (product.ubicacion || prod?.ubicacion || 'Bar'),
      })
    }
    if (isNewOrder) {
      eventBus.emit('order:created', {
        orderId: order.id, tableId: table.id, tableName: table.name,
        items: order.items.map((i: any) => ({ productId: i.productId, name: i.name, qty: i.qty })),
        employeeName: currentUser?.name || null, createdAt: order.createdAt,
      })
    }
    persistFloor(next)
  }, [floor, catalog, selectedTableId, activeTicketId, currentUser, persistFloor])

  const confirmModifiersAndAdd = useCallback((modifiers: any[]) => {
    const product = showModifierSelector.product
    const extraPrice = modifiers.reduce((s: any, m: any) => s + (m.priceDelta || 0), 0)
    setShowModifierSelector(null)

    if (editingItemModifiers) {
      const next = clone(floor)
      const table = next.tables.find((t: any) => t.id === selectedTableId)
      const order = next.orders[table.orderId]
      const item = order.items.find((i: any) => i.id === editingItemModifiers.item.id)
      if (item) {
        item.modifiers = modifiers
        const basePrice = product.price || catalog?.products?.find((p: any) => p.id === product.id)?.price || 0
        item.price = round2(basePrice + extraPrice)
      }
      persistFloor(next)
      setEditingItemModifiers(null)
      return
    }
    addItemWithPrice(product, modifiers, extraPrice)
  }, [showModifierSelector, editingItemModifiers, floor, catalog, selectedTableId, persistFloor])

  const changeQty = useCallback((itemId: string, delta: number) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (!item || item.sent) return
    item.qty += delta
    if (item.qty <= 0) order.items = order.items.filter((i: any) => i.id !== itemId)
    persistFloor(next)
  }, [floor, getContext, persistFloor])

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) item.notes = notes
    persistFloor(next)
  }, [floor, getContext, persistFloor])

  const removeItem = useCallback((itemId: string) => {
    const next = clone(floor)
    const table = next.tables.find((t: any) => t.id === selectedTableId)
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId
    const order = activeOid ? next.orders[activeOid] : null
    if (!order) return
    order.items = order.items.filter((i: any) => i.id !== itemId)
    if (order.items.length === 0 && (table.orderIds?.length || 0) <= 1) {
      delete next.orders[activeOid]
      table.orderIds = (table.orderIds || []).filter((id: any) => id !== activeOid)
      table.orderId = table.orderIds?.[0] || null
      if (!table.orderId) table.status = 'libre'
    }
    persistFloor(next)
  }, [floor, selectedTableId, activeTicketId, persistFloor])

  const sendToKitchenCourse = useCallback((course?: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    let count = 0
    order.items.forEach((i: any) => {
      if (!i.sent && (!course || i.course === course)) { i.sent = true; i.sentAt = Date.now(); count++ }
    })
    persistFloor(next)
    if (count) showToast(`${course || 'Todo'} enviado a cocina (${count} ${count === 1 ? 'linea' : 'lineas'})`)
  }, [floor, getContext, persistFloor, showToast])

  const sendItemToKitchen = useCallback((itemId: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item && !item.sent) {
      item.sent = true; item.sentAt = Date.now(); persistFloor(next)
      eventBus.emit('item:sent', {
        orderId: ctx.activeOid, itemId,
        productName: item.name, course: item.course || '',
        tableName: ctx.table?.name || '',
      })
      showToast(`${item.name} enviado a cocina`)
    }
  }, [floor, getContext, persistFloor, showToast])

  const updateItemCourse = useCallback((itemId: string, course?: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) item.course = course
    persistFloor(next)
  }, [floor, getContext, persistFloor])

  const editItemModifiers = useCallback((item: any, product: any) => {
    const groups = getModifierGroupsForProduct(product.id)
    if (groups.length === 0) return
    setEditingItemModifiers({ item, product, groups })
    setShowModifierSelector({ product, groups })
  }, [getModifierGroupsForProduct])

  const toggleCuenta = useCallback(() => {
    const ctx = getContext()
    if (!ctx?.table) return
    const next = clone(floor)
    const table = next.tables.find((t: any) => t.id === selectedTableId)
    table.status = table.status === 'cuenta' ? 'ocupada' : 'cuenta'
    persistFloor(next)
  }, [floor, selectedTableId, getContext, persistFloor])

  const markReady = useCallback((orderId: string, ubicacion?: string) => {
    const next = clone(floor)
    const order = next.orders[orderId]
    if (!order) return
    let readyItems = order.items.filter((i: any) => i.sent && !i.ready)
    if (ubicacion) readyItems = readyItems.filter((i: any) => (i.ubicacion || 'Cocina') === ubicacion)
    if (readyItems.length === 0) return
    readyItems.forEach((i: any) => i.ready = true)
    persistFloor(next)
    const table = next.tables.find((t: any) => t.id === order.tableId)
    const names: string[] = [...new Set(readyItems.map((i: any) => i.name))] as string[]
    broadcastReadyNotification(table?.name || order.tableId, names, order.employeeName, tenantId)
  }, [floor, persistFloor, broadcastReadyNotification, tenantId])

  const voidSentItem = useCallback((itemId: string, reason: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) {
      item.voided = true
      item.voidReason = reason
      item.voidedBy = currentUser?.name
      item.voidedAt = Date.now()
    }
    persistFloor(next)
  }, [floor, getContext, currentUser, persistFloor])

  // ---------- Discount operations ----------
  const setItemDiscount = useCallback((itemId: string, pct: number) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) { item.lineDiscount = pct; item.isCourtesy = false }
    persistFloor(next)
  }, [floor, getContext, persistFloor])

  const removeItemDiscount = useCallback((itemId: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) item.lineDiscount = 0
    persistFloor(next)
  }, [floor, getContext, persistFloor])

  const setItemCourtesy = useCallback((itemId: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) { item.isCourtesy = true; item.lineDiscount = 0 }
    persistFloor(next)
  }, [floor, getContext, persistFloor])

  const removeItemCourtesy = useCallback((itemId: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) item.isCourtesy = false
    persistFloor(next)
  }, [floor, getContext, persistFloor])

  const setItemPrice = useCallback((itemId: string, newPrice: number) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = clone(floor)
    const order = next.orders[ctx.activeOid]
    const item = order.items.find((i: any) => i.id === itemId)
    if (item) { item.overridePrice = Math.max(0, newPrice) }
    persistFloor(next)
  }, [floor, getContext, persistFloor])

  // ---------- Table operations ----------
  const cancelTable = useCallback(() => {
    const next = clone(floor)
    const table = next.tables.find((t: any) => t.id === selectedTableId)
    if (!table) return
    if (table.orderId) {
      const order = next.orders[table.orderId]
      saveCancelledOrder({
        tableId: table.id, tableName: table.name,
        orderId: table.orderId,
        items: order.items,
        total: order.items.reduce((s: any, i: any) => s + i.price * i.qty, 0),
        employeeName: currentUser?.name,
        cancelledAt: Date.now(),
      }).catch(() => {})
      delete next.orders[table.orderId]
    }
    table.status = 'libre'
    table.isFiado = false
    table.orderId = null
    table.orderIds = []
    persistFloor(next)
    setSelectedTableId(null)
    showToast(`${table.name} cancelada y liberada`)
  }, [floor, selectedTableId, currentUser, persistFloor, showToast])

  const voidTable = useCallback((reason: string = '') => {
    const next = clone(floor)
    const table = next.tables.find((t: any) => t.id === selectedTableId)
    if (!table) return
    const orderIds = [...(table.orderIds || [])]
    for (const oid of orderIds) {
      const order = next.orders[oid]
      if (order) {
        const sentItems = order.items.filter((i: any) => i.sent)
        if (sentItems.length > 0) {
          saveCancelledOrder({
            tableId: table.id, tableName: table.name, orderId: oid,
            items: sentItems, total: sentItems.reduce((s: any, i: any) => s + i.price * i.qty, 0),
            employeeName: currentUser?.name, reason: reason || 'vaciar mesa', cancelledAt: Date.now(),
          }).catch(() => {})
        }
        delete next.orders[oid]
      }
    }
    table.orderIds = []
    table.orderId = null
    table.status = 'libre'
    table.isFiado = false
    persistFloor(next)
    setSelectedTableId(null)
    setActiveTicketId(null)
    showToast(`${table.name} liberada`)
  }, [floor, selectedTableId, currentUser, persistFloor, showToast])

  const moveTable = useCallback((tableId: string, destTableId: string) => {
    if (tableId === destTableId) { showToast('No puedes mover una mesa sobre sí misma'); return }
    const next = clone(floor)
    const src = next.tables.find((t: any) => t.id === tableId)
    const dst = next.tables.find((t: any) => t.id === destTableId)
    if (!src || !dst || !src.orderId) { showToast('La mesa origen no tiene pedido'); return }
    if (!next.orders[src.orderId]) { showToast('Pedido no encontrado'); return }
    if (dst.orderId) {
      const srcOrder = next.orders[src.orderId]
      const dstOrder = next.orders[dst.orderId]
      dstOrder.items = [...dstOrder.items, ...srcOrder.items]
      delete next.orders[src.orderId]
    } else {
      next.orders[src.orderId].tableId = destTableId
      dst.orderId = src.orderId
    }
    src.orderId = null
    src.status = 'libre'
    src.mergedTableIds = null
    dst.status = dst.orderId ? 'unidas' : 'ocupada'
    persistFloor(next)
    setSelectedTableId(destTableId)
    showToast(`Pedido movido a ${dst.name}`)
  }, [floor, persistFloor, showToast])

  const mergeTables = useCallback((tableId: string, sourceTableIds: string[]) => {
    const next = clone(floor)
    const dst = next.tables.find((t: any) => t.id === tableId)
    if (!dst) return
    let dstOrder = dst.orderId ? next.orders[dst.orderId] : null
    if (!dstOrder) {
      const newOrderId = 'ord_' + Date.now()
      dstOrder = { id: newOrderId, tableId, items: [], createdAt: Date.now(), employeeName: currentUser?.name || '' }
      next.orders[newOrderId] = dstOrder
      dst.orderId = newOrderId
    }
    dst.status = 'unidas'
    dst.mergedTableIds = sourceTableIds.filter((id: any) => id !== tableId)

    for (const srcId of sourceTableIds) {
      if (srcId === tableId) continue
      const src = next.tables.find((t: any) => t.id === srcId)
      if (!src || !src.orderId) continue
      const srcOrder = next.orders[src.orderId]
      if (!srcOrder) continue
      dstOrder.items = [...dstOrder.items, ...srcOrder.items]
      delete next.orders[src.orderId]
      src.orderId = null
      src.status = 'libre'
    }

    const mergedNames = sourceTableIds
      .filter((id: any) => id !== tableId)
      .map((id: any) => next.tables.find((t: any) => t.id === id)?.name || id)
      .filter(Boolean)
    if (mergedNames.length > 0) {
      dstOrder._mergedFrom = [tableId, ...sourceTableIds.filter((id: any) => id !== tableId)]
      dstOrder._mergedLabel = `Unidas: ${dst.name} + ${mergedNames.join(' + ')}`
    }

    persistFloor(next)
    showToast(`Pedidos fusionados en ${dst.name}`)
  }, [floor, currentUser, persistFloor, showToast])

  const reopenOrder = useCallback((tableId: string, historyEntry: any) => {
    const next = clone(floor)
    const table = next.tables.find((t: any) => t.id === tableId)
    if (!table) return
    const reopenedId = historyEntry.id + '_reopened'
    next.orders[reopenedId] = {
      ...historyEntry, id: reopenedId, tableId,
      reopenedAt: Date.now(),
      items: historyEntry.items.map((i: any) => ({ ...i, sent: false, ready: false })),
    }
    if (!table.orderIds) table.orderIds = []
    table.orderIds.push(reopenedId)
    table.orderId = reopenedId
    table.status = 'ocupada'
    if (next.history?.[tableId]) {
      next.history[tableId] = next.history[tableId].filter((h: any) => h.id !== historyEntry.id)
    }
    persistFloor(next)
    setActiveTicketId(reopenedId)
    showToast('Pedido reabierto')
  }, [floor, persistFloor, showToast])

  // ---------- Multi-ticket ----------
  const createNewTicket = useCallback((tableId: string) => {
    const next = clone(floor)
    const table = next.tables.find((t: any) => t.id === tableId)
    if (!table) return
    const orderId = 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const ticketNum = (table.orderIds?.length || 0) + 1
    next.orders[orderId] = {
      id: orderId, tableId, items: [], createdAt: Date.now(),
      employeeName: currentUser?.name || '', label: `#${ticketNum}`,
    }
    if (!table.orderIds) table.orderIds = []
    table.orderIds.push(orderId)
    table.orderId = orderId
    if (table.status === 'libre') table.status = 'ocupada'
    persistFloor(next)
    setActiveTicketId(orderId)
    showToast(`Nuevo ticket #${ticketNum} creado`)
  }, [floor, currentUser, persistFloor, showToast])

  const switchTicket = useCallback((_tableId: string, orderId: string) => {
    setActiveTicketId(orderId)
  }, [])

  const deleteEmptyTicket = useCallback((tableId: string, orderId: string) => {
    const next = clone(floor)
    const table = next.tables.find((t: any) => t.id === tableId)
    const order = next.orders[orderId]
    if (!table || !order || order.items.length > 0) return
    delete next.orders[orderId]
    table.orderIds = (table.orderIds || []).filter((id: any) => id !== orderId)
    if (table.orderIds.length === 0) {
      table.orderId = null
      if (!table.reserved) table.status = 'libre'
    } else {
      table.orderId = table.orderIds[0]
    }
    persistFloor(next)
    setActiveTicketId(table.orderId || null)
    showToast('Ticket vacío eliminado')
  }, [floor, persistFloor, showToast])

  const renameTicket = useCallback((tableId: string, orderId: string, label: string) => {
    const next = clone(floor)
    const order = next.orders[orderId]
    if (order) order.label = label
    persistFloor(next)
  }, [floor, persistFloor])

  const linkCustomer = useCallback((orderId: string, customer: any) => {
    const next = clone(floor)
    const order = next.orders[orderId]
    if (order) order.customer = customer
    persistFloor(next)
  }, [floor, persistFloor])

  const unlinkCustomer = useCallback((orderId: string) => {
    const next = clone(floor)
    const order = next.orders[orderId]
    if (order) order.customer = null
    persistFloor(next)
  }, [floor, persistFloor])

  // ---------- Personal discount ----------
  const calcPersonalDiscountAmount = useCallback((order: any, rates: Record<string, number>) => {
    let totalDiscount = 0
    for (const item of order.items) {
      if (item.voided) continue
      const p = catalog?.products?.find((pr: any) => pr.id === item.productId)
      if (!p) continue
      const rate = rates[p.category] || 0
      if (rate <= 0) continue
      const effectivePrice = item.overridePrice != null ? item.overridePrice : item.price
      const full = effectivePrice * item.qty
      totalDiscount += full * rate / 100
    }
    return round2(totalDiscount)
  }, [catalog])

  const applyPersonalDiscount = useCallback(async (orderId: string, employeePin: string): Promise<boolean> => {
    const r = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tpv-key': API_KEY },
      body: JSON.stringify({ action: 'verify', pin: employeePin, pinHash: await sha256(employeePin) }),
    })
    if (!r.ok) { showToast('PIN incorrecto'); return false }
    const emp = await r.json()
    if (!emp.personalDiscountEnabled) { showToast(`${emp.name} no tiene activado el descuento de personal`); return false }

    const next = clone(floor)
    const order = next.orders[orderId]
    if (!order) return false

    const ratesRaw = ticketSettings.personalDiscountRates
    let rates: Record<string, number> = {}
    try { rates = typeof ratesRaw === 'string' ? JSON.parse(ratesRaw) : ratesRaw || {} } catch { rates = {} }

    const discountAmount = calcPersonalDiscountAmount(order, rates)
    if (discountAmount <= 0) { showToast('Ningún artículo recibe descuento según las tasas configuradas'); return false }

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const used = emp.monthlyUsedMonth === currentMonth ? (emp.monthlyUsed || 0) : 0
    const remaining = emp.monthlyLimit - used
    if (discountAmount > remaining) {
      showToast(`${emp.name} no tiene suficiente saldo: necesita ${euros(discountAmount)} pero le queda ${euros(remaining)}`)
      return false
    }

    for (const item of order.items) {
      if (item.voided) continue
      const p = catalog?.products?.find((pr: any) => pr.id === item.productId)
      if (!p) continue
      const rate = rates[p.category] || 0
      if (rate <= 0) { item.lineDiscount = 0; continue }
      item.lineDiscount = rate
      item.isCourtesy = false
    }

    order.personalDiscountEmployeeId = emp.id
    order.personalDiscountEmployeeName = emp.name
    order.personalDiscountApplied = true

    const empNext = employees.map((e: any) => {
      if (e.id === emp.id) {
        return { ...e, monthlyUsedMonth: currentMonth, monthlyUsed: (used + discountAmount) }
      }
      return e
    })
    persistFloor(next)
    setEmployees(empNext)
    showToast(`Descuento personal aplicado — ${emp.name} (${euros(discountAmount)})`)
    return true
  }, [floor, catalog, ticketSettings, employees, persistFloor, showToast])

  const removePersonalDiscount = useCallback((orderId: string) => {
    const next = clone(floor)
    const order = next.orders[orderId]
    if (!order || !order.personalDiscountApplied) return

    const empId = order.personalDiscountEmployeeId
    const ratesRaw = ticketSettings.personalDiscountRates
    let rates: Record<string, number> = {}
    try { rates = typeof ratesRaw === 'string' ? JSON.parse(ratesRaw) : ratesRaw || {} } catch { rates = {} }

    const discountAmount = calcPersonalDiscountAmount(order, rates)
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const empNext = employees.map((e: any) => {
      if (e.id === empId) {
        const used = e.monthlyUsedMonth === currentMonth ? (e.monthlyUsed || 0) : 0
        return { ...e, monthlyUsedMonth: currentMonth, monthlyUsed: Math.max(0, used - discountAmount) }
      }
      return e
    })

    for (const item of order.items) {
      const p = catalog?.products?.find((pr: any) => pr.id === item.productId)
      if (!p) continue
      const rate = rates[p.category] || 0
      if (rate > 0 && item.lineDiscount === rate) {
        item.lineDiscount = 0
      }
    }

    delete order.personalDiscountApplied
    delete order.personalDiscountEmployeeId
    delete order.personalDiscountEmployeeName

    persistFloor(next)
    setEmployees(empNext)
    showToast('Descuento personal retirado')
  }, [floor, ticketSettings, catalog, employees, persistFloor, showToast])

  // ---------- Payment ----------
  const addSplit = useCallback((method: string) => {
    if (method === 'fiado') {
      setPaymentSplits([{ id: 'sp_fiado', method: 'fiado', amount: finalTotal }])
    } else {
      const used = round2(paymentSplits.reduce((s: any, p: any) => s + (p.method === 'fiado' ? 0 : p.amount), 0))
      const rem = round2(finalTotal - used)
      if (rem <= 0) return
      setPaymentSplits((prev: any) => [...prev.filter((p: any) => p.method !== 'fiado'), { id: 'sp_' + Date.now(), method, amount: rem, itemIds: [] }])
    }
  }, [finalTotal, paymentSplits])

  const updateSplitAmount = useCallback((id: string, value: string) => {
    const amount = value === '' ? 0 : Math.max(0, parseFloat(value))
    setPaymentSplits((prev: any) => prev.map((p: any) => p.id === id ? { ...p, amount: isNaN(amount) ? 0 : amount } : p))
  }, [])

  const removeSplit = useCallback((id: string) => {
    setPaymentSplits((prev: any) => prev.filter((p: any) => p.id !== id))
  }, [])

  const toggleSplitItem = useCallback((splitId: string, itemId: string) => {
    setPaymentSplits((prev: any) => prev.map((p: any) => {
      if (p.id !== splitId) return p
      const ids = p.itemIds || []
      const next = ids.includes(itemId) ? ids.filter((id: any) => id !== itemId) : [...ids, itemId]
      const itemAmount = (selectedOrder?.items || [])
        .filter((i: any) => next.includes(i.id))
        .reduce((s: any, i: any) => s + i.price * i.qty, 0)
      return { ...p, itemIds: next, amount: itemAmount > 0 ? itemAmount : p.amount }
    }))
  }, [selectedOrder])

  // ---------- closeBill ----------
  const resetPaymentState = useCallback(() => {
    setPaying(false)
    setPaymentSplits([])
    setOrderDiscount(0)
    setTipAmount(0)
    setTipMethod('efectivo')
    setPaymentIntentId('')
    setInvoiceNif('')
    setInvoiceName('')
    setInvoiceAddress('')
    setInvoiceEmail('')
  }, [])

  const closeBill = useCallback(() => {
    if (!selectedTableId || !floor) return
    const table = floor.tables.find((t: any) => t.id === selectedTableId)
    const order = floor.orders[table.orderId]
    if (!table || !order) return

    const { nextFloor, nextCatalog, sale, stockLogs, warnings, wasDebt } = executeCloseOrder({
      floor,
      selectedTableId,
      order,
      catalog,
      modifierData,
      offers,
      orderDiscount,
      tipAmount,
      tipMethod,
      paymentSplits,
      paymentIntentId,
      currentUser,
      invoice: { nif: invoiceNif, name: invoiceName, address: invoiceAddress, email: invoiceEmail },
      trainingMode,
    })

    if (warnings.length > 0) {
      if (!window.confirm(`${warnings.join(' ')} ¿Seguro que quieres cobrar?`)) return
    }

    stockLogs.forEach(log => saveStockLog(log).catch(() => {}))

    const tipStr = tipAmount > 0 ? ` (+${euros(tipAmount)} propina)` : ''
    const discStr = orderDiscount > 0 ? ` (${orderDiscount}% desc)` : ''
    const offerStr = sale.offerDiscount > 0 ? ` (oferta -${euros(sale.offerDiscount)})` : ''

    if (trainingMode) {
      resetPaymentState()
      setSelectedTableId(null)
      showToast(`🎓 Formación — Cobrado: ${euros(sale.totalWithTip)}${tipStr}${discStr}${offerStr}`)
      return
    }

    persistFloor(nextFloor)
    setCatalog(nextCatalog)
    persistSales([...sales, sale])

    eventBus.emit('order:closed', {
      saleId: sale.id, tableId: table.id, tableName: table.name,
      items: sale.items, subtotal: sale.subtotal, discount: orderDiscount, total: sale.total, tip: tipAmount, totalWithTip: sale.totalWithTip,
      paymentMethod: sale.paymentMethod, payments: sale.payments, isFiado: sale.isFiado, isDebtPayment: wasDebt,
      employeeId: currentUser?.id || null, employeeName: currentUser?.name || null,
      closedAt: sale.closedAt,
    })

    registerVerifactu(sale.id, sale).then(() => {
      showToast(`✅ Factura electrónica registrada (${sale.invoiceNumber || sale.id})`)
    }).catch(err => {
      console.warn('Verifactu:', err)
      showToast('⚠️ Error al registrar factura electrónica — revisa Gestoría')
    })

    resetPaymentState()
    setSelectedTableId(null)

    showToast(
      wasDebt ? `Deuda pagada: ${euros(sale.totalWithTip)}${discStr}${offerStr}${tipStr}`
        : sale.isFiado ? `Fiado: ${euros(sale.totalWithTip)}${discStr}${offerStr}${tipStr}`
          : `Cobrado: ${euros(sale.totalWithTip)}${discStr}${offerStr}${tipStr}`
    )

    if (sale.payments.some((p: any) => p.method === 'efectivo') && isPrinterConnected()) {
      printESCPOS(escposOpenDrawer()).catch(() => {})
    }
  }, [floor, catalog, sales, selectedTableId, orderDiscount, tipAmount, tipMethod,
      paymentSplits, paymentIntentId, invoiceNif, invoiceName, invoiceAddress, invoiceEmail,
      modifierData, offers, trainingMode, currentUser, persistFloor,
      setCatalog, persistSales, showToast, resetPaymentState, setSelectedTableId])

  // ---------- Printing ----------
  const handlePrint = useCallback(() => {
    const order = selectedOrder
    if (!order) return
    const items = order.items.filter((i: any) => i.productId)
    const subtotal = items.reduce((s: any, i: any) => s + i.price * i.qty, 0)
    const discountAmount = round2(subtotal * (orderDiscount / 100))
    const totalConIgic = subtotal - discountAmount
    const { baseImponible, cuotaIgic } = calculateIgic(totalConIgic)
    const totalWithTip = totalConIgic + tipAmount
    const { restaurantName, companyCif, companyAddress, companyPhone, logoUrl, footerText, ticketWidth } = ticketSettings
    const html = buildTicketHtml({
      items, subtotal, discountAmount, totalConIgic, baseImponible, cuotaIgic,
      tip: tipAmount, tipMethod, totalWithTip,
      restaurantName, companyCif, companyAddress, companyPhone, logoUrl, footerText, ticketWidth,
      tableName: selectedTable?.name || '',
      employeeName: currentUser?.name || '',
      ticketLabel: order.label ? `Comanda ${order.label}` : '',
      ticketNumber: selectedTable?.orderId ? String(selectedTable.orderId).slice(-6).toUpperCase() : '',
      date: new Date().toLocaleString('es-ES'),
      catalog, allergensList: [],
    })
    printTicketHtml(html)
  }, [selectedOrder, orderDiscount, tipAmount, tipMethod, ticketSettings, selectedTable, currentUser, catalog])

  const handlePrintInvoice = useCallback((sale: any) => {
    if (!sale) return
    const { restaurantName, companyCif, companyAddress, companyPhone, footerText } = ticketSettings
    const totalConIva = sale.total || 0
    const { baseImponible, cuotaIgic } = calculateIgic(totalConIva)
    const itemsHtml = (sale.items || []).filter((i: any) => !i.voided).map((i: any) =>
      `<tr><td style="padding:3px 0">${i.name.replace(/</g, '&lt;')}</td><td style="text-align:center;width:40px">${i.qty}</td><td style="text-align:right;width:70px">${euros(i.price)}</td><td style="text-align:right;width:80px">${euros((i.price || 0) * (i.qty || 0))}</td></tr>`
    ).join('')
    const html = `<html><head><meta charset="utf-8"><style>
      @page { margin:8mm 12mm; size: A4; }
      body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#222; margin:0; padding:0; }
      .header { text-align:center; margin-bottom:18px; border-bottom:2px solid #222; padding-bottom:12px; }
      .header h1 { margin:0; font-size:20px; letter-spacing:1px; }
      .header .info { font-size:10px; color:#555; margin-top:4px; }
      .header .numero { font-size:13px; font-weight:bold; margin-top:4px; }
      table { width:100%; border-collapse:collapse; margin:12px 0; }
      th { border-bottom:2px solid #222; padding:5px 4px; text-align:left; font-size:10px; text-transform:uppercase; }
      td { padding:3px 4px; border-bottom:1px solid #ddd; font-size:11px; }
      .r { text-align:right; }
      .g { border-top:2px solid #222; font-weight:bold; font-size:12px; }
      .igic-line { font-size:10px; color:#555; }
      .footer { margin-top:20px; font-size:9px; color:#888; text-align:center; border-top:1px solid #ddd; padding-top:10px; }
      .client-box { background:#f5f5f5; padding:8px 10px; border-radius:4px; margin:10px 0; font-size:10px; }
      .client-box p { margin:2px 0; }
    </style></head><body>
      <div class="header">
        <h1>${restaurantName || 'FACTURA'}</h1>
        <div class="info">${companyCif ? `CIF/NIF: ${companyCif}<br>` : ''}${companyAddress ? `${companyAddress}<br>` : ''}${companyPhone ? `Tel: ${companyPhone}` : ''}</div>
        <div class="numero">${sale.invoiceNumber || sale.id} · Ticket #${sale.ticketNumber || '-'}</div>
        <div class="info">${new Date(sale.closedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <div class="client-box">
        <p><strong>Cliente:</strong> ${sale.invoiceName || '—'}</p>
        <p><strong>NIF:</strong> ${sale.invoiceNif || '—'}</p>
        ${sale.invoiceAddress ? `<p><strong>Dirección:</strong> ${sale.invoiceAddress}</p>` : ''}
        <p><strong>Mesa:</strong> ${sale.tableName} · <strong>Camarero:</strong> ${sale.employeeName || '—'}</p>
      </div>
      <table><tr><th>Artículo</th><th style="text-align:center">Ud.</th><th style="text-align:right">Precio</th><th style="text-align:right">Importe</th></tr>
        ${itemsHtml}
        <tr><td colspan="3" style="border:none;padding:3px 4px;font-size:10px;color:#555;text-align:right">Base Imponible</td><td class="r igic-line">${euros(baseImponible)}</td></tr>
        <tr><td colspan="3" style="border:none;padding:1px 4px;font-size:10px;color:#555;text-align:right">IGIC 7%</td><td class="r igic-line">${euros(cuotaIgic)}</td></tr>
        <tr class="g"><td colspan="3" style="text-align:right;font-size:12px">TOTAL</td><td class="r" style="font-size:13px">${euros(totalConIva)}</td></tr>
      </table>
      ${sale.tip > 0 ? `<p style="font-size:10px;color:#888;text-align:right">Propina (NO fiscal): +${euros(sale.tip)}</p>` : ''}
      ${sale.discount > 0 ? `<p style="font-size:10px;color:#888;text-align:right">Descuento aplicado: ${sale.discount}%</p>` : ''}
      ${sale.invoiceEmail ? `<p style="font-size:9px;color:#888;margin-top:8px">Enviada a: ${sale.invoiceEmail}</p>` : ''}
      <div class="footer">${footerText || 'Gracias por su visita'}</div>
    </body></html>`
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    iframe.contentWindow!.document.open()
    iframe.contentWindow!.document.write(html)
    iframe.contentWindow!.document.close()
    iframe.contentWindow!.focus()
    iframe.contentWindow!.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, [ticketSettings])

  // ---------- Debt order auto-creation ----------
  const debtFloorRef = useRef<any>(null as any)

  return {
    // State
    selectedTableId, setSelectedTableId,
    activeTicketId, setActiveTicketId,
    activeCategory, setActiveCategory,
    paying, setPaying,
    paymentSplits, setPaymentSplits,
    orderDiscount, setOrderDiscount,
    tipAmount, setTipAmount,
    tipMethod, setTipMethod,
    paymentIntentId, setPaymentIntentId,
    invoiceNif, setInvoiceNif,
    invoiceName, setInvoiceName,
    invoiceAddress, setInvoiceAddress,
    invoiceEmail, setInvoiceEmail,
    showModifierSelector, setShowModifierSelector,
    editingItemModifiers, setEditingItemModifiers,
    debtFloorRef,

    // Computed
    selectedTable,
    activeOrderId,
    selectedOrder,
    orderTotal,
    discountedTotal,
    finalTotal,
    splitsUsed,
    remaining,
    canConfirm,
    pendingBarCount,
    pendingCocinaCount,

    // Persistence
    persistFloor,
    persistSales,

    // Order item operations
    addItem,
    addItemWithPrice,
    handleAddItemWithModifiers,
    confirmModifiersAndAdd,
    changeQty,
    updateItemNotes,
    removeItem,
    sendToKitchenCourse,
    sendItemToKitchen,
    updateItemCourse,
    editItemModifiers,
    toggleCuenta,
    markReady,
    voidSentItem,
    getModifierGroupsForProduct,

    // Discount operations
    setItemDiscount,
    removeItemDiscount,
    setItemCourtesy,
    removeItemCourtesy,
    setItemPrice,
    calcPersonalDiscountAmount,
    applyPersonalDiscount,
    removePersonalDiscount,

    // Table operations
    cancelTable,
    voidTable,
    moveTable,
    mergeTables,
    reopenOrder,
    createNewTicket,
    switchTicket,
    deleteEmptyTicket,
    renameTicket,
    linkCustomer,
    unlinkCustomer,

    // Payment
    addSplit,
    updateSplitAmount,
    removeSplit,
    toggleSplitItem,
    closeBill,
    resetPaymentState,

    // Printing
    handlePrint,
    handlePrintInvoice,
  }
}
