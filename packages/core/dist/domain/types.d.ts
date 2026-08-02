export type TableStatus = 'libre' | 'ocupada' | 'unidas' | 'cuenta';
export type EmployeeRole = 'admin' | 'camarero' | 'cocina' | 'manager';
export type ItemState = 'pending' | 'sent' | 'ready' | 'served' | 'voided';
export type TableType = 'mesa' | 'barra' | 'llevar' | 'domicilio';
export interface StockEntry {
    stock: number;
    lowStock?: number;
}
export interface Product {
    id: string;
    name: string;
    price: number;
    cost?: number;
    barcode?: string;
    categoryId?: string;
    category?: string;
    description?: string | null;
    agotado?: boolean;
    active?: boolean;
    showTpv?: boolean;
    showQr?: boolean;
    course?: string;
    ubicacion?: string;
    allergens?: string[];
    image?: string | null;
    stock?: number;
    lowStock?: number;
    stockByLocation?: Record<string, StockEntry>;
    discount?: number;
    featured?: boolean;
    carouselSort?: number | null;
    isMenu?: boolean;
    menuData?: any;
    isCombo?: boolean;
    comboData?: any;
}
export interface Category {
    id: string;
    name: string;
    active?: boolean;
    showQr?: boolean;
    sortOrder?: number;
}
export interface NewProductInput {
    name: string;
    category: string;
    price: number;
    ubicacion?: string;
    stock?: number;
    lowStock?: number;
}
export interface StockDelta {
    productId: string;
    productName: string;
    ubicacion: string;
    delta: number;
    newStock: number;
}
export interface ModifierInfo {
    optionName: string;
}
export interface OrderItemModifier {
    optionId: string;
    optionName?: string;
    extraPrice?: number;
}
export interface OrderItem {
    id: string;
    productId?: string | null;
    name: string;
    price: number;
    qty: number;
    sent?: boolean;
    ready?: boolean;
    served?: boolean;
    voided?: boolean;
    voidReason?: string;
    voidedBy?: string;
    voidedAt?: number;
    sentAt?: number | null;
    delivered?: boolean;
    servedBy?: string;
    servedAt?: number;
    notes?: string;
    modifiers?: any[];
    course?: string;
    ubicacion?: string;
    category?: string;
    allergens?: string[];
    lineDiscount?: number;
    isCourtesy?: boolean;
    overridePrice?: number | null;
    isFreeItem?: boolean;
    isCombo?: boolean;
    comboData?: any;
    comboSel?: any;
    isMenu?: boolean;
    menuData?: any;
    menuSel?: any;
    isMenuItem?: boolean;
    isMenuPrice?: boolean;
    isComboItem?: boolean;
    isComboPrice?: boolean;
}
export interface Order {
    id: string;
    tableId?: string;
    items: OrderItem[];
    employeeName?: string;
    createdAt?: number;
    source?: string;
    reopenedAt?: number;
    label?: string;
    customer?: CustomerInfo | null | any;
    _mergedFrom?: string[];
    _mergedLabel?: string;
    personalDiscountApplied?: boolean;
    personalDiscountEmployeeId?: string;
    personalDiscountEmployeeName?: string;
    closedAt?: number;
}
export interface CustomerInfo {
    id: string;
    name: string;
    phone: string;
    tableId?: string;
}
export interface HistoryEntry extends Order {
    closedAt: number;
    createdAt: number;
}
export interface TicketSettings {
    restaurantName?: string;
    companyCif?: string;
    companyAddress?: string;
    companyPhone?: string;
    logoUrl?: string;
    footerText?: string;
    ticketWidth?: string;
    [key: string]: unknown;
}
export interface MenuExpansionItem {
    productId: string | null;
    name: string;
    price: number;
    qty: number;
    course: string;
    isMenuItem?: boolean;
    isMenuPrice?: boolean;
    isComboItem?: boolean;
    isComboPrice?: boolean;
    ubicacion?: string;
}
export interface OrderTotals {
    subtotal: number;
    discountAmount: number;
    offerDiscountAmount: number;
    total: number;
    totalWithTip: number;
}
export interface Table {
    id: string;
    name?: string;
    status: string;
    orderId?: string | null;
    orderIds?: string[];
    type?: TableType;
    isFiado?: boolean;
    reserved?: boolean | null;
    reserved_for?: string;
    reservation?: {
        for?: string;
        until?: number;
        name?: string;
        pax?: number;
        notes?: string;
    } | null;
    mergedTableIds?: string[] | null;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    radius?: number;
    shape?: string;
    rotation?: number;
    seats?: number;
    zone?: string;
    layer?: number;
    color?: string;
}
export interface Floor {
    tables: Table[];
    orders: Record<string, Order>;
    history?: Record<string, HistoryEntry[]>;
    customers?: CustomerInfo[];
    id?: string;
    name?: string;
    zones?: Zone[];
    background?: string | {
        url: string;
        opacity: number;
    } | null;
}
export interface Payment {
    method: string;
    amount: number;
    confirmed?: boolean;
    itemIds?: string[];
}
export interface PaymentSplit {
    method: string;
    amount: number;
}
export interface RefundInput {
    amount: number;
    reason?: string;
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
export interface SaleRefund extends RefundInput {
    employeeName: string;
    timestamp: number;
    stripeRefundId?: string;
}
export interface Sale {
    id: string;
    items: any[];
    subtotal: number;
    discount: number;
    discountAmount?: number;
    total: number;
    tip: number;
    tipMethod?: string;
    totalWithTip: number;
    paymentMethod: string;
    payments: Payment[];
    isFiado: boolean;
    tableId?: string;
    tableName?: string;
    employeeName?: string;
    employeeId?: string;
    closedAt: number;
    invoiceNumber?: string;
    invoiceNif?: string;
    invoiceName?: string;
    invoiceAddress?: string;
    invoiceEmail?: string;
    invoiceCreated?: boolean;
    invoiceCreatedAt?: number | null;
    paymentIntentId?: string;
    ticketNumber?: string | number;
    offerDiscount?: number;
    refunds?: SaleRefund[];
    hasPendingBizum?: boolean;
    isDebtPayment?: boolean;
    stripe_confirmed?: boolean;
    stripeConfirmed?: boolean;
    dispute_status?: string;
    disputeStatus?: string;
    dispute_data?: any;
    verifactuStatus?: string;
    verifactuNumSerie?: string;
}
export interface CurrentUser {
    id: string;
    name: string;
    role: EmployeeRole;
}
export interface Employee {
    id: string;
    name: string;
    role: EmployeeRole;
    pin?: string;
    monthlyUsed?: number;
    monthlyUsedMonth?: string;
    personalDiscountEnabled?: boolean;
    monthlyLimit?: number;
}
export interface Catalog {
    products: Product[];
    categories: Category[];
    offers?: Offer[];
    combos?: Combo[];
    mealMenus?: MealMenu[];
    priceRules?: PriceRule[];
}
export interface KitchenItem {
    id: string;
    sent?: boolean;
    ready?: boolean;
    served?: boolean;
    voided?: boolean;
}
export interface IgicBreakdown {
    baseImponible: number;
    cuotaIgic: number;
}
export interface Offer {
    active: boolean;
    days: number[];
    startHour: number;
    endHour: number;
    productIds: string[];
    discountPct: number;
}
export interface PriceRule {
    id?: string;
    name?: string;
    categoryId?: string;
    productId?: string;
    discountPct?: number;
    type?: string;
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
export interface Zone {
    id: string;
    name: string;
    color: string;
}
export interface LoginEmployee {
    id: string;
    name: string;
    role: string;
}
export interface Tenant {
    id: string;
    name?: string;
}
export interface ClockinSummary {
    isActive: boolean;
    isOnPause?: boolean;
    entrada?: number;
    salida?: number;
    pausas?: Array<{
        start: number;
        end?: number;
    }>;
    effectiveMinutes?: number;
}
export interface QrCall {
    id: string;
    tableId: string;
    tableName?: string;
    zone?: string;
    acknowledged: boolean;
    createdAt: number;
}
export interface ComboSlotItem {
    id: string;
    product_id: string;
    surcharge: number;
}
export interface ComboSlot {
    id: string;
    name: string;
    minChoices?: number;
    maxChoices?: number;
    items?: ComboSlotItem[];
}
export interface Combo {
    id: string;
    name: string;
    price: number | string;
    active?: boolean;
    discountPct?: number;
    slots?: ComboSlot[];
    category?: string;
    description?: string;
}
export interface MealMenuItem {
    id: string;
    product_id: string;
    surcharge: number;
}
export interface MealCourse {
    id: string;
    name: string;
    items: MealMenuItem[];
}
export interface MealSchedule {
    day_of_week: number;
    start_time: string;
    end_time: string;
}
export interface MealExtra {
    name: string;
    price: number;
}
export interface MealMenu {
    id: string;
    name: string;
    price: number | string;
    active?: boolean;
    includesPan?: boolean;
    includesBebida?: boolean;
    includesCafe?: boolean;
    courses?: MealCourse[];
    schedules?: MealSchedule[];
    extras?: MealExtra[];
}
//# sourceMappingURL=types.d.ts.map