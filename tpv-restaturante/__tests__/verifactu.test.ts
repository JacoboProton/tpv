import { describe, it, expect } from 'vitest';
import { formatFecha, formatHora, computeHash, buildQRUrl, generateRegistroFactura } from '../lib/verifactu';

describe('formatFecha', () => {
  it('formats ISO date correctly', () => {
    const ts = new Date('2025-06-15T10:30:00').getTime();
    expect(formatFecha(ts)).toBe('2025-06-15');
  });

  it('pads month and day', () => {
    const ts = new Date('2025-01-05T00:00:00').getTime();
    expect(formatFecha(ts)).toBe('2025-01-05');
  });
});

describe('formatHora', () => {
  it('formats time correctly', () => {
    const ts = new Date('2025-06-15T08:05:03').getTime();
    expect(formatHora(ts)).toBe('08:05:03');
  });
});

describe('computeHash', () => {
  it('returns a 64-char hex string', () => {
    const hash = computeHash({
      nif: 'B12345678',
      numSerie: 'VERI-2025-000001',
      fechaExpedicion: '2025-06-15',
      tipoFactura: 'F1',
      cuotaTotal: 0.72,
      importeTotal: 11.00,
      huellaAnterior: '0',
      fechaHoraFirma: '2025-06-15T10:30:00',
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces same hash for same input', () => {
    const data = {
      nif: 'B12345678',
      numSerie: 'VERI-2025-000001',
      fechaExpedicion: '2025-06-15',
      tipoFactura: 'F1',
      cuotaTotal: 0.72,
      importeTotal: 11.00,
      huellaAnterior: '0',
      fechaHoraFirma: '2025-06-15T10:30:00',
    };
    expect(computeHash(data)).toBe(computeHash(data));
  });

  it('changes hash when input changes', () => {
    const base = {
      nif: 'B12345678',
      numSerie: 'VERI-2025-000001',
      fechaExpedicion: '2025-06-15',
      tipoFactura: 'F1',
      cuotaTotal: 0.72,
      importeTotal: 11.00,
      huellaAnterior: '0',
      fechaHoraFirma: '2025-06-15T10:30:00',
    };
    const modified = { ...base, importeTotal: 22.00 };
    expect(computeHash(base)).not.toBe(computeHash(modified));
  });

  it('chains correctly (hash includes previous hash)', () => {
    const first = computeHash({
      nif: 'B12345678', numSerie: 'VERI-2025-000001',
      fechaExpedicion: '2025-06-15', tipoFactura: 'F1',
      cuotaTotal: 0.72, importeTotal: 11.00,
      huellaAnterior: '0', fechaHoraFirma: '2025-06-15T10:30:00',
    });
    const second = computeHash({
      nif: 'B12345678', numSerie: 'VERI-2025-000002',
      fechaExpedicion: '2025-06-15', tipoFactura: 'F1',
      cuotaTotal: 1.44, importeTotal: 22.00,
      huellaAnterior: first, fechaHoraFirma: '2025-06-15T11:00:00',
    });
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
  });
});

describe('buildQRUrl', () => {
  it('builds URL with all params', () => {
    const url = buildQRUrl('B12345678', 'VERI-2025-000001', '2025-06-15', 11.00);
    expect(url).toContain('nif=B12345678');
    expect(url).toContain('numserie=VERI-2025-000001');
    expect(url).toContain('fecha=2025-06-15');
    expect(url).toContain('importe=11.00');
  });

  it('rounds importe to 2 decimals', () => {
    const url = buildQRUrl('B12345678', 'S001', '2025-01-01', 10.5);
    expect(url).toContain('importe=10.50');
  });

  it('uses correct base URL', () => {
    const url = buildQRUrl('B12345678', 'S001', '2025-01-01', 10);
    expect(url).toContain('aeat.es');
  });
});

describe('generateRegistroFactura', () => {
  it('returns xml, hash, qrUrl and registroData', () => {
    const sale = {
      id: 'sale_001',
      closedAt: new Date('2025-06-15T10:30:00').getTime(),
      total: 11.00,
      totalWithTip: 11.00,
      tableName: 'Mesa 3',
    };
    const result = generateRegistroFactura(sale, '0', 'VERI-2025-000001');

    expect(result).toHaveProperty('xml');
    expect(result).toHaveProperty('hash');
    expect(result).toHaveProperty('qrUrl');
    expect(result).toHaveProperty('registroData');
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates valid XML with IGIC', () => {
    const sale = {
      id: 'sale_001',
      closedAt: new Date('2025-06-15T10:30:00').getTime(),
      total: 11.00,
      totalWithTip: 11.00,
      tableName: 'Mesa 5',
    };
    const { xml } = generateRegistroFactura(sale, '0', 'VERI-2025-000001');

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<RegFactuSistemaFacturacion>');
    expect(xml).toContain('<TipoDesgloseIGIC>');
    expect(xml).toContain('<TipoImpositivo>7.00</TipoImpositivo>');
    expect(xml).toContain('<ImporteTotal>11.00</ImporteTotal>');
    expect(xml).toContain('<HuellaRegistroAnterior>0</HuellaRegistroAnterior>');
    expect(xml).toContain('Mesa 5');
  });

  it('calculates IGIC correctly (7% of total)', () => {
    const sale = {
      id: 'sale_002',
      closedAt: Date.now(),
      total: 107.00,
      totalWithTip: 107.00,
    };
    const { xml } = generateRegistroFactura(sale, '0', 'VERI-2025-000002');

    // base = 107 / 1.07 = 100, cuota = 7
    expect(xml).toContain('<BaseImponible>100.00</BaseImponible>');
    expect(xml).toContain('<CuotaRepercutida>7.00</CuotaRepercutida>');
  });

  it('handles sale without tableName', () => {
    const sale = {
      id: 'sale_003',
      closedAt: Date.now(),
      total: 50.00,
      totalWithTip: 50.00,
    };
    const { xml } = generateRegistroFactura(sale, '0', 'VERI-2025-000003');
    expect(xml).toContain('Venta TPV');
  });

  it('builds QR URL in result', () => {
    const sale = {
      id: 'sale_004',
      closedAt: Date.now(),
      total: 25.00,
      totalWithTip: 25.00,
    };
    const { qrUrl } = generateRegistroFactura(sale, '0', 'VERI-2025-000004');
    expect(qrUrl).toContain('aeat.es');
    expect(qrUrl).toContain('importe=25.00');
  });

  it('defaults closedAt to now if missing', () => {
    const sale = { id: 'sale_005', total: 10, totalWithTip: 10 };
    const result = generateRegistroFactura(sale, '0', 'VERI-2025-000005');
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('escapes XML special chars in strings', () => {
    const sale = {
      id: 'sale_006',
      closedAt: Date.now(),
      total: 10,
      totalWithTip: 10,
      tableName: 'Mesa & <bar> "test"',
    };
    const { xml } = generateRegistroFactura(sale, '0', 'VERI-2025-000006');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&quot;');
    expect(xml).not.toContain('& <bar>');
  });
});
