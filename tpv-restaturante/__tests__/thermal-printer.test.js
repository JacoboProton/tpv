import { describe, it, expect } from 'vitest';
import {
  escposInit, escposCenter, escposLeft, escposBold, escposDoubleHeight,
  escposCut, escposLine, escposText, escposSeparator, escposOpenDrawer,
  generateTicketData, webUsbSupported
} from '../lib/thermal-printer';

describe('ESC/POS commands', () => {
  it('init produces ESC @', () => {
    expect(escposInit()).toEqual(new Uint8Array([0x1b, 0x40]));
  });

  it('center produces ESC a 1', () => {
    expect(escposCenter()).toEqual(new Uint8Array([0x1b, 0x61, 0x01]));
  });

  it('left produces ESC a 0', () => {
    expect(escposLeft()).toEqual(new Uint8Array([0x1b, 0x61, 0x00]));
  });

  it('bold on produces ESC E 1', () => {
    expect(escposBold(true)).toEqual(new Uint8Array([0x1b, 0x45, 0x01]));
  });

  it('bold off produces ESC E 0', () => {
    expect(escposBold(false)).toEqual(new Uint8Array([0x1b, 0x45, 0x00]));
  });

  it('double height on produces GS ! 0x11', () => {
    expect(escposDoubleHeight(true)).toEqual(new Uint8Array([0x1d, 0x21, 0x11]));
  });

  it('double height off produces GS ! 0x00', () => {
    expect(escposDoubleHeight(false)).toEqual(new Uint8Array([0x1d, 0x21, 0x00]));
  });

  it('cut produces GS V 0', () => {
    expect(escposCut()).toEqual(new Uint8Array([0x1d, 0x56, 0x00]));
  });

  it('line produces LF bytes', () => {
    expect(escposLine(1)).toEqual(new Uint8Array([0x0a]));
    expect(escposLine(3)).toEqual(new Uint8Array([0x0a, 0x0a, 0x0a]));
  });

  it('open drawer produces correct sequence', () => {
    expect(escposOpenDrawer()).toEqual(new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]));
  });

  it('text encoder produces text + newline', () => {
    const result = escposText('Hola');
    const decoder = new TextDecoder();
    expect(decoder.decode(result)).toBe('Hola\n');
  });

  it('separator produces repeated char', () => {
    const decoder = new TextDecoder();
    expect(decoder.decode(escposSeparator('-', 8))).toBe('--------\n');
    expect(decoder.decode(escposSeparator('=', 4))).toBe('====\n');
  });
});

describe('generateTicketData', () => {
  const sample = {
    restaurant: 'TEST BAR',
    table: 'Mesa 3',
    items: [
      { name: 'Café solo', qty: 2, price: 1.50, modifiers: [] },
      { name: 'Tortilla', qty: 1, price: 8.00, modifiers: [{ optionName: 'Con cebolla' }] },
    ],
    totals: { total: 11.00, discount: 0, discountAmount: 0, tip: 1.00, verifactuNum: 'VERI-2025-000042' },
    date: '01/01/2025 12:00:00',
  };

  it('returns a Uint8Array with content', () => {
    const result = generateTicketData(sample);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(50);
  });

  it('includes restaurant name', () => {
    const result = generateTicketData(sample);
    const decoder = new TextDecoder();
    expect(decoder.decode(result)).toContain('TEST BAR');
  });

  it('includes table name', () => {
    const decoder = new TextDecoder();
    expect(decoder.decode(generateTicketData(sample))).toContain('Mesa 3');
  });

  it('includes item names and prices', () => {
    const decoder = new TextDecoder();
    const text = decoder.decode(generateTicketData(sample));
    expect(text).toContain('Café solo');
    expect(text).toContain('Tortilla');
    expect(text).toContain('1.50');
    expect(text).toContain('8.00');
  });

  it('includes modifiers', () => {
    const decoder = new TextDecoder();
    expect(decoder.decode(generateTicketData(sample))).toContain('Con cebolla');
  });

  it('includes total', () => {
    const decoder = new TextDecoder();
    expect(decoder.decode(generateTicketData(sample))).toContain('11.00');
  });

  it('includes tip when present', () => {
    const decoder = new TextDecoder();
    expect(decoder.decode(generateTicketData(sample))).toContain('Propina');
  });

  it('includes Verifactu number', () => {
    const decoder = new TextDecoder();
    expect(decoder.decode(generateTicketData(sample))).toContain('VERI-2025-000042');
  });

  it('starts with ESC @ (init)', () => {
    const result = generateTicketData(sample);
    expect(result[0]).toBe(0x1b);
    expect(result[1]).toBe(0x40);
  });

  it('ends with cut command', () => {
    const result = generateTicketData(sample);
    const last = result.slice(-3);
    expect(last).toEqual(new Uint8Array([0x1d, 0x56, 0x00]));
  });

  it('handles empty items', () => {
    const empty = { ...sample, items: [], totals: { total: 0, discount: 0, discountAmount: 0, tip: 0 } };
    const result = generateTicketData(empty);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(20);
  });

  it('handles discount display', () => {
    const withDiscount = {
      ...sample,
      totals: { total: 10.00, discount: 20, discountAmount: 2.00, tip: 0 },
    };
    const decoder = new TextDecoder();
    expect(decoder.decode(generateTicketData(withDiscount))).toContain('Dto: 20%');
  });
});

describe('webUsbSupported', () => {
  it('returns false when usb is not available (jsdom)', () => {
    expect(webUsbSupported()).toBe(false);
  });
});
