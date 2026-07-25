export interface Allergen {
  id: string;
  label: string;
  abbr: string;
}

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
