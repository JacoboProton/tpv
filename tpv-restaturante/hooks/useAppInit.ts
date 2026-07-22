'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Employee } from '../domain/types'
import {
  runMigrate, fetchCatalog, saveCatalog,
  fetchFloor, saveFloor,
  fetchSales,
  fetchEmployees, saveEmployees,
  fetchSettings, fetchOffers, fetchCombos,
} from '../lib/api'
import { cacheGet, cacheSet } from '../lib/offline'
import { seedCatalog, seedFloor, seedEmployees } from '../components/constants'
import { normalizeTableFields, migrateTo3ColumnLayout } from '../domain/tables/floor-layout'

interface UseAppInitProps {
  tenantId: string
  setTenants: (t: any[]) => void
  setCatalog: (c: any) => void
  setFloor: (f: any) => void
  setEmployees: (e: any) => void
  setSales: (s: any) => void
  setTicketSettings: (s: Record<string, any>) => void
  setOffers: (o: any[]) => void
  setCombos: (c: any[]) => void
  tryRestoreSession: (emps: Employee[]) => Promise<any>
}

export function useAppInit({
  tenantId, setTenants,
  setCatalog, setFloor, setEmployees, setSales,
  setTicketSettings, setOffers, setCombos,
  tryRestoreSession,
}: UseAppInitProps) {

  const [loading, setLoading] = useState(true)
  const [fatalError, setFatalError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setFatalError(null)
    try {
      await runMigrate().catch(() => {})

      const tnts: any[] = await fetch('/api/tenants').then(r => r.json()).catch(() => [])
      if (tnts.length > 0 && !tnts.find((t: any) => t.id === tenantId)) {
        window.location.reload()
        return
      }
      setTenants(tnts)

      const preFetchCache: any = cacheGet('sales')

      const [cat, flr, sls, emps]: [any, any, any, any] = await Promise.all([
        fetchCatalog(),
        fetchFloor(),
        fetchSales(),
        fetchEmployees(),
      ])

      if (!cat?.products || cat.products.length === 0) {
        const seed = seedCatalog()
        await saveCatalog(seed)
        setCatalog(seed)
      } else {
        setCatalog(cat)
      }

      if (!flr?.tables || flr.tables.length === 0) {
        const seed = seedFloor()
        await saveFloor(seed as any)
        setFloor(seed)
      } else {
        const normalized = normalizeTableFields(flr.tables)
        flr.tables = normalized
        if (flr.tables.filter((t: any) => t.type === 'barra').length < 6) {
          const migrated = migrateTo3ColumnLayout(flr)
          Object.assign(flr, migrated)
          await saveFloor(flr)
        }
        setFloor(flr)
      }

      if (!emps?.length) {
        const seed = seedEmployees()
        await saveEmployees(seed)
        setEmployees(seed)
      } else {
        setEmployees(emps)
      }

      await tryRestoreSession(emps)

      const salesFromApi = Array.isArray(sls) ? sls : []
      if (Array.isArray(preFetchCache) && preFetchCache.length > 0) {
        const apiIds = new Set(salesFromApi.map((s: any) => s.id))
        const missing = preFetchCache.filter((s: any) => s.id && !apiIds.has(s.id))
        if (missing.length > 0) salesFromApi.push(...missing)
      }
      setSales(salesFromApi)
      cacheSet('sales', salesFromApi)

      const stg = await fetchSettings().catch(() => null)
      if (stg) setTicketSettings(stg)
      const off: any = await fetchOffers().catch(() => [])
      setOffers(off)
      const cmb: any = cat?.combos || await fetchCombos().catch(() => [])
      setCombos(cmb)
    } catch (err) {
      console.error('Error cargando datos:', err)
      setFatalError((err as Error)?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [tenantId, setTenants, setCatalog, setFloor, setEmployees, setSales,
      setTicketSettings, setOffers, setCombos, tryRestoreSession])

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (loading) return
    loadAll()
  }, [tenantId])

  return { loading, fatalError, loadAll }
}
