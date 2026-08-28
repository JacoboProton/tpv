'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { captureException } from '@sentry/nextjs'
import { setSentryUser } from '../lib/sentry-context'
import {
  runMigrate, fetchCatalog, saveCatalog,
  fetchFloor, saveFloor,
  fetchSales, unpackList,
  fetchEmployees, saveEmployees,
  fetchSettings, fetchOffers, fetchCombos,
} from '../lib/api'
import { cacheGet, cacheSet } from '../lib/offline'
import { seedCatalog, seedFloor, seedEmployees } from '../components/constants'
import { normalizeTableFields, migrateTo3ColumnLayout } from '../domain/tables/floor-layout'
import type { Tenant, Catalog, Floor, Sale, Employee, Offer, Combo, TicketSettings, CurrentUser } from '../domain/types'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isUnknownArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function isCatalog(v: unknown): v is Catalog {
  return isRecord(v) && isUnknownArray(v.products) && isUnknownArray(v.categories)
}

function isFloor(v: unknown): v is Floor {
  return isRecord(v) && isUnknownArray(v.tables) && isRecord(v.orders)
}

function isSale(v: unknown): v is Sale {
  return isRecord(v) && typeof v.id === 'string'
}

function isEmployee(v: unknown): v is Employee {
  return isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string'
}

function isOffer(v: unknown): v is Offer {
  return isRecord(v) && typeof v.active === 'boolean' && isUnknownArray(v.days)
}

function isCombo(v: unknown): v is Combo {
  return isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string'
}

interface UseAppInitProps {
  tenantId: string
  setTenantId: (id: string) => void
  setTenants: (t: Tenant[]) => void
  setCatalog: (c: Catalog) => void
  setFloor: (f: Floor) => void
  setEmployees: (e: Employee[]) => void
  setSales: (s: Sale[]) => void
  setTicketSettings: (s: TicketSettings) => void
  setOffers: (o: Offer[]) => void
  setCombos: (c: Combo[]) => void
  currentUser: CurrentUser | null
  tryRestoreSession: (emps: Employee[]) => Promise<Employee | null>
}

export function useAppInit({
  tenantId, setTenantId,
  setTenants,
  setCatalog, setFloor, setEmployees, setSales,
  setTicketSettings, setOffers, setCombos,
  currentUser, tryRestoreSession,
}: UseAppInitProps) {

  const [loading, setLoading] = useState(true)
  const [fatalError, setFatalError] = useState<string | null>(null)

  const loadedRef = useRef(false)

  const loadAll = useCallback(async () => {
    // Guard: sin sesión activa no hay peticiones a la API (evita 401 en login
    // y en tests E2E), pero SÍ seed de empleados: la pantalla de login necesita
    // usuarios para poder entrar en un terminal nuevo.
    const hasSession = typeof window !== 'undefined' &&
      !!localStorage.getItem('tpv:current_user')
    if (!hasSession) {
      setEmployees(seedEmployees())
      setLoading(false)
      return
    }
    loadedRef.current = true

    setLoading(true)
    setFatalError(null)
    try {
      setSentryUser({ tenantId, employeeName: currentUser?.name })
      await runMigrate().catch(() => {})

      const tnts: Tenant[] = await fetch('/api/tenants').then(r => r.json()).catch(() => [])
      if (tnts.length > 0 && !tnts.find((t) => t.id === tenantId)) {
        try { localStorage.removeItem('tpv:tenant') } catch {}
        setTenantId('default')
        return
      }
      setTenants(tnts)

      const preFetchCache = cacheGet<Sale[]>('sales:p1:s50')

      const [catRaw, flrRaw, slsRaw, empsRaw]: unknown[] = await Promise.all([
        fetchCatalog(),
        fetchFloor(),
        fetchSales(),
        fetchEmployees(),
      ])
      const cat = isCatalog(catRaw) ? catRaw : null
      const flr = isFloor(flrRaw) ? flrRaw : null
      const sls = unpackList<Sale>(slsRaw).filter((s) => isSale(s))
      const emps = unpackList<Employee>(empsRaw).filter((e) => isEmployee(e))

      if (cat && (!cat.products || cat.products.length === 0)) {
        const seed = seedCatalog()
        await saveCatalog(seed)
        setCatalog(seed)
      } else if (cat) {
        setCatalog(cat)
      }

      if (flr && (!flr.tables || flr.tables.length === 0)) {
        const seed = seedFloor()
        await saveFloor(seed)
        setFloor(seed)
      } else if (flr) {
        const normalized = normalizeTableFields(flr.tables)
        flr.tables = normalized
        if (flr.tables.filter((t) => t.type === 'barra').length < 6) {
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
        const apiIds = new Set(salesFromApi.map((s) => s.id))
        const missing = preFetchCache.filter((s) => s.id && !apiIds.has(s.id))
        if (missing.length > 0) salesFromApi.push(...missing)
      }
      setSales(salesFromApi)
      cacheSet('sales:p1:s50', salesFromApi)

      const stg = await fetchSettings().catch(() => null)
      if (isRecord(stg)) setTicketSettings(stg)
      const off = await fetchOffers().catch(() => [])
      const offList: unknown[] = isUnknownArray(off) ? off : []
      setOffers(offList.filter((o): o is Offer => isOffer(o)))
      const combosRaw: unknown = await fetchCombos().catch(() => [])
      const cmbList: unknown[] = isUnknownArray(combosRaw) ? combosRaw : []
      setCombos(cat?.combos || cmbList.filter((c): c is Combo => isCombo(c)))
    } catch (err) {
      console.error('Error cargando datos:', err)
      captureException(err)
      setFatalError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [tenantId, setTenantId, setTenants, setCatalog, setFloor, setEmployees, setSales,
      setTicketSettings, setOffers, setCombos, currentUser, tryRestoreSession])

  const loadAllRef = useRef(loadAll)
  useEffect(() => { loadAllRef.current = loadAll })

  useEffect(() => { void loadAllRef.current() }, [])

  const prevTenantRef = useRef(tenantId)
  useEffect(() => {
    if (prevTenantRef.current === tenantId) return
    prevTenantRef.current = tenantId
    void loadAllRef.current()
  }, [tenantId])

  useEffect(() => {
    if (!currentUser || loadedRef.current) return
    void loadAllRef.current()
  }, [currentUser])

  return { loading, fatalError, loadAll }
}
