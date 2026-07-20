"use client"

import { useCallback } from 'react'
import { addNormalItem, addMenuItems, addComboItems, editItemModifiers as editItemModifiersOp } from '../application/AddItemsToOrder/add-items-to-order'
import {
  changeItemQuantity as changeItemQuantityOp,
  updateItemNotes as updateItemNotesOp,
  removeItemFromOrder,
  sendToKitchenCourse as sendToKitchenCourseOp,
  sendSingleItemToKitchen,
  updateItemCourse as updateItemCourseOp,
  markItemsReady,
  voidOrderItem as voidOrderItemOp,
  setLineDiscount as setLineDiscountOp,
  removeLineDiscount as removeLineDiscountOp,
  setItemCourtesy as setItemCourtesyOp,
  removeItemCourtesy as removeItemCourtesyOp,
  setItemOverridePrice as setItemOverridePriceOp,
} from '../application/OrderItemOperations/order-item-operations'
import { eventBus } from '../lib/event-bus'

export function useOrderItems(
  floor: any,
  selectedTableId: string | null,
  activeTicketId: string | null,
  catalog: any,
  currentUser: any,
  modifierData: any,
  showModifierSelector: any,
  editingItemModifiers: any,
  setShowModifierSelector: (v: any) => void,
  setEditingItemModifiers: (v: any) => void,
  setActiveTicketId: (v: any) => void,
  persistFloor: (next: any) => Promise<void>,
  showToast: (msg: string) => void,
  broadcastReadyNotification: (tableName: string, names: string[], employeeName: string, tenantId: string) => void,
  tenantId: string,
) {
  const getContext = useCallback(() => {
    if (!selectedTableId || !floor) return null
    const table = floor?.tables?.find((t: any) => t.id === selectedTableId)
    if (!table) return null
    const activeOid = activeTicketId || table.orderIds?.[0] || table.orderId
    const order = activeOid ? floor.orders[activeOid] : null
    return { table, order, activeOid }
  }, [selectedTableId, floor, activeTicketId])

  const getModifierGroupsForProduct = useCallback((productId: string) => {
    const groupIds = modifierData.productModifiers[productId] || []
    return modifierData.groups.filter((g: any) => groupIds.includes(g.id))
  }, [modifierData])

  const addItem = useCallback((product: any) => {
    if (product.isMenu && product.menuData) {
      if (!selectedTableId) return
      const result = addMenuItems(floor, selectedTableId, catalog, {
        product, menuSel: product.menuSel,
        employeeName: currentUser?.name,
      })
      if (result) persistFloor(result.floor)
      return
    }
    if (product.isCombo && product.comboData) {
      if (!selectedTableId) return
      const result = addComboItems(floor, selectedTableId, catalog, {
        product, menuSel: product.comboSel,
        employeeName: currentUser?.name,
      })
      if (result) persistFloor(result.floor)
      return
    }
    handleAddItemWithModifiers(product)
  }, [floor, catalog, selectedTableId, currentUser, persistFloor])

  const handleAddItemWithModifiers = useCallback((product: any) => {
    const groups = getModifierGroupsForProduct(product.id)
    if (groups.length > 0) {
      setShowModifierSelector({ product, groups })
    } else {
      addItemWithPrice(product, [], 0)
    }
  }, [getModifierGroupsForProduct])

  const addItemWithPrice = useCallback((product: any, modifiers: any[], extraPrice: number) => {
    if (!selectedTableId) return
    const result = addNormalItem(floor, selectedTableId, catalog, {
      product, modifiers, extraPrice,
      employeeName: currentUser?.name,
      activeTicketId,
    })
    if (!result) return
    if (result.isNewOrder) {
      const order = (result.floor as any).orders[result.orderId]
      eventBus.emit('order:created', {
        orderId: result.orderId, tableId: selectedTableId, tableName: '',
        items: order.items.map((i: any) => ({ productId: i.productId, name: i.name, qty: i.qty })),
        employeeName: currentUser?.name || null, createdAt: order.createdAt,
      })
      setActiveTicketId(result.orderId)
    }
    persistFloor(result.floor)
  }, [floor, catalog, selectedTableId, activeTicketId, currentUser, persistFloor])

  const confirmModifiersAndAdd = useCallback((modifiers: any[]) => {
    const product = showModifierSelector.product
    const extraPrice = modifiers.reduce((s: any, m: any) => s + (m.priceDelta || 0), 0)
    setShowModifierSelector(null)
    if (editingItemModifiers) {
      if (!selectedTableId) return
      const next = editItemModifiersOp(floor, selectedTableId, catalog, {
        itemId: editingItemModifiers.item.id, product, modifiers, extraPrice,
      })
      if (next) { persistFloor(next); setEditingItemModifiers(null) }
      return
    }
    addItemWithPrice(product, modifiers, extraPrice)
  }, [showModifierSelector, editingItemModifiers, floor, catalog, selectedTableId, persistFloor])

  const changeQty = useCallback((itemId: string, delta: number) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = changeItemQuantityOp(floor, ctx.activeOid, itemId, delta)
    if (next) persistFloor(next)
  }, [floor, getContext, persistFloor])

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = updateItemNotesOp(floor, ctx.activeOid, itemId, notes)
    if (next) persistFloor(next)
  }, [floor, getContext, persistFloor])

  const removeItem = useCallback((itemId: string) => {
    if (!selectedTableId) return
    const ctx = getContext()
    if (!ctx?.activeOid) return
    const next = removeItemFromOrder(floor, selectedTableId, ctx.activeOid, itemId)
    if (next) persistFloor(next)
  }, [floor, selectedTableId, getContext, persistFloor])

  const sendToKitchenCourse = useCallback((course?: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = sendToKitchenCourseOp(floor, ctx.activeOid, course)
    if (next) {
      const count = next.orders[ctx.activeOid].items.filter((i: any) => i.sent && !i.sentAt ? false : true).length
      persistFloor(next)
      showToast(`${course || 'Todo'} enviado a cocina`)
    }
  }, [floor, getContext, persistFloor, showToast])

  const sendItemToKitchen = useCallback((itemId: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const result = sendSingleItemToKitchen(floor, ctx.activeOid, itemId)
    if (result) {
      persistFloor(result.floor)
      eventBus.emit('item:sent', {
        orderId: ctx.activeOid, itemId,
        productName: result.itemName, course: result.course,
        tableName: result.tableName,
      })
      showToast(`${result.itemName} enviado a cocina`)
    }
  }, [floor, getContext, persistFloor, showToast])

  const updateItemCourse = useCallback((itemId: string, course?: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = updateItemCourseOp(floor, ctx.activeOid, itemId, course)
    if (next) persistFloor(next)
  }, [floor, getContext, persistFloor])

  const editItemModifiers = useCallback((item: any, product: any) => {
    const groups = getModifierGroupsForProduct(product.id)
    if (groups.length === 0) return
    setEditingItemModifiers({ item, product, groups })
    setShowModifierSelector({ product, groups })
  }, [getModifierGroupsForProduct])

  const markReady = useCallback((orderId: string, ubicacion?: string) => {
    const result = markItemsReady(floor, orderId, ubicacion)
    if (!result) return
    persistFloor(result.floor)
    broadcastReadyNotification(result.tableName, result.names, floor.orders[orderId]?.employeeName, tenantId)
  }, [floor, persistFloor, broadcastReadyNotification, tenantId])

  const voidSentItem = useCallback((itemId: string, reason: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = voidOrderItemOp(floor, ctx.activeOid, itemId, reason, currentUser?.name)
    if (next) persistFloor(next)
  }, [floor, getContext, currentUser, persistFloor])

  const setItemDiscount = useCallback((itemId: string, pct: number) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = setLineDiscountOp(floor, ctx.activeOid, itemId, pct)
    if (next) persistFloor(next)
  }, [floor, getContext, persistFloor])

  const removeItemDiscount = useCallback((itemId: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = removeLineDiscountOp(floor, ctx.activeOid, itemId)
    if (next) persistFloor(next)
  }, [floor, getContext, persistFloor])

  const setItemCourtesy = useCallback((itemId: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = setItemCourtesyOp(floor, ctx.activeOid, itemId)
    if (next) persistFloor(next)
  }, [floor, getContext, persistFloor])

  const removeItemCourtesy = useCallback((itemId: string) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = removeItemCourtesyOp(floor, ctx.activeOid, itemId)
    if (next) persistFloor(next)
  }, [floor, getContext, persistFloor])

  const setItemPrice = useCallback((itemId: string, newPrice: number) => {
    const ctx = getContext()
    if (!ctx?.order) return
    const next = setItemOverridePriceOp(floor, ctx.activeOid, itemId, newPrice)
    if (next) persistFloor(next)
  }, [floor, getContext, persistFloor])

  return {
    addItem, addItemWithPrice, handleAddItemWithModifiers,
    confirmModifiersAndAdd, changeQty, updateItemNotes, removeItem,
    sendToKitchenCourse, sendItemToKitchen, updateItemCourse,
    editItemModifiers, markReady, voidSentItem,
    getModifierGroupsForProduct,
    setItemDiscount, removeItemDiscount,
    setItemCourtesy, removeItemCourtesy, setItemPrice,
    getContext,
  }
}
