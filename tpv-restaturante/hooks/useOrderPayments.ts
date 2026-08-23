"use client"

import { useState, useCallback } from 'react'
import type { Floor, Catalog, CurrentUser, Sale, Order } from '../domain/types'
import type { Offer } from '../domain/types'
import type { ModifierData } from '../domain/catalog/modifier-groups'
import { euros } from '../components/constants'
import { saveStockLog } from '../infrastructure/database/stock-log-repository'
import { eventBus } from '../lib/event-bus'
import { addSplit as addSplitOp, updateSplitAmount as updateSplitAmountOp, removeSplit as removeSplitOp, toggleSplitItem as toggleSplitItemOp, computePaymentTotals, type PaymentSplitState } from '@tpv/core'
import { apiFetch } from '@/lib/api'
import { executeCloseOrder } from '../application/CloseOrder/close-order'

export function useOrderPayments(
  floor: Floor,
  catalog: Catalog,
  offers: Offer[],
  sales: Sale[],
  modifierData: ModifierData,
  currentUser: CurrentUser | null,
  trainingMode: boolean,
  selectedTableId: string | null,
  selectedOrder: Order | null,
  persistFloor: (next: Floor) => Promise<void>,
  persistSales: (next: Sale[]) => void,
  setSelectedTableId: (v: string | null) => void,
  setCatalog: (c: Catalog) => void,
  showToast: (msg: string) => void,
) {
  const [paying, setPaying] = useState(false)
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitState[]>([])
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [tipAmount, setTipAmount] = useState(0)
  const [tipMethod, setTipMethod] = useState('efectivo')
  const [paymentIntentId, setPaymentIntentId] = useState('')
  const [invoiceNif, setInvoiceNif] = useState('')
  const [invoiceName, setInvoiceName] = useState('')
  const [invoiceAddress, setInvoiceAddress] = useState('')
  const [invoiceEmail, setInvoiceEmail] = useState('')

  const totals = computePaymentTotals(selectedOrder?.items ?? [], catalog, orderDiscount, tipAmount, paymentSplits)
  const { orderTotal, discountedTotal, finalTotal, splitsUsed, remaining, canConfirm } = totals

  const addSplit = useCallback((method: string) => {
    setPaymentSplits((prev) => addSplitOp(prev, method, finalTotal))
  }, [finalTotal])

  const updateSplitAmount = useCallback((id: string, value: string) => {
    setPaymentSplits((prev) => updateSplitAmountOp(prev, id, value))
  }, [])

  const removeSplit = useCallback((id: string) => {
    setPaymentSplits((prev) => removeSplitOp(prev, id))
  }, [])

  const toggleSplitItem = useCallback((splitId: string, itemId: string) => {
    setPaymentSplits((prev) => toggleSplitItemOp(prev, splitId, itemId, selectedOrder?.items ?? []))
  }, [selectedOrder])

  const updateSplitCode = useCallback((id: string, value: string) => {
    setPaymentSplits((prev) => prev.map(p => p.id === id ? { ...p, code: value.toUpperCase() } : p))
  }, [])

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

  const closeBill = useCallback(async () => {
    if (!selectedTableId || !floor) return
    const table = floor.tables?.find((t) => t.id === selectedTableId)
    if (!table || !table.orderId) return
    const order: Order = floor.orders?.[table.orderId] as Order
    if (!order) return

    const giftSplits = paymentSplits.filter(s => s.method === 'gift' && s.code && s.amount > 0)
    for (const g of giftSplits) {
      try {
        await apiFetch('/api/gift-cards', {
          method: 'POST',
          body: JSON.stringify({ action: 'redeem', code: g.code, amount: g.amount }),
        })
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        showToast('Error tarjeta regalo (' + (g.code || '?') + '): ' + (m || 'saldo insuficiente'))
        return
      }
    }

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
    const offerStr = (sale.offerDiscount ?? 0) > 0 ? ` (oferta -${euros(sale.offerDiscount ?? 0)})` : ''

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
      tableId: table.id, tableName: table.name || 'Mesa',
      items: sale.items, subtotal: sale.subtotal, discount: orderDiscount, total: sale.total, tip: tipAmount, totalWithTip: sale.totalWithTip,
      paymentMethod: sale.paymentMethod, payments: sale.payments, isFiado: sale.isFiado, isDebtPayment: wasDebt,
      employeeId: currentUser?.id || null, employeeName: currentUser?.name || null,
      closedAt: String(sale.closedAt),
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
      setCatalog, persistSales, showToast, resetPaymentState, setSelectedTableId, apiFetch])

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
    addSplit, updateSplitAmount, removeSplit, toggleSplitItem, updateSplitCode,
    closeBill, resetPaymentState,
  }
}
