export interface Theme {
  base: string;
  surface: string;
  surfaceLight: string;
  line: string;
  brass: string;
  brassLight: string;
  sage: string;
  sageLight: string;
  wine: string;
  wineLight: string;
  cream: string;
  muted: string;
  headerBg: string;
  ticketBg: string;
  ticketText: string;
  overlay: string;
}

interface SeedCategory {
  id: string;
  name: string;
}

interface SeedProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStock: number;
  ubicacion: string;
  discount: number;
  course: string;
  allergens: string[];
  description?: string;
  image?: string;
  featured?: boolean;
}

interface SeedTable {
  id: string;
  name: string;
  status: string;
  orderId: null;
  reserved: null;
  isFiado: boolean;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  shape: string;
  rotation: number;
  seats: number;
  zone: string;
  layer: number;
  color: string;
}

interface SeedZone {
  id: string;
  name: string;
  color: string;
}

interface SeedFloor {
  tables: SeedTable[];
  orders: Record<string, never>;
  zones: SeedZone[];
  background: null;
}

interface SeedEmployee {
  id: string;
  name: string;
  pin: string;
  role: string;
  personalDiscountEnabled: boolean;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyUsedMonth: string;
}

interface MenuItem {
  id: string;
  name: string;
  type: string;
  days: number[];
  startHour: number;
  endHour: number;
  discount: number;
  items?: string[];
  productIds?: string[];
}

interface Allergen {
  id: string;
  label: string;
  abbr: string;
}

export const THEMES: Record<string, Theme> = {
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

export let C: Theme = THEMES.dark;

export function setGlobalTheme(mode: 'dark' | 'light') {
  C = THEMES[mode];
}

export const KEYS: Record<string, string> = {
  CATALOG: 'tpv:catalog',
  FLOOR: 'tpv:floor',
  SALES: 'tpv:sales',
  EMPLOYEES: 'tpv:employees',
  STOCK_LOG: 'tpv:stock_log',
  CANCELLED: 'tpv:cancelled',
  TURNS: 'tpv:turns',
};

export const TICKET_EDGE: { height: number; background: string; clipPath: string } = {
  height: 9,
  background: '#e6e1d6',
  clipPath:
    'polygon(0% 9px,4% 0%,8% 9px,12% 0%,16% 9px,20% 0%,24% 9px,28% 0%,32% 9px,36% 0%,40% 9px,44% 0%,48% 9px,52% 0%,56% 9px,60% 0%,64% 9px,68% 0%,72% 9px,76% 0%,80% 9px,84% 0%,88% 9px,92% 0%,96% 9px,100% 0%,100% 100%,0% 100%)',
};

export const TICKET_PRINT_STYLE: Record<string, string> = {
  width: '80mm',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  lineHeight: '1.3',
  padding: '2mm 3mm',
};

export const COURSES: string[] = ['Entrantes', 'Principales', 'Postres'];

interface PaymentMethod {
  id: string;
  label: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'bizum', label: 'Bizum' },
  { id: 'fiado', label: 'Fiado' },
];

