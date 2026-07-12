export interface Employee {
  id: string;
  name: string;
  role: 'admin' | 'camarero';
  personalDiscountEnabled: boolean;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyUsedMonth: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  ubicacion: string;
  course: string;
  allergens: string[];
  image?: string;
  description?: string;
  show_tpv: boolean;
  agotado: boolean;
  discount: number;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  show_qr: boolean;
}

export interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  sort_order: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: ModifierOption[];
}

export interface ModifierSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  sent?: boolean;
  sentAt?: number;
  ready?: boolean;
  served?: boolean;
  delivered?: boolean;
  servedBy?: string;
  servedAt?: number;
  modifiers?: ModifierSelection[];
  notes?: string;
  course?: string;
  ubicacion?: string;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  createdAt: number;
  employeeName?: string;
  source?: string;
}

export interface Table {
  id: string;
  name: string;
  status: 'libre' | 'ocupado' | 'cuenta';
  orderId: string | null;
  orderIds: string[];
  type: 'mesa' | 'barra' | 'llevar' | 'domicilio';
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  seats: number;
  zone: string;
  reserved: any;
  isFiado: boolean;
  shape: string;
  rotation: number;
  layer: number;
  color: string;
}

export interface Zone {
  id: string;
  name: string;
  color: string;
}

export interface Floor {
  tables: Table[];
  orders: Record<string, Order>;
  zones: Zone[];
  background: any;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  modifiers?: ModifierSelection[];
  notes?: string;
}

export interface Sale {
  id: string;
  tableId: string;
  tableName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  tip: number;
  totalWithTip: number;
  payments: { method: string; amount: number }[];
  paymentMethod: string;
  tipMethod?: string;
  isFiado: boolean;
  isDebtPayment: boolean;
  employeeId?: string;
  employeeName?: string;
  closedAt: number;
  ticketNumber?: number;
  invoiceNif?: string;
  invoiceName?: string;
  invoiceAddress?: string;
  invoiceEmail?: string;
  invoiceNumber?: string;
  invoiceCreated?: boolean;
  invoiceCreatedAt?: number | null;
  refunds?: any[];
  paymentIntentId?: string;
  stripeConfirmed?: boolean;
  disputeStatus?: string;
  disputeData?: Record<string, unknown>;
  verifactuStatus?: string;
  verifactuNumSerie?: string;
}

export interface GestoriaDocumentLine {
  description: string;
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  withholding: number;
  zone: string;
  type: string;
  category?: string;
}

export interface GestoriaDocument {
  id: string;
  type: 'expense' | 'income';
  provider_name?: string;
  provider_nif?: string;
  document_date?: string;
  file_name?: string;
  notes?: string;
  is_periodic?: boolean;
  confirmed: boolean;
  lines: GestoriaDocumentLine[];
}

export interface GestoriaPayroll {
  id: string;
  employee_name: string;
  employee_nif: string;
  month: number;
  year: number;
  gross_amount: number;
  irpf_withholding: number;
  ss_worker: number;
  ss_company: number;
  net_amount: number;
  notes?: string;
}

export interface GestoriaTaxModel {
  id: string;
  model_code: string;
  year: number;
  quarter: number;
  status: 'draft' | 'reviewed' | 'presented' | 'submitted';
  data: Record<string, unknown>;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface GestoriaAuthorization {
  id: number;
  accountant_name: string;
  accountant_nif: string;
  signed_at: string;
  revoked: boolean;
  social_security_red: boolean;
}

export interface GestoriaOperationEntry {
  nif: string;
  name: string;
  base: number;
  operacion: string;
}

export interface GestoriaOperationsResponse {
  entregas_intra: GestoriaOperationEntry[];
  adquisiciones_intra: GestoriaOperationEntry[];
  total_operaciones: number;
}
