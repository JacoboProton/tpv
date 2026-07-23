// Shared types from @tpv/core — single source of truth
export type {
  Employee, Product, Category,
  OrderItem, Order,
  Table, Floor, Zone,
  Sale, SaleRefund,
  ModifierOption, ModifierGroup, ModifierSelection,
  TableStatus, TableType, EmployeeRole, ItemState,
} from '@tpv/core'

export type {
  ModifierOption as StockModifierOption,
  ModifierGroup as StockModifierGroup,
} from '@tpv/core'

// Mobile-only: SaleItem is a simplified item used in mobile Sale payloads
export interface SaleItem {
  id: string
  productId: string
  name: string
  price: number
  qty: number
  modifiers?: ModifierSelection[]
  notes?: string
}

// ─── Gestoria types (mobile-only) ───
export interface GestoriaDocumentLine {
  description: string
  baseAmount: number
  vatRate: number
  vatAmount: number
  withholding: number
  zone: string
  type: string
  category?: string
}

export interface GestoriaDocument {
  id: string
  type: 'expense' | 'income'
  provider_name?: string
  provider_nif?: string
  document_date?: string
  file_name?: string
  notes?: string
  is_periodic?: boolean
  confirmed: boolean
  lines: GestoriaDocumentLine[]
}

export interface GestoriaPayroll {
  id: string
  employee_name: string
  employee_nif: string
  month: number
  year: number
  gross_amount: number
  irpf_withholding: number
  ss_worker: number
  ss_company: number
  net_amount: number
  notes?: string
}

export interface GestoriaTaxModel {
  id: string
  model_code: string
  year: number
  quarter: number
  status: 'draft' | 'reviewed' | 'presented' | 'submitted'
  data: Record<string, unknown>
  due_date?: string
  created_at: string
  updated_at: string
}

export interface GestoriaAuthorization {
  id: number
  accountant_name: string
  accountant_nif: string
  signed_at: string
  revoked: boolean
  social_security_red: boolean
}

export interface GestoriaOperationEntry {
  nif: string
  name: string
  base: number
  operacion: string
}

export interface GestoriaOperationsResponse {
  entregas_intra: GestoriaOperationEntry[]
  adquisiciones_intra: GestoriaOperationEntry[]
  total_operaciones: number
}
