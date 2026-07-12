export const THEMES = {
  dark: {
    base: '#3d424f',
    surface: '#4d5363',
    surfaceLight: '#5f6578',
    line: '#7a8095',
    brass: '#e0c06a',
    brassLight: '#f0d88a',
    sage: '#9abaa0',
    sageLight: '#b4d4b8',
    wine: '#d08080',
    wineLight: '#e89a9a',
    cream: '#f5f0e8',
    muted: '#c0b8ac',
    headerBg: '#3d424f',
    ticketBg: '#f5f0e8',
    ticketText: '#3d424f',
    overlay: 'rgba(0,0,0,0.30)',
  },
  light: {
    base: '#fffcf5',
    surface: '#f8f4ec',
    surfaceLight: '#efeae0',
    line: '#ded8ca',
    brass: '#d0b658',
    brassLight: '#b8a048',
    sage: '#8aaa8c',
    sageLight: '#9abaa0',
    wine: '#d08080',
    wineLight: '#e89a9a',
    cream: '#4a4640',
    muted: '#aaa498',
    headerBg: '#f8f4ec',
    ticketBg: '#ffffff',
    ticketText: '#4a4640',
    overlay: 'rgba(0,0,0,0.20)',
  },
};

export let C = THEMES.dark;

export function setGlobalTheme(mode) {
  C = THEMES[mode];
}

export const KEYS = {
  CATALOG: 'tpv:catalog',
  FLOOR: 'tpv:floor',
  SALES: 'tpv:sales',
  EMPLOYEES: 'tpv:employees',
  STOCK_LOG: 'tpv:stock_log',
  CANCELLED: 'tpv:cancelled',
  TURNS: 'tpv:turns',
};

export const TICKET_EDGE = {
  height: 9,
  background: '#e6e1d6',
  clipPath:
    'polygon(0% 9px,4% 0%,8% 9px,12% 0%,16% 9px,20% 0%,24% 9px,28% 0%,32% 9px,36% 0%,40% 9px,44% 0%,48% 9px,52% 0%,56% 9px,60% 0%,64% 9px,68% 0%,72% 9px,76% 0%,80% 9px,84% 0%,88% 9px,92% 0%,96% 9px,100% 0%,100% 100%,0% 100%)',
};

export const TICKET_PRINT_STYLE = {
  width: '80mm',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  lineHeight: '1.3',
  padding: '2mm 3mm',
};

export const COURSES = ['Entrantes', 'Principales', 'Postres'];

export const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta',  label: 'Tarjeta' },
  { id: 'bizum',    label: 'Bizum' },
  { id: 'fiado',    label: 'Fiado' },
];

