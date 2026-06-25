export function seedModifierGroups() {
  return [
    {
      id: 'mg1', name: 'Punto de carne', type: 'single', required: false,
      options: [
        { id: 'mo1', name: 'Poco hecho', priceDelta: 0, isDefault: false },
        { id: 'mo2', name: 'Al punto', priceDelta: 0, isDefault: true },
        { id: 'mo3', name: 'Bien hecho', priceDelta: 0, isDefault: false },
      ],
    },
    {
      id: 'mg2', name: 'Acompañamiento', type: 'single', required: true,
      options: [
        { id: 'mo4', name: 'Patatas fritas', priceDelta: 0, isDefault: true },
        { id: 'mo5', name: 'Ensalada', priceDelta: 0, isDefault: false },
        { id: 'mo6', name: 'Arroz', priceDelta: 0, isDefault: false },
      ],
    },
    {
      id: 'mg3', name: 'Extras', type: 'multiple', required: false,
      options: [
        { id: 'mo7', name: 'Queso extra', priceDelta: 1.5, isDefault: false },
        { id: 'mo8', name: 'Huevo', priceDelta: 1, isDefault: false },
        { id: 'mo9', name: 'Bacon', priceDelta: 2, isDefault: false },
      ],
    },
    {
      id: 'mg4', name: 'Tamaño', type: 'single', required: true,
      options: [
        { id: 'mo10', name: 'Normal', priceDelta: 0, isDefault: true },
        { id: 'mo11', name: 'Grande', priceDelta: 3, isDefault: false },
      ],
    },
  ];
}

export const DEFAULT_PRODUCT_MODIFIERS = {
  p12: ['mg1', 'mg2', 'mg3', 'mg4'],
  p13: ['mg1', 'mg2'],
  p14: ['mg2'],
};
