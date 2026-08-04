"use client"

import { useState } from 'react'
import type { ModifierSelectionState, ItemModifierEdit } from './useOrderItems'

export function useModifierSelector() {
  const [showModifierSelector, setShowModifierSelector] = useState<ModifierSelectionState | null>(null)
  const [editingItemModifiers, setEditingItemModifiers] = useState<ItemModifierEdit | null>(null)

  return {
    showModifierSelector, setShowModifierSelector,
    editingItemModifiers, setEditingItemModifiers,
  }
}
