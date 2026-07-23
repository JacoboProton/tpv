import { z } from 'zod';

// ─── Reusable fragments ───

export const EntityId = z.string().min(1)
export const TenantId = z.string().default('default')
export const Action = z.string().min(1)
export const Email = z.string().email().optional().or(z.literal(''))
export const Phone = z.string().optional().or(z.literal(''))
export const Nif = z.string().optional().or(z.literal(''))
export const Price = z.number().nonnegative().or(z.string()).transform(v => Number(v))
export const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}(T|\s)/).optional().or(z.string())
export const Timestamp = z.number().positive()

// ─── access-logs ───

export const AccessLogQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional(),
}).passthrough()

// ─── add-stock ───

export const AddStockBody = z.object({
  productId: z.string().min(1),
  productName: z.string().optional(),
  quantity: z.number().positive(),
  costPerUnit: z.number().nonnegative().optional(),
  location: z.string().optional(),
  batchNumber: z.string().optional(),
  supplierId: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
}).passthrough()

// ─── albaranes ───

export const AlbaranBody = z.object({
  id: z.string().optional(),
  supplierId: z.string().min(1),
  supplierName: z.string().min(1),
  number: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    quantity: z.number().positive(),
    pricePerUnit: z.number().nonnegative(),
})).optional(),
}).passthrough()

// ─── auto-order-settings ───

export const AutoOrderSettingsBody = z.record(z.string(), z.unknown())

// ─── buffet ───

export const BuffetBody = z.array(z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
  active: z.boolean().optional(),
  days: z.array(z.number()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).passthrough())

// ─── cancelled (orders) ───

export const CancelledOrderBody = z.object({
  id: z.string().min(1),
}).passthrough()

// ─── catalog ───

export const CatalogProductBody = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  price: Price,
  category: z.string().optional(),
  show_tpv: z.boolean().optional(),
  show_qr: z.boolean().optional(),
  course: z.string().optional(),
  ubicacion: z.string().optional(),
  allergens: z.array(z.string()).optional(),
  agotado: z.boolean().optional(),
  image: z.string().optional().nullable(),
}).passthrough()

export const CatalogBody = z.object({
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    sort: z.number().optional(),
  })),
  products: z.array(CatalogProductBody),
}).passthrough()

// ─── clockin ───

export const ClockinBody = z.object({
  action: z.enum(['clockin', 'clockout', 'status']),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  pin: z.string().optional(),
  pinHash: z.string().optional(),
  correctionId: z.string().optional(),
  newTime: z.string().optional(),
  reason: z.string().optional(),
}).passthrough()

// ─── closures ───

export const ClosureBody = z.object({
  action: z.string().min(1),
  date: z.string().optional(),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  diferencia: z.number().optional(),
  observaciones: z.string().optional(),
}).passthrough()

// ─── combos ───

export const CombosBody = z.array(z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
  products: z.array(z.object({
    productId: z.string(),
    qty: z.number().positive(),
})),
  active: z.boolean().optional(),
}).passthrough())

// ─── delivery ───

export const DeliveryOrderBody = z.object({
  action: z.string().optional(),
  id: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  address: z.string().optional(),
  items: z.array(z.any()).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  runnerId: z.string().optional(),
  runnerName: z.string().optional(),
}).passthrough()

export const DeliveryRunnerBody = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  active: z.boolean().optional(),
}).passthrough()

export const DeliveryTrackingBody = z.object({
  deliveryId: z.string().min(1),
  status: z.string().min(1),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  note: z.string().optional(),
}).passthrough()

// ─── delivery-zones ───

export const DeliveryZoneBody = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  radiusKm: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  minOrder: z.number().nonnegative().optional(),
  estimatedMinutes: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
}).passthrough()

// ─── employees ───

export const EmployeePutBody = z.array(z.object({
  id: z.string(),
  name: z.string(),
  pin: z.string().optional(),
  pinHash: z.string().optional(),
  role: z.string().optional(),
  position: z.string().optional(),
  workType: z.string().optional(),
  workPct: z.number().optional(),
  dni: z.string().optional(),
  notes: z.string().optional(),
  personalDiscountEnabled: z.boolean().optional(),
  monthlyLimit: z.number().optional(),
  monthlyUsed: z.number().optional(),
  monthlyUsedMonth: z.string().optional(),
  whatsappCode: z.string().optional(),
  whatsappLinked: z.boolean().optional(),
  createdAt: z.number().optional(),
}).passthrough())

