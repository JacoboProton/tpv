import type { Table, Order } from '@tpv/core';
import type { Theme } from '@/components/constants';

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  course: string;
  ubicacion: string;
  allergens: string[];
  stock: number;
  discount: number;
  agotado?: boolean;
  active?: boolean;
  carousel_sort?: number | null;
  image?: string;
  description?: string;
  featured?: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
}

export interface ModifierInfo {
  optionName: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  sent?: boolean;
  ready?: boolean;
  notes?: string;
  productId?: string | null;
  modifiers?: ModifierInfo[];
  lineDiscount?: number;
  isCourtesy?: boolean;
  overridePrice?: number | null;
  voided?: boolean;
  voidReason?: string;
  isFreeItem?: boolean;
  category?: string;
  course?: string;
  ubicacion?: string;
  allergens?: string[];
  isCombo?: boolean;
  comboData?: unknown;
  comboSel?: unknown;
  isMenu?: boolean;
  menuData?: unknown;
  menuSel?: unknown;
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
}

export interface OrderInfo extends Omit<Order, 'items'> {
  items: OrderItem[];
  label?: string;
  customer?: CustomerInfo | null;
  personalDiscountApplied?: boolean;
  personalDiscountEmployeeName?: string;
  _mergedLabel?: string;
  closedAt?: number;
  createdAt?: number;
}

export interface FloorData {
  tables: Table[];
  orders: Record<string, OrderInfo>;
  customers: CustomerInfo[];
}

export interface HistoryEntry {
  id: string;
  label: string;
  items: OrderItem[];
  closedAt: number;
  createdAt: number;
}

export interface ComboSlotGroupItem {
  id: string;
  product_id: string;
  surcharge: number;
}

export interface ComboSlotGroup {
  id: string;
  name: string;
  minChoices: number;
  maxChoices: number;
  items: ComboSlotGroupItem[];
}

export interface ComboData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  active: boolean;
  items: { product_id: string; quantity: number }[];
  slots?: ComboSlotGroup[];
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

export interface MealMenuData {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  includes_pan: boolean;
  includes_bebida: boolean;
  includes_cafe: boolean;
  courses: MealCourse[];
  schedules: MealSchedule[];
  extras: MealExtra[];
}

export interface EmployeeInfo {
  id: string;
  name: string;
  pin: string;
  role: string;
}

export interface TicketSettings {
  [key: string]: unknown;
}

export interface ComandaDrawerProps {
  selectedTable: Table;
  selectedOrder: OrderInfo | null;
  catalog: { products: CatalogProduct[]; categories: (string | CategoryInfo)[] };
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  orderTotal: number;
  orderDiscount: number;
  setOrderDiscount: (d: number) => void;
  tipAmount: number;
  finalTotal: number;
  onClose: () => void;
  onAddItem: (item: Partial<OrderItem> & { id?: string; name: string; price: number; category: string; course: string; ubicacion: string; allergens: string[] }) => void;
  onChangeQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCancelTable: () => void;
  onSendToKitchenCourse: (course: string) => void;
  onSendItemToKitchen: (itemId: string) => void;
  onToggleCuenta: () => void;
  onOpenPayment: () => void;
  onResetTable: () => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onUpdateItemCourse: (itemId: string, course: string) => void;
  onEditItemModifiers: (item: OrderItem, product: CatalogProduct) => void;
  onSetItemDiscount: (itemId: string, pct: number) => void;
  onRemoveItemDiscount: (itemId: string) => void;
  onSetItemCourtesy: (itemId: string) => void;
  onRemoveItemCourtesy: (itemId: string) => void;
  onSetItemPrice: (itemId: string, price: number | null) => void;
  onVoidSentItem: (itemId: string, reason: string) => void;
  onApplyPersonalDiscount: (orderId: string, pin: string) => Promise<boolean>;
  onRemovePersonalDiscount: (orderId: string) => void;
  employees: EmployeeInfo[];
  ticketSettings: TicketSettings;
  combos: ComboData[];
  mealMenus: MealMenuData[];
  floor: FloorData;
  onMoveTable: (currentId: string, destId: string | null) => void;
  onMergeTables: (currentId: string, ids: string[]) => void;
  currentTableId: string;
  activeTicketId: string;
  onSwitchTicket: (tableId: string, ticketId: string) => void;
  onCreateTicket: (tableId: string) => void;
  onDeleteEmptyTicket: (tableId: string, orderId: string) => void;
  onRenameTicket: (orderId: string, label: string) => void;
  onLinkCustomer: (orderId: string | undefined, customer: CustomerInfo | { id: string; name: string; phone: string }) => void;
  onUnlinkCustomer: (orderId: string) => void;
  onReopenOrder: (tableId: string, order: HistoryEntry) => void;
  onVoidTable: () => void;
  todayHistory: HistoryEntry[];
  colors: Theme;
}
