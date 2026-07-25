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

export const MODIFIERS: string[] = [
  'Sin cebolla', 'Sin gluten', 'Poco hecho', 'Bien hecho', 'Sin sal', 'Sin lactosa', 'Extra queso', 'A la plancha', 'Frito', 'Sin ajo',
];