export const EmployeePostBody = z.object({
  action: z.string().min(1),
  pin: z.string().optional(),
  pinHash: z.string().optional(),
  code: z.string().optional(),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
}).passthrough()

// ─── floor PATCH ───

export const FloorPatchBody = z.object({
  updatedTables: z.array(z.any()).optional().default([]),
  deletedTableIds: z.array(z.string()).optional().default([]),
  updatedOrders: z.record(z.string(), z.any()).optional().default({}),
  deletedOrderIds: z.array(z.string()).optional().default([]),
}).passthrough()

// ─── gestoria ───

export const GestoriaBody = z.object({
  action: z.string().min(1),
  document: z.any().optional(),
  payroll: z.any().optional(),
  settings: z.record(z.string(), z.string()).optional(),
  id: z.string().optional(),
  year: z.number().optional(),
  quarter: z.number().optional(),
  modelCode: z.string().optional(),
  status: z.string().optional(),
}).passthrough()

// ─── invoice/pdf ───

export const InvoicePdfBody = z.object({
  saleId: z.string().optional(),
  sale: z.any().optional(),
}).passthrough()

// ─── invoice/send ───

export const InvoiceSendBody = z.object({
  saleId: z.string().min(1),
  pdfBase64: z.string().min(1),
  filename: z.string().optional(),
  to: z.string().email().optional().or(z.literal('')),
}).passthrough()

// ─── kds ───

export const KdsBody = z.object({
  action: z.enum(['generate', 'verify']),
  code: z.string().optional(),
  label: z.string().optional(),
  deviceId: z.string().optional(),
}).passthrough()

// ─── kds/audit ───

export const KdsAuditBody = z.object({
  action: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional().default({}),
}).passthrough()

// ─── meal-menus ───

export const MealMenuBody = z.array(z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  image: z.string().optional().nullable(),
  includesPan: z.boolean().optional(),
  includesBebida: z.boolean().optional(),
  includesCafe: z.boolean().optional(),
  active: z.boolean().optional(),
  extras: z.array(z.any()).optional(),
  courses: z.array(z.any()).optional(),
}).passthrough())

// ─── migrate ───

export const MigrateBody = z.object({
  action: z.string().min(1),
  tenantId: z.string().optional(),
  targetTenantId: z.string().optional(),
  data: z.any().optional(),
}).passthrough()

// ─── modifiers ───

export const ModifiersBody = z.object({
  groups: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.any()).optional(),
  })),
  productModifiers: z.record(z.string(), z.array(z.string())).optional(),
}).passthrough()

// ─── move-stock ───

export const MoveStockBody = z.object({
  productId: z.string().min(1),
  productName: z.string().optional(),
  fromLocation: z.string().min(1),
  toLocation: z.string().min(1),
  quantity: z.number().positive(),
  notes: z.string().optional(),
}).passthrough()

// ─── offers ───

export const OffersBody = z.array(z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  days: z.array(z.number()).optional(),
  startHour: z.string().optional(),
  endHour: z.string().optional(),
  discountPct: z.number().optional().nullable(),
  fixedPrice: z.number().optional().nullable(),
  productIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
}).passthrough())

// ─── price-rules ───

export const PriceRulesBody = z.array(z.object({
  id: z.string(),
  product_id: z.string(),
  name: z.string(),
  active: z.boolean().optional(),
  days: z.array(z.number()).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  type: z.string(),
  value: z.number(),
}).passthrough())

// ─── production ───

export const ProductionBody = z.object({
  action: z.string().min(1),
  productId: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.number().positive().optional(),
  costPerUnit: z.number().optional(),
  location: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  producedAt: z.number().optional(),
}).passthrough()

// ─── purchase-orders ───

export const PurchaseOrderBody = z.object({
  action: z.enum(['create', 'update-status', 'update-lines']),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.any()).optional(),
  createdBy: z.string().optional(),
  id: z.string().optional(),
  status: z.string().optional(),
}).passthrough()

// ─── qr-calls ───

export const QrCallBody = z.object({
  tableId: z.string().min(1),
  tableName: z.string().optional(),
  zone: z.string().optional(),
}).passthrough()

export const QrCallAckBody = z.object({
  id: z.string().min(1),
}).passthrough()

// ─── qr-order ───

