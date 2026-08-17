'use client'

import { useState, useEffect, useCallback } from 'react'
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
import type { Tenant, Catalog, Floor, Sale, Employee, Offer, Combo, TicketSettings } from '../domain/types'

interface UseAppInitProps {
  tenantId: string
  setTenants: (t: Tenant[]) => void
  setCatalog: (c: Catalog) => void
  setFloor: (f: Floor) => void
  setEmployees: (e: Employee[]) => void
  setSales: (s: Sale[]) => void
  setTicketSettings: (s: TicketSettings) => void
  setOffers: (o: Offer[]) => void
  setCombos: (c: Combo[]) => void
  tryRestoreSession: (emps: Employee[]) => Promise<Employee | null>
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
    // Guard: no lanzar peticiones a la API si no hay sesión activa.
    // Evita errores 401 en la pantalla de login y en tests E2E sin autenticar.
    const hasSession = typeof window !== 'undefined' &&
      !!localStorage.getItem('tpv:current_user')
    if (!hasSession) {
      setLoading(false)
      return
    }

    setLoading(true)
    setFatalError(null)
    try {
      await runMigrate().catch(() => {})

      const tnts: Tenant[] = await fetch('/api/tenants').then(r => r.json()).catch(() => [])
      if (tnts.length > 0 && !tnts.find((t) => t.id === tenantId)) {
        window.location.reload()
        return
      }
      setTenants(tnts)

      const preFetchCache = cacheGet<Sale[]>('sales')

      const [catRaw, flrRaw, slsRaw, empsRaw] = await Promise.all([
        fetchCatalog(),
        fetchFloor(),
        fetchSales(),
        fetchEmployees(),
      ])
      const cat = catRaw as Catalog
      const flr = flrRaw as Floor
      const sls = slsRaw as Sale[]
      const emps = empsRaw as Employee[]

      if (!cat?.products || cat.products.length === 0) {
        const seed = seedCatalog()
        await saveCatalog(seed)
        setCatalog(seed as unknown as Catalog)
      } else {
        setCatalog(cat)
      }

      if (!flr?.tables || flr.tables.length === 0) {
        const seed = seedFloor()
        await saveFloor(seed as unknown as Record<string, unknown>)
        setFloor(seed as unknown as Floor)
      } else {
        const normalized = normalizeTableFields(flr.tables)
        flr.tables = normalized
        if (flr.tables.filter((t) => t.type === 'barra').length < 6) {
          const migrated = migrateTo3ColumnLayout(flr)
          Object.assign(flr, migrated)
          await saveFloor(flr as unknown as Record<string, unknown>)
        }
        setFloor(flr)
      }

      if (!emps?.length) {
        const seed = seedEmployees()
        await saveEmployees(seed)
        setEmployees(seed as unknown as Employee[])
      } else {
        setEmployees(emps)
      }

      await tryRestoreSession(emps)

      const salesFromApi = Array.isArray(sls) ? sls : []
      if (Array.isArray(preFetchCache) && preFetchCache.length > 0) {
        const apiIds = new Set(salesFromApi.map((s) => s.id))
        const missing = preFetchCache.filter((s) => s.id && !apiIds.has(s.id))
        if (missing.length > 0) salesFromApi.push(...missing)
      }
      setSales(salesFromApi)
      cacheSet('sales', salesFromApi)

      const stg = await fetchSettings().catch(() => null)
      if (stg) setTicketSettings(stg as TicketSettings)
      const off = await fetchOffers().catch(() => []) as Offer[]
      setOffers(off)
      const cmb = (cat?.combos as Combo[] | undefined) || (await fetchCombos().catch(() => [])) as Combo[]
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