export function euros(n: number | null | undefined): string {
  return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function clone<T>(obj: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
}

export function seedCatalog(): { categories: SeedCategory[]; products: SeedProduct[] } {
  const categories: SeedCategory[] = [
    { id: 'cat_beb', name: 'Bebidas' },
    { id: 'cat_tap', name: 'Tapas' },
    { id: 'cat_pri', name: 'Principales' },
    { id: 'cat_pos', name: 'Postres' }
  ];
  const products: SeedProduct[] = [
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

    /* ── BEBIDAS (20 más) ── */
    { id: 'p31', name: 'Vino Blanco (Rueda)',     category: 'Bebidas', price: 3.5,  stock: 30, lowStock: 8,  ubicacion: 'Bar', discount: 0, course: '', allergens: ['sulfitos'], description: 'Verdejo D.O. Rueda, fresco y afrutado.' },
    { id: 'p32', name: 'Vino Tinto (Rioja)',      category: 'Bebidas', price: 4.0,  stock: 30, lowStock: 8,  ubicacion: 'Bar', discount: 0, course: '', allergens: ['sulfitos'], description: 'Crianza D.O. Rioja, tempranillo.' },
    { id: 'p33', name: 'Cava Brut Nature',        category: 'Bebidas', price: 5.0,  stock: 20, lowStock: 6,  ubicacion: 'Bar', discount: 0, course: '', allergens: ['sulfitos'] },
    { id: 'p34', name: 'Cerveza de Barril (pinta)', category: 'Bebidas', price: 3.0, stock: 60, lowStock: 15, ubicacion: 'Bar', discount: 0, course: '', allergens: ['gluten'] },
    { id: 'p35', name: 'Clara con Limón',          category: 'Bebidas', price: 2.8,  stock: 40, lowStock: 10, ubicacion: 'Bar', discount: 0, course: '', allergens: ['gluten'] },
    { id: 'p36', name: 'Gin Tonic Premium',        category: 'Bebidas', price: 8.5,  stock: 20, lowStock: 5,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p37', name: 'Ron con Cola',             category: 'Bebidas', price: 7.0,  stock: 20, lowStock: 5,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p38', name: 'Mojito Clásico',           category: 'Bebidas', price: 7.5,  stock: 20, lowStock: 5,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p39', name: 'Vodka con Naranja',        category: 'Bebidas', price: 7.0,  stock: 20, lowStock: 5,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p40', name: 'Whisky (Ballantine\'s)',   category: 'Bebidas', price: 5.0,  stock: 15, lowStock: 4,  ubicacion: 'Bar', discount: 0, course: '', allergens: ['gluten'] },
    { id: 'p41', name: 'Chupito de Hierbas',       category: 'Bebidas', price: 2.5,  stock: 30, lowStock: 8,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p42', name: 'Té (varios)',              category: 'Bebidas', price: 1.8,  stock: 20, lowStock: 5,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p43', name: 'Manzanilla / Poleo',       category: 'Bebidas', price: 1.8,  stock: 20, lowStock: 5,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p44', name: 'Leche Merengada',          category: 'Bebidas', price: 3.5,  stock: 15, lowStock: 4,  ubicacion: 'Bar', discount: 0, course: '', allergens: ['lacteos'] },
    { id: 'p45', name: 'Batido de Fresa',          category: 'Bebidas', price: 3.5,  stock: 15, lowStock: 4,  ubicacion: 'Bar', discount: 0, course: '', allergens: ['lacteos'] },
    { id: 'p46', name: 'Smoothie Tropical',         category: 'Bebidas', price: 4.0,  stock: 15, lowStock: 4,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p47', name: 'Agua con Gas',              category: 'Bebidas', price: 1.8,  stock: 40, lowStock: 10, ubicacion: 'Bar', discount: 0, course: '', allergens: [] },
    { id: 'p48', name: 'Cerveza Sin Alcohol',       category: 'Bebidas', price: 2.5,  stock: 30, lowStock: 8,  ubicacion: 'Bar', discount: 0, course: '', allergens: ['gluten'] },
    { id: 'p49', name: 'Sidra Natural',             category: 'Bebidas', price: 3.0,  stock: 15, lowStock: 4,  ubicacion: 'Bar', discount: 0, course: '', allergens: ['sulfitos'] },
    { id: 'p50', name: 'Orujo de Hierbas',          category: 'Bebidas', price: 3.0,  stock: 20, lowStock: 5,  ubicacion: 'Bar', discount: 0, course: '', allergens: [] },

    /* ── TAPAS (15 más) ── */
    { id: 'p51', name: 'Boquerones en Vinagre',   category: 'Tapas',  price: 7.0,  stock: 15, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['pescado'], description: 'Boquerones frescos marinados con ajo y perejil.' },
    { id: 'p52', name: 'Chorizo a la Sidra',      category: 'Tapas',  price: 6.5,  stock: 18, lowStock: 5, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: [] },
    { id: 'p53', name: 'Queso Manchego Curado',   category: 'Tapas',  price: 8.0,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['lacteos'] },
    { id: 'p54', name: 'Tabla de Embutidos',      category: 'Tapas',  price: 14.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: [], featured: true, description: 'Selección de embutidos ibéricos con pan cristal.' },
    { id: 'p55', name: 'Mejillones al Vapor',     category: 'Tapas',  price: 7.5,  stock: 15, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['moluscos'] },
    { id: 'p56', name: 'Almejas a la Marinera',   category: 'Tapas',  price: 9.5,  stock: 12, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['moluscos', 'gluten'], description: 'Almejas frescas en salsa verde con vino blanco.' },
    { id: 'p57', name: 'Pulpo a la Gallega',      category: 'Tapas',  price: 11.0, stock: 12, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['moluscos'] },
    { id: 'p58', name: 'Berenjenas con Miel',     category: 'Tapas',  price: 6.0,  stock: 15, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['gluten'] },
    { id: 'p59', name: 'Croquetas de Setas',      category: 'Tapas',  price: 7.0,  stock: 18, lowStock: 5, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['gluten', 'lacteos', 'huevos'], description: 'Croquetas cremosas de setas variadas.' },
    { id: 'p60', name: 'Boniato Frito',           category: 'Tapas',  price: 5.0,  stock: 20, lowStock: 5, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: [] },
    { id: 'p61', name: 'Tortilla de Camarones',   category: 'Tapas',  price: 7.0,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['gluten', 'crustaceos'] },
    { id: 'p62', name: 'Pimientos Rellenos',      category: 'Tapas',  price: 7.5,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['lacteos'] },
    { id: 'p63', name: 'Chipirones a la Plancha', category: 'Tapas',  price: 8.5,  stock: 12, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['moluscos'] },
    { id: 'p64', name: 'Montadito de Lomo',       category: 'Tapas',  price: 5.5,  stock: 20, lowStock: 5, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['gluten'] },
    { id: 'p65', name: 'Tabla de Quesos',         category: 'Tapas',  price: 12.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Entrantes', allergens: ['lacteos'], description: 'Selección de tres quesos artesanos con membrillo.' },

    /* ── PRINCIPALES (30 más) ── */
    { id: 'p66', name: 'Entrecot de Buey',            category: 'Principales', price: 22.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [], featured: true, description: 'Entrecot de buey madurado 60 días con patatas y pimientos de Padrón.' },
    { id: 'p67', name: 'Chuletón de Ternera',         category: 'Principales', price: 26.0, stock: 8,  lowStock: 2, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [], featured: true, description: 'Chuletón de ternera gallega a la parrilla con guarnición.' },
    { id: 'p68', name: 'Secreto Ibérico',             category: 'Principales', price: 18.0, stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [] },
    { id: 'p69', name: 'Lomo de Merluza',             category: 'Principales', price: 16.5, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['pescado'] },
    { id: 'p70', name: 'Bacalao al Pil Pil',          category: 'Principales', price: 17.0, stock: 8,  lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['pescado', 'gluten'], description: 'Bacalao confitado en aceite de oliva con ajos y guindilla.' },
    { id: 'p71', name: 'Lubina a la Sal',             category: 'Principales', price: 19.0, stock: 8,  lowStock: 2, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['pescado'] },
    { id: 'p72', name: 'Dorada a la Plancha',         category: 'Principales', price: 17.5, stock: 8,  lowStock: 2, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['pescado'] },
    { id: 'p73', name: 'Salmón a la Mostaza',         category: 'Principales', price: 15.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['pescado', 'mostaza'] },
    { id: 'p74', name: 'Arroz Caldoso de Marisco',    category: 'Principales', price: 14.0, stock: 8,  lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['crustaceos', 'moluscos', 'gluten'] },
    { id: 'p75', name: 'Fideuá',                      category: 'Principales', price: 13.5, stock: 8,  lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['gluten', 'crustaceos', 'moluscos'], description: 'Fideos finos con marisco y all i oli.' },
    { id: 'p76', name: 'Risotto de Setas',            category: 'Principales', price: 12.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['lacteos'] },
    { id: 'p77', name: 'Tagliatelle al Pesto',        category: 'Principales', price: 11.0, stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos', 'frutos_secos'] },
    { id: 'p78', name: 'Canelones de Espinacas',      category: 'Principales', price: 10.5, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos', 'huevos'] },
    { id: 'p79', name: 'Berenjenas Rellenas',         category: 'Principales', price: 11.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['lacteos'] },
    { id: 'p80', name: 'Pavo Asado al Horno',         category: 'Principales', price: 11.5, stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [] },
    { id: 'p81', name: 'Codillo de Cerdo',            category: 'Principales', price: 14.0, stock: 8,  lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [] },
    { id: 'p82', name: 'Conejo al Ajillo',            category: 'Principales', price: 12.0, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [] },
    { id: 'p83', name: 'Pollo al Curry',              category: 'Principales', price: 11.0, stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['lacteos'] },
    { id: 'p84', name: 'Filete de Ternera',           category: 'Principales', price: 13.5, stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [] },
    { id: 'p85', name: 'Hamburguesa BBQ',             category: 'Principales', price: 11.0, stock: 15, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos'] },
    { id: 'p86', name: 'Pizza Prosciutto',            category: 'Principales', price: 10.0, stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos'] },
    { id: 'p87', name: 'Pizza Margarita',             category: 'Principales', price: 9.0,  stock: 14, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos'] },
    { id: 'p88', name: 'Wrap de Pollo',               category: 'Principales', price: 9.5,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['gluten', 'lacteos'] },
    { id: 'p89', name: 'Ensalada César',              category: 'Principales', price: 9.0,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['lacteos', 'huevos', 'gluten'] },
    { id: 'p90', name: 'Ensalada de Aguacate',        category: 'Principales', price: 10.5, stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['crustaceos'] },
    { id: 'p91', name: 'Verduras Asadas',             category: 'Principales', price: 8.5,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [] },
    { id: 'p92', name: 'Revuelto de Setas',           category: 'Principales', price: 9.0,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['huevos', 'lacteos'] },
    { id: 'p93', name: 'Huevos Rotos con Jamón',      category: 'Principales', price: 8.5,  stock: 15, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: ['huevos', 'gluten'] },
    { id: 'p94', name: 'Patatas Revolconas',          category: 'Principales', price: 7.0,  stock: 15, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [] },
    { id: 'p95', name: 'Menestra de Verduras',        category: 'Principales', price: 8.0,  stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Principales', allergens: [] },

    /* ── POSTRES (15 más) ── */
    { id: 'p96',  name: 'Tiramisú',                category: 'Postres', price: 5.0,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['lacteos', 'huevos', 'gluten'], description: 'Tiramisú clásico con mascarpone y café.' },
    { id: 'p97',  name: 'Coulant de Chocolate',    category: 'Postres', price: 6.0,  stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['huevos', 'lacteos', 'gluten'], featured: true },
    { id: 'p98',  name: 'Tarta de Zanahoria',      category: 'Postres', price: 4.5,  stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['huevos', 'lacteos', 'gluten', 'frutos_secos'] },
    { id: 'p99',  name: 'Cheesecake New York',     category: 'Postres', price: 5.0,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['lacteos', 'huevos', 'gluten'] },
    { id: 'p100', name: 'Mousse de Chocolate',     category: 'Postres', price: 4.5,  stock: 14, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['huevos', 'lacteos'] },
    { id: 'p101', name: 'Natillas Caseras',        category: 'Postres', price: 3.5,  stock: 14, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['huevos', 'lacteos'] },
    { id: 'p102', name: 'Arroz con Leche',         category: 'Postres', price: 4.0,  stock: 14, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['lacteos'] },
    { id: 'p103', name: 'Torrijas',                category: 'Postres', price: 4.5,  stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['gluten', 'huevos', 'lacteos'] },
    { id: 'p104', name: 'Fruta del Tiempo',        category: 'Postres', price: 3.0,  stock: 15, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: [] },
    { id: 'p105', name: 'Sorbete de Limón',        category: 'Postres', price: 3.5,  stock: 15, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: [] },
    { id: 'p106', name: 'Brownie con Helado',      category: 'Postres', price: 5.5,  stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['gluten', 'huevos', 'lacteos'] },
    { id: 'p107', name: 'Tarta de Manzana',        category: 'Postres', price: 4.5,  stock: 10, lowStock: 3, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['gluten', 'lacteos', 'huevos'] },
    { id: 'p108', name: 'Crepes con Nutella',      category: 'Postres', price: 5.0,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['gluten', 'lacteos', 'huevos', 'frutos_secos'] },
    { id: 'p109', name: 'Macedonia de Frutas',     category: 'Postres', price: 4.0,  stock: 14, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: [] },
    { id: 'p110', name: 'Yemas de Santa Teresa',   category: 'Postres', price: 3.5,  stock: 12, lowStock: 4, ubicacion: 'Cocina', discount: 0, course: 'Postres', allergens: ['huevos'] },
  ];
  return { categories, products };
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'Menú del día (laborables)', type: 'menu_del_dia', days: [1,2,3,4,5], startHour: 13, endHour: 16, items: ['p12', 'p14', 'p15'], discount: 15 },
  { id: 'h1', name: 'Happy Hour Cocktails', type: 'happy_hour', days: [0,1,2,3,4,5,6], startHour: 18, endHour: 23, discount: 30, productIds: ['p2', 'p4'] }
];

export function getDailyMenu(date?: Date): MenuItem | undefined {
  const d = date || new Date();
  const dow = d.getDay();
  const hour = d.getHours();
  return MENU_ITEMS.find(m => m.days.includes(dow) && hour >= m.startHour && hour < m.endHour);
}

export function seedFloor(): SeedFloor {
  const tables: SeedTable[] = [
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `t${i + 1}`, name: `Mesa ${i + 1}`, status: 'libre' as const, orderId: null, reserved: null, isFiado: false, type: 'mesa' as const,
      x: 60 + (i % 4) * 140, y: 60 + Math.floor(i / 4) * 140, width: 80, height: 80, radius: 40,
      shape: 'rect' as const, rotation: 0, seats: 4, zone: 'z1', layer: 0, color: '',
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `t${10 + i}`, name: `Barra ${i + 1}`, status: 'libre' as const, orderId: null, reserved: null, isFiado: false, type: 'barra' as const,
      x: 600, y: 60 + i * 80, width: 140, height: 50, radius: 25,
      shape: 'rect' as const, rotation: 0, seats: 4, zone: 'z3', layer: 0, color: '',
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

export function seedEmployees(): SeedEmployee[] {
  return [
    { id: 'e_admin', name: 'Administrador', pin: '1234', role: 'admin', personalDiscountEnabled: true, monthlyLimit: 80, monthlyUsed: 0, monthlyUsedMonth: '' },
    { id: 'e_1',     name: 'Ana',           pin: '1111', role: 'camarero', personalDiscountEnabled: true, monthlyLimit: 80, monthlyUsed: 0, monthlyUsedMonth: '' },
    { id: 'e_2',     name: 'Luis',          pin: '2222', role: 'camarero', personalDiscountEnabled: true, monthlyLimit: 80, monthlyUsed: 0, monthlyUsedMonth: '' },
  ];
}

export const MODIFIERS: string[] = [
  'Sin cebolla', 'Sin gluten', 'Poco hecho', 'Bien hecho', 'Sin sal', 'Sin lactosa', 'Extra queso', 'A la plancha', 'Frito', 'Sin ajo',
];

export const ALLERGENS: Allergen[] = [
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

export const ALLERGEN_COLORS: Record<string, string> = {
  gluten: '#c4a04a', crustaceos: '#b05e5e', huevos: '#d4b86a', pescado: '#6b9bf8',
  cacahuetes: '#9c6b3e', soja: '#7a9a7c', lacteos: '#d4c4aa', frutos_secos: '#8a6b4a',
  apio: '#6a9a4a', mostaza: '#c4a04a', sesamo: '#b89850', sulfitos: '#a67a1e',
  altramuces: '#9a7a4a', moluscos: '#7a8a9a',
};
