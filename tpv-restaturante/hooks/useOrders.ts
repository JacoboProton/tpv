"use client"

import { useState, useMemo, useCallback, useRef } from 'react'
import { round2, euros } from '../components/constants'
import { addSale } from '../lib/api'
import { enqueueMutation, cacheSet } from '../lib/offline'
import { saveFloor } from '../infrastructure/database/floor-repository'
import { broadcastFloorUpdate, broadcastReadyNotification } from '../lib/realtime'
import { buildTicketHtml, printTicketHtml } from '../lib/ticket-template'
import { calculateIgic } from '../domain/invoice/invoice'
import { processSalesQueue as processSalesQueueOp } from '../application/sales/sales-queue'
import { useOrderItems } from './useOrderItems'
import { useOrderTickets } from './useOrderTickets'
import { useOrderTables } from './useOrderTables'
import { useOrderPayments } from './useOrderPayments'

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

  const [selectedTableId, setSelectedTableId] = useState<any>(null as any)
  const [activeTicketId, setActiveTicketId] = useState<any>(null as any)
  const [activeCategory, setActiveCategory] = useState<string>('Todos')

  const [showModifierSelector, setShowModifierSelector] = useState<any>(null as any)
  const [editingItemModifiers, setEditingItemModifiers] = useState<any>(null as any)

  const salesQueue = useRef<any[]>([])
  const salesProcessing = useRef<boolean>(false)

  // ---------- Computed ----------
  const selectedTable = floor?.tables?.find((t: any) => t.id === selectedTableId) ?? null
  const activeOrderId = activeTicketId || selectedTable?.orderIds?.[0] || selectedTable?.orderId
  const selectedOrder = activeOrderId ? floor?.orders?.[activeOrderId] : null

  const pendingBarCount = useMemo(() =>
    floor?.orders ? (Object.values(floor.orders) as any[]).reduce((s: any, o: any) =>
      s + o.items.filter((i: any) => i.sent && !i.ready && i.ubicacion === 'Bar').length, 0) : 0,
    [floor]
  )
  const pendingCocinaCount = useMemo(() =>
    floor?.orders ? (Object.values(floor.orders) as any[]).reduce((s: any, o: any) =>
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
    await processSalesQueueOp(salesQueue.current, salesProcessing, {
      addSale,
      setSales,
      cacheSet,
      showToast,
    })
  }, [setSales, showToast])

  const persistSales = useCallback((next: any) => {
    setSales(next)
    cacheSet('sales', next)
    const newSale = next[next.length - 1]
    salesQueue.current.push(newSale)
    processSalesQueue()
  }, [setSales, processSalesQueue])

  // ---------- Sub-hooks ----------
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
    floor, catalog, offers, sales, modifierData, currentUser, employees,
    trainingMode, selectedTableId, selectedOrder,
    persistFloor, persistSales, setSelectedTableId, setCatalog, setEmployees,
    showToast, ticketSettings,
  )

  const { orderDiscount, tipAmount, tipMethod } = orderPayments

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
    selectedTableId, setSelectedTableId,
    activeTicketId, setActiveTicketId,
    activeCategory, setActiveCategory,
    showModifierSelector, setShowModifierSelector,
    editingItemModifiers, setEditingItemModifiers,
    debtFloorRef,
    selectedTable, activeOrderId, selectedOrder,
    pendingBarCount, pendingCocinaCount,
    persistFloor, persistSales,
    ...orderItems,
    ...orderTickets,
    ...orderTables,
    ...orderPayments,
    handlePrint, handlePrintInvoice,
  }
}