export function euros(n) {
  return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function clone(obj) {
  return typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
}

export function seedCatalog() {
  const categories = [
    { id: 'cat_beb', name: 'Bebidas' },
    { id: 'cat_tap', name: 'Tapas' },
    { id: 'cat_pri', name: 'Principales' },
    { id: 'cat_pos', name: 'Postres' }
  ];
  const products = [
    { id: 'p1',  name: 'Caña Selecta',       category: 'Bebidas',    price: 2.2,  stock: 80, lowStock: 15, ubicacion: 'Bar',     discount: 0, course: '', allergens: ['gluten'], image: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?auto=format&w=400&q=80' },
    { id: 'p2',  name: 'Tinto de Verano',    category: 'Bebidas',    price: 3.5,  stock: 40, lowStock: 10, ubicacion: 'Bar',     discount: 0, course: '', allergens: ['sulfitos'], image: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&w=400&q=80' },
    { id: 'p3',  name: 'Vermut Casero',      category: 'Bebidas',    price: 3.2,  stock: 25, lowStock: 8,  ubicacion: 'Bar',     discount: 0, course: '', allergens: ['sulfitos'], description: 'Nuestra receta secreta macerada con hierbas de la sierra.' },
    { id: 'p4',  name: 'Copa de Vino',       category: 'Bebidas',    price: 3.5,  stock: 30, lowStock: 8,  ubicacion: 'Bar',     discount: 0, course: '', allergens: ['sulfitos'] },
    { id: 'p5',  name: 'Agua Mineral',       category: 'Bebidas',    price: 1.5,  stock: 60, lowStock: 12, ubicacion: 'Bar',     discount: 0, course: '', allergens: [] },
    { id: 'p6',  name: 'Refresco',          category: 'Bebidas',    price: 2.5,  stock: 50, lowStock: 12, ubicacion: 'Bar',     discount: 0, course: '', allergens: [] },
    { id: 'p7',  name: 'Patatas Bravas',    category: 'Tapas',      price: 5.5,  stock: 30, lowStock: 8,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['gluten', 'huevos', 'lacteos'], description: 'Patatas fritas con nuestra salsa brava picante y alioli.' },
    { id: 'p8',  name: 'Croquetas (6u)',    category: 'Tapas',      price: 6.5,  stock: 24, lowStock: 6,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['gluten', 'lacteos', 'huevos'], description: 'Croquetas cremosas de jamón ibérico.' },
    { id: 'p9',  name: 'Calamares',         category: 'Tapas',      price: 8.5,  stock: 20, lowStock: 6,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['gluten', 'moluscos'], description: 'Calamares a la andaluza con limón.' },
    { id: 'p10', name: 'Jamón Ibérico',     category: 'Tapas',      price: 12.0, stock: 15, lowStock: 4,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: [], featured: true, description: 'Jamón de bellota 100% ibérico cortado a mano.' },
    { id: 'p11', name: 'Pimientos Padrón',  category: 'Tapas',      price: 6.0,  stock: 18, lowStock: 5,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: [] },
    { id: 'p12', name: 'Hamburguesa Sonora', category: 'Principales', price: 12.5, stock: 20, lowStock: 5, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos', 'huevos'], featured: true, description: 'Carne de buey 200g, queso cheddar, bacon crujiente y cebolla caramelizada.', image: 'https://images.unsplash.com/photo-1600891964751-dc0cc8611e47?auto=format&w=800&q=80' },
    { id: 'p13', name: 'Solomillo al Grill', category: 'Principales', price: 24.5, stock: 12, lowStock: 4, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: ['gluten'], featured: true, description: 'Steak de ternera madurado 45 días, acompañado de patatas rústicas y chimichurri casero.', image: 'https://images.pexels.com/photos/11089587/pexels-photo-11089587.jpeg?auto=compress&cs=tinysrgb&w=800&q=80' },
    { id: 'p14', name: 'Paella Marinera',   category: 'Principales', price: 13.5, stock: 10, lowStock: 3, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: ['crustaceos', 'moluscos', 'gluten'], description: 'Arroz bomba con marisco fresco del día.', image: 'https://images.pexels.com/photos/26587044/pexels-photo-26587044.jpeg?auto=compress&cs=tinysrgb&w=800&q=80' },
    { id: 'p15', name: 'Tarta de Queso',    category: 'Postres',    price: 4.5,  stock: 14, lowStock: 4,  ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['lacteos', 'huevos', 'gluten'], description: 'Tarta de queso artesana estilo Donostia.' },
    { id: 'p16', name: 'Flan Casero',       category: 'Postres',    price: 3.5,  stock: 16, lowStock: 4,  ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['huevos', 'lacteos'] },
    // Nuevos productos
    { id: 'p17', name: 'Café solo',         category: 'Bebidas',    price: 1.8,  stock: 50, lowStock: 10, ubicacion: 'Bar',     discount: 0, course: '', allergens: [] },
    { id: 'p18', name: 'Café con leche',    category: 'Bebidas',    price: 2.0,  stock: 50, lowStock: 10, ubicacion: 'Bar',     discount: 0, course: '', allergens: ['lacteos'] },
    { id: 'p19', name: 'Cerveza botellín',  category: 'Bebidas',    price: 2.5,  stock: 60, lowStock: 15, ubicacion: 'Bar',     discount: 0, course: '', allergens: ['gluten'] },
    { id: 'p20', name: 'Zumo de naranja',   category: 'Bebidas',    price: 3.0,  stock: 30, lowStock: 8,  ubicacion: 'Bar',     discount: 0, course: '', allergens: [] },
    { id: 'p21', name: 'Tortilla Patatas',  category: 'Tapas',      price: 5.0,  stock: 20, lowStock: 5,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['huevos'] },
    { id: 'p22', name: 'Ensaladilla Rusa',  category: 'Tapas',      price: 5.5,  stock: 18, lowStock: 5,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['huevos', 'lacteos'] },
    { id: 'p23', name: 'Gambas Ajillo',     category: 'Tapas',      price: 9.0,  stock: 15, lowStock: 4,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['crustaceos'] },
    { id: 'p24', name: 'Pulpo Gallega',     category: 'Tapas',      price: 11.0, stock: 12, lowStock: 3,  ubicacion: 'Cocina',  discount: 0, course: 'Entrantes', allergens: ['moluscos'] },
    { id: 'p25', name: 'Pollo Asado',       category: 'Principales', price: 10.0, stock: 15, lowStock: 4, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: [] },
    { id: 'p26', name: 'Merluza Plancha',   category: 'Principales', price: 13.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['pescado'] },
    { id: 'p27', name: 'Arroz Negro',       category: 'Principales', price: 12.5, stock: 10, lowStock: 3, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: ['moluscos', 'crustaceos'] },
    { id: 'p28', name: 'Lasaña Casera',     category: 'Principales', price: 10.5, stock: 12, lowStock: 4, ubicacion: 'Cocina',  discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos', 'huevos'] },
    { id: 'p29', name: 'Crema Catalana',    category: 'Postres',    price: 4.0,  stock: 14, lowStock: 4,  ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['huevos', 'lacteos'] },
    { id: 'p30', name: 'Helado Vainilla',   category: 'Postres',    price: 3.5,  stock: 18, lowStock: 5,  ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['lacteos'] },
  ];
  return { categories, products };
}

const MENU_ITEMS = [
  { id: 'm1', name: 'Menú del día (laborables)', type: 'menu_del_dia', days: [1,2,3,4,5], startHour: 13, endHour: 16, items: ['p12', 'p14', 'p15'], discount: 15 },
  { id: 'h1', name: 'Happy Hour Cocktails', type: 'happy_hour', days: [0,1,2,3,4,5,6], startHour: 18, endHour: 23, discount: 30, productIds: ['p2', 'p4'] }
];

export function getDailyMenu(date) {
  const d = date || new Date();
  const dow = d.getDay();
  const hour = d.getHours();
  return MENU_ITEMS.find(m => m.days.includes(dow) && hour >= m.startHour && hour < m.endHour);
}

export function seedFloor() {
  const tables = [
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `t${i + 1}`, name: `Mesa ${i + 1}`, status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'mesa',
      x: 60 + (i % 4) * 140, y: 60 + Math.floor(i / 4) * 140, width: 80, height: 80, radius: 40,
      shape: 'rect', rotation: 0, seats: 4, zone: 'z1', layer: 0, color: '',
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `t${10 + i}`, name: `Barra ${i + 1}`, status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'barra',
      x: 600, y: 60 + i * 80, width: 140, height: 50, radius: 25,
      shape: 'rect', rotation: 0, seats: 4, zone: 'z3', layer: 0, color: '',
    })),
    { id: 't16', name: 'Para llevar', status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'llevar', x: 810, y: 60, width: 90, height: 50, radius: 25, shape: 'rect', rotation: 0, seats: 0, zone: '', layer: 0, color: '' },
    { id: 't17', name: 'Domicilio', status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'domicilio', x: 810, y: 140, width: 90, height: 50, radius: 25, shape: 'rect', rotation: 0, seats: 0, zone: '', layer: 0, color: '' },
    { id: 't18', name: 'Domicilio 2', status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'domicilio', x: 810, y: 220, width: 90, height: 50, radius: 25, shape: 'rect', rotation: 0, seats: 0, zone: '', layer: 0, color: '' },
    { id: 't19', name: 'Domicilio 3', status: 'libre', orderId: null, reserved: null, isFiado: false, type: 'domicilio', x: 810, y: 300, width: 90, height: 50, radius: 25, shape: 'rect', rotation: 0, seats: 0, zone: '', layer: 0, color: '' },
  ];
  return {
    tables,
    orders: {},
    zones: [
      { id: 'z1', name: 'Interior', color: '#c4a04a' },
      { id: 'z2', name: 'Terraza', color: '#7a9a7c' },
      { id: 'z3', name: 'Barra', color: '#b05e5e' },
    ],
    background: null,
  };
}

export function seedEmployees() {
  return [
    { id: 'e_admin', name: 'Administrador', pin: '1234', role: 'admin', personalDiscountEnabled: true, monthlyLimit: 80, monthlyUsed: 0, monthlyUsedMonth: '' },
    { id: 'e_1',     name: 'Ana',           pin: '1111', role: 'camarero', personalDiscountEnabled: true, monthlyLimit: 80, monthlyUsed: 0, monthlyUsedMonth: '' },
    { id: 'e_2',     name: 'Luis',          pin: '2222', role: 'camarero', personalDiscountEnabled: true, monthlyLimit: 80, monthlyUsed: 0, monthlyUsedMonth: '' },
  ];
}

export const MODIFIERS = [
  'Sin cebolla', 'Sin gluten', 'Poco hecho', 'Bien hecho', 'Sin sal', 'Sin lactosa', 'Extra queso', 'A la plancha', 'Frito', 'Sin ajo',
];

export const ALLERGENS = [
  { id: 'gluten',      label: 'Gluten',      abbr: 'G' },
  { id: 'crustaceos',  label: 'Crustáceos',  abbr: 'C' },
  { id: 'huevos',      label: 'Huevos',      abbr: 'H' },
  { id: 'pescado',     label: 'Pescado',     abbr: 'P' },
  { id: 'cacahuetes',  label: 'Cacahuetes',  abbr: 'Cn' },
  { id: 'soja',        label: 'Soja',        abbr: 'S' },
  { id: 'lacteos',     label: 'Lácteos',     abbr: 'L' },
  { id: 'frutos_secos',label: 'Frutos secos',abbr: 'Fs' },
  { id: 'apio',        label: 'Apio',        abbr: 'A' },
  { id: 'mostaza',     label: 'Mostaza',     abbr: 'M' },
  { id: 'sesamo',      label: 'Sésamo',      abbr: 'Ss' },
  { id: 'sulfitos',    label: 'Sulfitos',    abbr: 'Su' },
  { id: 'altramuces',  label: 'Altramuces',  abbr: 'Al' },
  { id: 'moluscos',    label: 'Moluscos',    abbr: 'Mo' },
];

export const ALLERGEN_COLORS = {
  gluten: '#c4a04a', crustaceos: '#b05e5e', huevos: '#d4b86a', pescado: '#6b9bf8',
  cacahuetes: '#9c6b3e', soja: '#7a9a7c', lacteos: '#d4c4aa', frutos_secos: '#8a6b4a',
  apio: '#6a9a4a', mostaza: '#c4a04a', sesamo: '#b89850', sulfitos: '#a67a1e',
  altramuces: '#9a7a4a', moluscos: '#7a8a9a',
};
