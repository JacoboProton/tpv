export interface Employee {
  id: string;
  name: string;
  pin: string;
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
  modifiers?: string[];
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
