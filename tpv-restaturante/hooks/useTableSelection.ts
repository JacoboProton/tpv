"use client"

import { useState } from 'react'
import type { Floor } from '../domain/types'

export function useTableSelection(floor: Floor) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Todos')

  const selectedTable = floor?.tables?.find((t) => t.id === selectedTableId) ?? null
  const activeOrderId = activeTicketId || selectedTable?.orderIds?.[0] || selectedTable?.orderId
  const selectedOrder = (activeOrderId ? floor?.orders?.[activeOrderId] : null) ?? null

  return {
    selectedTableId, setSelectedTableId,
    activeTicketId, setActiveTicketId,
    activeCategory, setActiveCategory,
    selectedTable, activeOrderId, selectedOrder,
  }
}
