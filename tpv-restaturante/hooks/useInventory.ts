'use client'

import { useState, useMemo, useCallback } from 'react'
import { saveCatalog, saveOffers, saveCombos, saveMealMenus, savePriceRules } from '../lib/api'
import { enqueueMutation } from '../lib/offline'
import { clone } from '../components/constants'

interface UseInventoryProps {
  catalog: any
  setCatalog: (c: any) => void
  offers: any[]
  setOffers: (o: any[]) => void
  combos: any[]
  setCombos: (c: any[]) => void
  showToast: (msg: string) => void
}

export function useInventory({ catalog, setCatalog, offers, setOffers, combos, setCombos, showToast }: UseInventoryProps) {

  const [newProductOpen, setNewProductOpen] = useState<boolean>(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<any>(null)

  const lowStockProducts = useMemo(
    () => (catalog ? catalog.products.filter((p: any) => p.stock <= p.lowStock) : []),
    [catalog]
  )

  const persistCatalog = useCallback(async (next: any) => {
    setCatalog(next)
    try { await saveCatalog(next) }
    catch {
      enqueueMutation('/api/catalog', JSON.stringify(next))
      showToast('Sin conexión — el catálogo se guardará cuando vuelva la red')
    }
  }, [setCatalog, showToast])

  const addProduct = useCallback((p: any) => {
    const next = clone(catalog)
    const loc = p.ubicacion || 'Bar'
    next.products.push({
      id: 'p_' + Date.now(), name: p.name, category: p.category, price: Number(p.price),
      ubicacion: loc, discount: 0,
      stockByLocation: { [loc]: { stock: Number(p.stock), lowStock: Number(p.lowStock) } },
    })
    if (!next.categories.includes(p.category)) next.categories.push(p.category)
    persistCatalog(next)
    setNewProductOpen(false)
  }, [catalog, persistCatalog])

  const updateProductField = useCallback((id: string, field: string, value: any) => {
    const next = clone(catalog)
    const p = next.products.find((p: any) => p.id === id)
    if (field === 'stockByLocation') {
      p.stockByLocation = value
    } else {
      p[field] = (field === 'name' || field === 'category' || field === 'ubicacion') ? value : Number(value)
    }
    persistCatalog(next)
  }, [catalog, persistCatalog])

  const deleteProduct = useCallback((id: string) => {
    const next = clone(catalog)
    next.products = next.products.filter((p: any) => p.id !== id)
    persistCatalog(next)
    setConfirmDeleteId(null)
  }, [catalog, persistCatalog])

  const saveOffersFn = useCallback(async (next: any) => {
    setOffers(next)
    try { await saveOffers(next) }
    catch { enqueueMutation('/api/offers', JSON.stringify(next)); showToast('Sin conexión — las ofertas se guardarán cuando vuelva la red') }
  }, [showToast])

  const saveCombosFn = useCallback(async (next: any) => {
    setCombos(next)
    try { await saveCombos(next) }
    catch { enqueueMutation('/api/combos', JSON.stringify(next)); showToast('Sin conexión — los combos se guardarán cuando vuelva la red') }
  }, [showToast])

  const saveMealMenusFn = useCallback(async (next: any) => {
    try { await saveMealMenus(next) }
    catch { enqueueMutation('/api/meal-menus', JSON.stringify(next)); showToast('Sin conexión — los menús se guardarán cuando vuelva la red') }
    setCatalog((prev: any) => ({ ...prev, mealMenus: next }))
  }, [setCatalog, showToast])

  const savePriceRulesFn = useCallback(async (rules: any) => {
    try { await savePriceRules(rules) }
    catch { enqueueMutation('/api/price-rules', JSON.stringify(rules)); showToast('Sin conexión — las reglas se guardarán cuando vuelva la red') }
    setCatalog((prev: any) => ({ ...prev, priceRules: rules }))
  }, [setCatalog, showToast])

  const saveCarrusel = useCallback(async (data: any) => {
    const payload = JSON.stringify({ action: 'reorder-carousel', data })
    try {
      await fetch('/api/catalog', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: payload })
    } catch { enqueueMutation('/api/catalog', payload, 'PATCH'); showToast('Sin conexión — el carrusel se guardará cuando vuelva la red') }
    const updated = await fetch('/api/catalog').then(r => r.json())
    setCatalog(updated)
  }, [setCatalog, showToast])

  const saveCartas = useCallback(async (next: any) => {
    setCatalog(next)
    const { categories, products, combos } = next
    try {
      await saveCatalog({ categories, products, combos: combos || catalog.combos || [] })
      showToast('✓ Guardado')
    } catch (e) {
      showToast('Error: ' + ((e as Error)?.message || 'desconocido'))
    }
  }, [catalog, setCatalog, showToast])

  return {
    newProductOpen, setNewProductOpen,
    confirmDeleteId, setConfirmDeleteId,
    lowStockProducts,
    addProduct,
    updateProductField,
    deleteProduct,
    persistCatalog,
    saveOffers: saveOffersFn,
    saveCombos: saveCombosFn,
    saveMealMenus: saveMealMenusFn,
    savePriceRules: savePriceRulesFn,
    saveCarrusel,
    saveCartas,
  }
}
