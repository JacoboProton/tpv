'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Theme } from '@/components/constants'
import type {
  Floor, Catalog, Sale, Employee, Offer, Combo, TicketSettings, CurrentUser,
  PriceRule, MealMenu, NewProductInput, RefundInput,
} from '@tpv/core'

export interface ViewHandlers {
  setSelectedTableId: (id: string | null) => void
  setActiveCategory: (cat: string) => void
  setShowFloorEditor: (v: boolean) => void
  setAlmacenUbicacion: (v: string | null) => void
  setView: (v: string) => void
  markReady: (orderId: string, ubicacion?: string) => void
  updateItemState: (next: Floor, action: { orderId: string, itemId: string | null, previousState: string | null }) => void
  advanceOrder: (next: Floor) => void
  agotarProducto: (productId: string, agotado: boolean) => Promise<void>
  reprintKitchenTicket: (orderId: string) => void
  updateProductField: (id: string, field: string, value: string | number | boolean) => void
  addProduct: (p: NewProductInput) => void
  deleteProduct: (id: string) => void
  saveCartas: (next: Catalog) => Promise<void>
  saveOffersFn: (next: Offer[]) => Promise<void>
  saveCombosFn: (next: Combo[]) => Promise<void>
  saveMealMenusFn: (next: MealMenu[]) => Promise<void>
  saveCarrusel: (data: unknown) => Promise<void>
  savePriceRulesFn: (rules: PriceRule[]) => Promise<void>
  handleRefund: (saleId: string, refund: RefundInput) => void
  handleConfirmBizum: (saleId: string) => void
  printInvoice: (sale: Sale) => Promise<void>
  handleDownloadPdf: (sale: Sale) => Promise<void>
  handleSendInvoiceEmail: (sale: Sale) => Promise<void>
  addEmployee: (emp: Partial<Employee>) => void
  updateEmployeeField: (id: string, f: string, value: string | number | boolean) => void
  deleteEmployee: (id: string) => void
}

export interface ViewData {
  floor: Floor | null
  catalog: Catalog | null
  sales: Sale[]
  employees: Employee[]
  offers: Offer[]
  combos: Combo[]
  colors: Theme
  ticketSettings: TicketSettings
  currentUser: CurrentUser | null
  showToast: (msg: string) => void
  almacenUbicacion: string | null
  showFloorEditor: boolean
  persistFloor: (next: Floor) => Promise<void>
  newProductOpen: boolean
  setNewProductOpen: (v: boolean) => void
  confirmDeleteId: string | null
  setConfirmDeleteId: (v: string | null) => void
}

export interface FloorContextValue {
  floor: Floor | null
  showFloorEditor: boolean
  setShowFloorEditor: (v: boolean) => void
  persistFloor: (next: Floor) => Promise<void>
  markReady: (orderId: string, ubicacion?: string) => void
  updateItemState: (next: Floor, action: { orderId: string; itemId: string | null; previousState: string | null }) => void
  advanceOrder: (next: Floor) => void
  agotarProducto: (productId: string, agotado: boolean) => Promise<void>
  reprintKitchenTicket: (orderId: string) => void
  setSelectedTableId: (id: string | null) => void
}

export interface CatalogContextValue {
  catalog: Catalog | null
  offers: Offer[]
  combos: Combo[]
  setActiveCategory: (cat: string) => void
  almacenUbicacion: string | null
  setAlmacenUbicacion: (v: string | null) => void
  updateProductField: (id: string, field: string, value: string | number | boolean) => void
  addProduct: (p: NewProductInput) => void
  deleteProduct: (id: string) => void
  saveCartas: (next: Catalog) => Promise<void>
  saveOffersFn: (next: Offer[]) => Promise<void>
  saveCombosFn: (next: Combo[]) => Promise<void>
  saveMealMenusFn: (next: MealMenu[]) => Promise<void>
  saveCarrusel: (data: unknown) => Promise<void>
  savePriceRulesFn: (rules: PriceRule[]) => Promise<void>
  newProductOpen: boolean
  setNewProductOpen: (v: boolean) => void
  confirmDeleteId: string | null
  setConfirmDeleteId: (v: string | null) => void
}

