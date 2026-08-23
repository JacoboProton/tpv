import { describe, it, expect } from 'vitest';
import { buildPayments, formatPaymentMethod } from '@tpv/core';

describe('gift card payment split', () => {
  it('buildPayments conserva el código de tarjeta regalo', () => {
    const payments = buildPayments([
      { method: 'efectivo', amount: 10 },
      { method: 'gift', amount: 5, code: 'ABC123' },
    ]);
    const gift = payments.find(p => p.method === 'gift');
    expect(gift).toBeDefined();
    expect((gift as { code?: string }).code).toBe('ABC123');
    expect(payments.find(p => p.method === 'efectivo')?.amount).toBe(10);
  });

  it('formatPaymentMethod etiqueta la tarjeta regalo', () => {
    const label = formatPaymentMethod([{ method: 'gift', amount: 5, code: 'ABC123' }]);
    expect(label).toContain('Tarjeta regalo');
  });
});
