'use client'

import { useEffect } from 'react'

interface ShortcutHandlers {
  onToggleCommandPalette: () => void
  onEscape: () => void
  onFocusSearch: () => void
  onOpenPayment: () => void
  onQuickCash: () => void
  onQuickCard: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        handlers.onToggleCommandPalette()
        return
      }
      if (e.key === 'Escape') {
        handlers.onEscape()
        return
      }
      if (e.key === '/') {
        const input = document.querySelector('[data-search-products]')
        if (input) { e.preventDefault(); (input as HTMLElement).focus(); return }
        handlers.onFocusSearch()
        return
      }
      if (e.altKey && e.key === 'p') {
        e.preventDefault()
        handlers.onOpenPayment()
        return
      }
      if (e.altKey && e.key === 'e') {
        e.preventDefault()
        handlers.onQuickCash()
        return
      }
      if (e.altKey && e.key === 't') {
        e.preventDefault()
        handlers.onQuickCard()
        return
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [handlers])
}
