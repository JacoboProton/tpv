"use client"

import { useState, useCallback } from 'react'
import { round2, euros } from '../components/constants'
import { saveStockLog } from '../infrastructure/database/stock-log-repository'
import { eventBus } from '../lib/event-bus'
import { sha256 } from '../lib/crypto'
import { calculateOrderSubtotal } from '../domain/order/line-totals'
import { calculatePersonalDiscountAmount } from '../domain/pricing/personal-discount'
import { executeCloseOrder } from '../application/CloseOrder/close-order'
import { applyPersonalDiscount as applyPersonalDiscountOp, removePersonalDiscount as removePersonalDiscountOp } from '../application/ApplyPersonalDiscount/apply-personal-discount'

const API_KEY = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY) || ''

export function useOrderPayments(
  floor: any,
  catalog: any,
  offers: any,
  sales: any[],
  modifierData: any,
  currentUser: any,
  employees: any[],
  trainingMode: boolean,
  selectedTableId: string | null,
  selectedOrder: any,
  persistFloor: (next: any) => Promise<void>,
  persistSales: (next: any) => void,
  setSelectedTableId: (v: any) => void,
  setCatalog: (c: any) => void,
  setEmployees: (e: any) => void,
  showToast: (msg: string) => void,
  ticketSettings?: any,
) {
  const [paying, setPaying] = useState(false)
  const [paymentSplits, setPaymentSplits] = useState<any[]>([])
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [tipAmount, setTipAmount] = useState(0)
  const [tipMethod, setTipMethod] = useState('efectivo')
  const [paymentIntentId, setPaymentIntentId] = useState('')
  const [invoiceNif, setInvoiceNif] = useState('')
  const [invoiceName, setInvoiceName] = useState('')
  const [invoiceAddress, setInvoiceAddress] = useState('')
  const [invoiceEmail, setInvoiceEmail] = useState('')

  const orderTotal = selectedOrder ? calculateOrderSubtotal(selectedOrder.items, catalog) : 0
  const discountedTotal = round2(orderTotal * (1 - orderDiscount / 100))
  const finalTotal = round2(discountedTotal + tipAmount)
  const splitsUsed = round2(paymentSplits.reduce((s: any, p: any) => s + (Number(p.amount) || 0), 0))
  const remaining = round2(finalTotal - splitsUsed)
  const canConfirm = paymentSplits.length > 0 && Math.abs(remaining) < 0.005

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
    const table = floor?.tables?.find((t: any) => t.id === selectedTableId)
    const order = floor.orders[table?.orderId]
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
      saleId: sale.id, invoiceNumber: sale.invoiceNumber,
      tableId: table.id, tableName: table.name,
      items: sale.items, subtotal: sale.subtotal, discount: orderDiscount, total: sale.total, tip: tipAmount, totalWithTip: sale.totalWithTip,
      paymentMethod: sale.paymentMethod, payments: sale.payments, isFiado: sale.isFiado, isDebtPayment: wasDebt,
      employeeId: currentUser?.id || null, employeeName: currentUser?.name || null,
      closedAt: sale.closedAt,
    })

    resetPaymentState()
    setSelectedTableId(null)

    showToast(
      wasDebt ? `Deuda pagada: ${euros(sale.totalWithTip)}${discStr}${offerStr}${tipStr}`
        : sale.isFiado ? `Fiado: ${euros(sale.totalWithTip)}${discStr}${offerStr}${tipStr}`
          : `Cobrado: ${euros(sale.totalWithTip)}${discStr}${offerStr}${tipStr}`
    )
  }, [floor, catalog, sales, selectedTableId, orderDiscount, tipAmount, tipMethod,
      paymentSplits, paymentIntentId, invoiceNif, invoiceName, invoiceAddress, invoiceEmail,
      modifierData, offers, trainingMode, currentUser, persistFloor,
      setCatalog, persistSales, showToast, resetPaymentState, setSelectedTableId])

  const verifyEmployeePin = useCallback(async (pin: string) => {
    const r = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tpv-key': API_KEY },
      body: JSON.stringify({ action: 'verify', pin, pinHash: await sha256(pin) }),
    })
    if (!r.ok) { showToast('PIN incorrecto'); return null }
    return r.json()
  }, [showToast])

  const getDiscountRates = useCallback(() => {
    const raw = ticketSettings?.personalDiscountRates
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw || {} } catch { return {} }
  }, [ticketSettings])

  const calcPersonalDiscountAmount = useCallback((order: any, rates: Record<string, number>) => {
    return calculatePersonalDiscountAmount(order.items, rates, catalog)
  }, [catalog])

  const applyPersonalDiscount = useCallback(async (orderId: string, employeePin: string): Promise<boolean> => {
    const result = await applyPersonalDiscountOp(floor, employees, catalog, orderId, employeePin, {
      verifyEmployeePin,
      getRates: getDiscountRates,
      showToast,
      euros,
    })
    if (!result) return false
    persistFloor(result.floor)
    setEmployees(result.employees)
    return true
  }, [floor, employees, catalog, verifyEmployeePin, getDiscountRates, persistFloor, showToast, setEmployees])

  const removePersonalDiscount = useCallback((orderId: string) => {
    const result = removePersonalDiscountOp(floor, employees, catalog, orderId, {
      getRates: getDiscountRates,
      showToast,
    })
    if (!result) return
    persistFloor(result.floor)
    setEmployees(result.employees)
  }, [floor, employees, catalog, getDiscountRates, persistFloor, showToast, setEmployees])

  return {
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
    orderTotal, discountedTotal, finalTotal,
    splitsUsed, remaining, canConfirm,
    addSplit, updateSplitAmount, removeSplit, toggleSplitItem,
    closeBill, resetPaymentState,
    verifyEmployeePin, getDiscountRates, calcPersonalDiscountAmount,
    applyPersonalDiscount, removePersonalDiscount,
  }
}
