'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, Search, Package, AlertCircle, Hash } from 'lucide-react'
import { type Theme } from '@/components/constants'

interface StockLocation {
  stock: number
  lowStock: number
}

interface StockProduct {
  id: string
  name: string
  category: string
  image?: string
  stockByLocation?: Record<string, StockLocation>
}

interface StockAlertasViewProps {
  catalog: { products?: StockProduct[] } | null
  colors: Theme
  onNavigateToProduct?: (productId: string) => void
}

export default function StockAlertasView({ catalog, colors: C, onNavigateToProduct }: StockAlertasViewProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'out' | 'low'>('all')

  const alerts = useMemo(() => {
    if (!catalog?.products) return []
    return catalog.products
      .filter(p => {
        if (!p.stockByLocation) return false
        return Object.values(p.stockByLocation).some(e => e.stock <= e.lowStock)
      })
      .map(p => {
        const locations = Object.entries(p.stockByLocation || {})
          .filter(([, e]) => e.stock <= e.lowStock)
          .map(([loc, e]) => ({ location: loc, stock: e.stock, lowStock: e.lowStock }))
        return { ...p, alerts: locations }
      })
      .filter(p => {
        if (filter === 'out') return p.alerts.some(a => a.stock === 0)
        if (filter === 'low') return p.alerts.every(a => a.stock > 0)
        return true
      })
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
  }, [catalog, search, filter])

  const outOfStock = alerts.filter(p => p.alerts.some(a => a.stock === 0)).length
  const lowStock = alerts.filter(p => p.alerts.every(a => a.stock > 0)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl" style={{ color: C.cream }}>Alertas de Stock</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: C.wine + '30', color: C.wine }}>
            {alerts.length} alertas
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.muted }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: '2.5rem' }}
            className="w-full rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-1">
          {(['all', 'out', 'low'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                background: filter === f ? C.brass : C.surfaceLight,
                color: filter === f ? C.base : C.muted,
                border: `1px solid ${filter === f ? C.brass : C.line}`,
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80">
              {f === 'all' ? 'Todas' : f === 'out' ? 'Sin stock' : 'Stock bajo'}
            </button>
          ))}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 mx-auto mb-3" style={{ color: C.sage, opacity: 0.6 }} />
          <p style={{ color: C.muted }} className="text-sm">
            {search || filter !== 'all' ? 'No hay productos que coincidan' : 'No hay alertas de stock'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(p => (
            <div key={p.id}
              onClick={() => onNavigateToProduct?.(p.id)}
              style={{ background: C.surface, border: `1px solid ${C.line}` }}
              className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
              <div className="flex items-center gap-3 px-4 py-3">
                {p.image ? (
                  <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: C.surfaceLight }}>
                    <Package className="w-5 h-5" style={{ color: C.muted }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: C.cream }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: C.muted }}>{p.category}</p>
                </div>
                <div className="flex gap-2">
                  {p.alerts.map(a => (
                    <div key={a.location}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap"
                      style={{
                        background: a.stock === 0 ? C.wine + '30' : C.brass + '30',
                        color: a.stock === 0 ? C.wine : C.brassLight,
                      }}>
                      {a.stock === 0 ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {a.location}: <Hash className="w-2.5 h-2.5 inline" />{a.stock}/{a.lowStock}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
