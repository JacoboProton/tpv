export interface PaymentMethod {
  id: string;
  label: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'bizum', label: 'Bizum' },
  { id: 'fiado', label: 'Fiado' },
  { id: 'gift', label: 'Tarjeta regalo' },
];