export const QrOrderPostBody = z.object({
  action: z.string().optional(),
  orderId: z.string().optional(),
  tableId: z.string().optional(),
  items: z.array(z.any()).optional(),
  amount: z.number().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  notes: z.string().optional(),
  modality: z.string().optional(),
  address: z.string().optional(),
  addressLat: z.number().optional(),
  addressLng: z.number().optional(),
  zoneId: z.string().optional(),
  deliveryCost: z.number().optional(),
  scheduledAt: z.number().optional(),
}).passthrough()

// ─── recipes ───

export const RecipeBody = z.object({
  action: z.string().min(1),
  productId: z.string().optional(),
  productName: z.string().optional(),
  yieldQty: z.number().optional(),
  ingredients: z.array(z.any()).optional(),
}).passthrough()

// ─── reservations ───

export const ReservationPostBody = z.object({
  id: z.string().optional(),
  recurring: z.boolean().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  pax: z.number().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  status: z.string().optional(),
  zone: z.string().optional(),
  notes: z.string().optional(),
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  depositAmount: z.number().optional(),
  depositPaid: z.boolean().optional(),
  source: z.string().optional(),
  weekday: z.number().optional(),
}).passthrough()

// ─── reset-orders ───

export const ResetOrdersBody = z.object({
  adminPin: z.string().min(1),
}).passthrough()

// ─── sales ───

export const SalePostBody = z.object({
  id: z.string().min(1),
  tableId: z.string().optional().nullable(),
  tableName: z.string().optional(),
  items: z.array(z.any()),
  subtotal: z.string().or(z.number()),
  discount: z.string().or(z.number()).optional(),
  discountAmount: z.string().or(z.number()).optional(),
  total: z.string().or(z.number()),
  tip: z.string().or(z.number()).optional(),
  tipMethod: z.string().optional(),
  totalWithTip: z.string().or(z.number()).optional(),
  payments: z.array(z.any()).optional(),
  paymentMethod: z.string().optional(),
  paymentIntentId: z.string().optional(),
  isFiado: z.boolean().optional(),
  isDebtPayment: z.boolean().optional(),
  employeeId: z.string().optional().nullable(),
  employeeName: z.string().optional().nullable(),
  closedAt: z.number(),
  invoiceNif: z.string().optional(),
  invoiceName: z.string().optional(),
  invoiceAddress: z.string().optional(),
  invoiceEmail: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceCreated: z.boolean().optional(),
  invoiceCreatedAt: z.number().optional(),
  invoiceSent: z.boolean().optional(),
  invoiceSentAt: z.number().optional(),
}).passthrough()

// ─── sales/refund ───

export const RefundBody = z.object({
  saleId: z.string().min(1),
  refund: z.object({
    amount: z.number().positive(),
    reason: z.string(),
    employeeName: z.string().optional(),
}).passthrough(),
})

// ─── session ───

export const SessionBody = z.object({
  action: z.enum(['login', 'logout', 'keepalive']),
  employeeId: z.string().optional(),
  employeeRole: z.string().optional(),
  deviceId: z.string().optional(),
  force: z.boolean().optional(),
}).passthrough()

// ─── settings ───

export const SettingsBody = z.record(z.string(), z.string())

// ─── shifts ───

export const ShiftBody = z.object({
  action: z.string().min(1),
  fromWeekStart: z.string().optional(),
  toWeekStart: z.string().optional(),
}).passthrough()

// ─── split-stock ───

export const SplitStockBody = z.object({
  productId: z.string().min(1),
  productName: z.string().optional(),
  quantity: z.number().positive(),
  costPerUnit: z.number().nonnegative(),
  sourceBatch: z.string().optional(),
  notes: z.string().optional(),
}).passthrough()

// ─── stock-log ───

export const StockLogBody = z.object({
  productId: z.string().min(1),
  productName: z.string().optional(),
  oldStock: z.number(),
  newStock: z.number(),
  reason: z.string(),
  employeeName: z.string().optional(),
}).passthrough()

// ─── stripe/payment-intent ───

export const PaymentIntentBody = z.object({
  amount: z.number().positive(),
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  employeeName: z.string().optional(),
  idempotencyKey: z.string().optional(),
}).passthrough()

// ─── stripe/terminal-payment-intent ───

export const TerminalPaymentIntentBody = z.object({
  amount: z.number().positive(),
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  employeeName: z.string().optional(),
  idempotencyKey: z.string().optional(),
}).passthrough()