export interface AuthContextValue {
  currentUser: CurrentUser | null
  employees: Employee[]
  addEmployee: (emp: Partial<Employee>) => void
  updateEmployeeField: (id: string, f: string, value: string | number | boolean) => void
  deleteEmployee: (id: string) => void
}

export interface SalesContextValue {
  sales: Sale[]
  ticketSettings: TicketSettings
  handleRefund: (saleId: string, refund: RefundInput) => void
  handleConfirmBizum: (saleId: string) => void
  printInvoice: (sale: Sale) => Promise<void>
  handleDownloadPdf: (sale: Sale) => Promise<void>
  handleSendInvoiceEmail: (sale: Sale) => Promise<void>
}

export interface UiContextValue {
  colors: Theme
  showToast: (msg: string) => void
  view: string
  setView: (v: string) => void
}

const FloorContext = createContext<FloorContextValue | null>(null)
const CatalogContext = createContext<CatalogContextValue | null>(null)
const AuthContext = createContext<AuthContextValue | null>(null)
const SalesContext = createContext<SalesContextValue | null>(null)
const UiContext = createContext<UiContextValue | null>(null)

export function useFloor(): FloorContextValue {
  const ctx = useContext(FloorContext)
  if (!ctx) throw new Error('useFloor must be used within AppProviders')
  return ctx
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within AppProviders')
  return ctx
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AppProviders')
  return ctx
}

export function useSales(): SalesContextValue {
  const ctx = useContext(SalesContext)
  if (!ctx) throw new Error('useSales must be used within AppProviders')
  return ctx
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within AppProviders')
  return ctx
}

export interface AppProvidersProps {
  children: ReactNode
  data: ViewData
  handlers: ViewHandlers
  view: string
}

export default function AppProviders({ children, data, handlers, view }: AppProvidersProps) {
  const {
    floor, catalog, sales, employees, offers, combos, colors, ticketSettings,
    currentUser, showToast, almacenUbicacion, showFloorEditor, persistFloor,
    newProductOpen, setNewProductOpen, confirmDeleteId, setConfirmDeleteId,
  } = data

  const {
    setSelectedTableId, setActiveCategory, setShowFloorEditor, setAlmacenUbicacion,
    setView, markReady, updateItemState, advanceOrder, agotarProducto, reprintKitchenTicket,
    updateProductField, addProduct, deleteProduct,
    saveCartas, saveOffersFn, saveCombosFn, saveMealMenusFn, saveCarrusel, savePriceRulesFn,
    handleRefund, handleConfirmBizum, printInvoice, handleDownloadPdf, handleSendInvoiceEmail,
    addEmployee, updateEmployeeField, deleteEmployee,
  } = handlers

  return (
    <FloorContext.Provider
      value={{
        floor, showFloorEditor, setShowFloorEditor, persistFloor,
        markReady, updateItemState, advanceOrder, agotarProducto, reprintKitchenTicket,
        setSelectedTableId,
      }}
    >
      <CatalogContext.Provider
        value={{
          catalog, offers, combos, setActiveCategory, almacenUbicacion, setAlmacenUbicacion,
          updateProductField, addProduct, deleteProduct,
          saveCartas, saveOffersFn, saveCombosFn, saveMealMenusFn, saveCarrusel, savePriceRulesFn,
          newProductOpen, setNewProductOpen, confirmDeleteId, setConfirmDeleteId,
        }}
      >
        <AuthContext.Provider
          value={{ currentUser, employees, addEmployee, updateEmployeeField, deleteEmployee }}
        >
          <SalesContext.Provider
            value={{
              sales, ticketSettings, handleRefund, handleConfirmBizum,
              printInvoice, handleDownloadPdf, handleSendInvoiceEmail,
            }}
          >
            <UiContext.Provider value={{ colors, showToast, view, setView }}>
              {children}
            </UiContext.Provider>
          </SalesContext.Provider>
        </AuthContext.Provider>
      </CatalogContext.Provider>
    </FloorContext.Provider>
  )
}
