// ---------- Paleta de marca: "La Comanda" ----------
export const C = {
  base: '#1C1714',
  surface: '#272019',
  surfaceLight: '#332A20',
  line: '#46392B',
  brass: '#C8932B',
  brassLight: '#E3B563',
  sage: '#6F9272',
  sageLight: '#8FB293',
  wine: '#A23E3E',
  wineLight: '#C25A5A',
  cream: '#F3ECDF',
  muted: '#AE9F8C',
};

export const KEYS = {
  CATALOG: 'tpv:catalog',
  FLOOR: 'tpv:floor',
  SALES: 'tpv:sales',
  EMPLOYEES: 'tpv:employees',
};

export const TICKET_EDGE = {
  height: 9,
  background: C.cream,
  clipPath:
    'polygon(0% 9px,4% 0%,8% 9px,12% 0%,16% 9px,20% 0%,24% 9px,28% 0%,32% 9px,36% 0%,40% 9px,44% 0%,48% 9px,52% 0%,56% 9px,60% 0%,64% 9px,68% 0%,72% 9px,76% 0%,80% 9px,84% 0%,88% 9px,92% 0%,96% 9px,100% 0%,100% 100%,0% 100%)',
};

export const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: null }, // icons assigned at usage site
  { id: 'tarjeta', label: 'Tarjeta', icon: null },
  { id: 'bizum',   label: 'Bizum',   icon: null },
  { id: 'fiado',   label: 'Fiado',   icon: null },
];

// ---------- Utilidades ----------
export function euros(n) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function clone(obj) {
  return typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
}

// ---------- Datos semilla ----------
export function seedCatalog() {
  const categories = ['Bebidas', 'Tapas', 'Principales', 'Postres'];
  const products = [
    { id: 'p1',  name: 'Caña',              category: 'Bebidas',    price: 2.2,  stock: 80, lowStock: 15, ubicacion: 'Bar' },
    { id: 'p2',  name: 'Tinto de verano',   category: 'Bebidas',    price: 2.8,  stock: 40, lowStock: 10, ubicacion: 'Bar' },
    { id: 'p3',  name: 'Vermut',            category: 'Bebidas',    price: 3.2,  stock: 25, lowStock: 8,  ubicacion: 'Bar' },
    { id: 'p4',  name: 'Copa de vino',      category: 'Bebidas',    price: 3.5,  stock: 30, lowStock: 8,  ubicacion: 'Bar' },
    { id: 'p5',  name: 'Agua',              category: 'Bebidas',    price: 1.5,  stock: 60, lowStock: 12, ubicacion: 'Bar' },
    { id: 'p6',  name: 'Refresco',          category: 'Bebidas',    price: 2.5,  stock: 50, lowStock: 12, ubicacion: 'Bar' },
    { id: 'p7',  name: 'Patatas bravas',    category: 'Tapas',      price: 5.5,  stock: 30, lowStock: 8,  ubicacion: 'Cocina' },
    { id: 'p8',  name: 'Croquetas (6u)',    category: 'Tapas',      price: 6.5,  stock: 24, lowStock: 6,  ubicacion: 'Cocina' },
    { id: 'p9',  name: 'Calamares',         category: 'Tapas',      price: 8.5,  stock: 20, lowStock: 6,  ubicacion: 'Cocina' },
    { id: 'p10', name: 'Jamón ibérico',     category: 'Tapas',      price: 12.0, stock: 15, lowStock: 4,  ubicacion: 'Cocina' },
    { id: 'p11', name: 'Pimientos de padrón', category: 'Tapas',    price: 6.0,  stock: 18, lowStock: 5,  ubicacion: 'Cocina' },
    { id: 'p12', name: 'Hamburguesa',       category: 'Principales', price: 11.5, stock: 20, lowStock: 5, ubicacion: 'Cocina' },
    { id: 'p13', name: 'Entrecot',          category: 'Principales', price: 16.0, stock: 12, lowStock: 4, ubicacion: 'Cocina' },
    { id: 'p14', name: 'Paella (ración)',   category: 'Principales', price: 13.5, stock: 10, lowStock: 3, ubicacion: 'Cocina' },
    { id: 'p15', name: 'Tarta de queso',    category: 'Postres',    price: 4.5,  stock: 14, lowStock: 4,  ubicacion: 'Almacén' },
    { id: 'p16', name: 'Flan',              category: 'Postres',    price: 3.5,  stock: 16, lowStock: 4,  ubicacion: 'Almacén' },
  ];
  return { categories, products };
}

export function seedFloor() {
  const tables = [
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `t${i + 1}`, name: `Mesa ${i + 1}`, status: 'libre', orderId: null, reserved: null, isFiado: false,
    })),
    { id: 't9',  name: 'Barra 1', status: 'libre', orderId: null, reserved: null, isFiado: false },
    { id: 't10', name: 'Barra 2', status: 'libre', orderId: null, reserved: null, isFiado: false },
  ];
  return { tables, orders: {} };
}

export function seedEmployees() {
  return [
    { id: 'e_admin', name: 'Administrador', pin: '1234', role: 'admin' },
    { id: 'e_1',     name: 'Ana',           pin: '1111', role: 'camarero' },
    { id: 'e_2',     name: 'Luis',          pin: '2222', role: 'camarero' },
  ];
}