// ─── stripe/webhook-events ───

export const WebhookEventResetBody = z.object({
  eventId: z.string().min(1),
}).passthrough()

// ─── suppliers ───

export const SupplierBody = z.object({
  action: z.string().min(1),
  id: z.string().optional(),
  name: z.string().min(1),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  nif: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
}).passthrough()

// ─── supplier-catalog ───

export const SupplierCatalogPostBody = z.object({
  action: z.string().min(1),
  id: z.string().optional(),
  supplierId: z.string().optional(),
  productId: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().nonnegative().optional(),
  packSize: z.number().positive().optional(),
  minOrder: z.number().nonnegative().optional(),
  deliveryDays: z.number().optional(),
  isPreferred: z.boolean().optional(),
  active: z.boolean().optional(),
}).passthrough()

// ─── supplier-price-history ───

export const SupplierPriceHistoryBody = z.object({
  catalogId: z.string().min(1),
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  packPrice: z.number().nonnegative(),
  packSize: z.number().positive().optional(),
  source: z.string().optional(),
}).passthrough()

// ─── tenants ───

export const TenantPostBody = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  nif: z.string().optional(),
}).passthrough()

export const TenantPutBody = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  nif: z.string().optional(),
  active: z.boolean().optional(),
}).passthrough()

// ─── time-off-requests ───

export const TimeOffBody = z.object({
  action: z.enum(['create', 'resolve']),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  reason: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  notes: z.string().optional(),
  id: z.string().optional(),
  status: z.string().optional(),
  resolvedBy: z.string().optional(),
  resolvedNote: z.string().optional(),
}).passthrough()

// ─── turns ───

export const TurnBody = z.object({
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  action: z.string().min(1),
  turnDate: z.string().optional(),
}).passthrough()

// ─── verifactu ───

export const VerifactuBody = z.object({
  saleId: z.string().min(1),
  sale: z.any(),
}).passthrough()

export const VerifactuRegenerateBody = z.object({
  adminPin: z.string().min(1),
}).passthrough()

export const VerifactuVerifyBody = z.object({
  saleId: z.string().min(1),
}).passthrough()

export const VerifactuSetupBody = z.object({
  testSigner: z.boolean().optional(),
  testClient: z.boolean().optional(),
  genAgreement: z.boolean().optional(),
  uploadAgreement: z.boolean().optional(),
  signedPdfBase64: z.string().optional(),
  legalName: z.string().optional(),
}).passthrough()

// ─── waitlist ───

export const WaitlistBody = z.object({
  action: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  pax: z.number().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  position: z.number().optional(),
}).passthrough()

// ─── webhooks (glovo, ubereats) ───

export const GlovoWebhookBody = z.object({
  order_id: z.string().optional(),
  id: z.string().optional(),
  customer: z.any().optional(),
  client: z.any().optional(),
  products: z.array(z.any()).optional(),
  items: z.array(z.any()).optional(),
  total: z.union([z.string(), z.number()]).optional(),
}).passthrough()

// ─── auto-order-settings PUT ───

export const AutoOrderSettingsPutBody = z.object({
  action: z.string().optional(),
  enabled: z.boolean().optional(),
  minStock: z.number().optional(),
  supplierId: z.string().optional(),
}).passthrough()

// ─── buffet PUT ───

export const BuffetPutBody = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
  active: z.boolean().optional(),
}).passthrough()

// ─── cancelled (order cancel) ───

export const CancelOrderBody = z.object({
  orderId: z.string().min(1),
  items: z.array(z.object({
    id: z.string(),
    qty: z.number().positive(),
    reason: z.string().optional(),
})).optional(),
}).passthrough()

// ─── clockin-corrections ───

export const ClockinCorrectionBody = z.object({
  action: z.enum(['create', 'resolve']),
  id: z.string().optional(),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  date: z.string().optional(),
  clockinTime: z.string().optional(),
  clockoutTime: z.string().optional(),
  reason: z.string().optional(),
  status: z.string().optional(),
  resolvedBy: z.string().optional(),
}).passthrough()

// ─── food-cost ───

export const FoodCostBody = z.object({
  action: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).passthrough()

// ─── generic ID body (for DELETE) ───

export const IdBody = z.object({
  id: z.string().min(1),
}).passthrough()

// ─── upload ───

export const UploadBody = z.object({
  bucket: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
}).passthrough()
