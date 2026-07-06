import { describe, it, expect } from 'vitest';
import { validateRequest } from '../lib/gestoriaSchemas';

describe('Gestoria request validation', () => {
  // Document tests
  it('accepts a minimal valid document payload', () => {
    const payload = {
      action: 'document',
      document: { type: 'expense' }
    };
    expect(() => validateRequest(payload)).not.toThrow();
  });

  it('rejects a document payload missing required type', () => {
    const payload = { action: 'document', document: {} };
    expect(() => validateRequest(payload)).toThrow();
  });

  // Payroll tests
  it('accepts a valid payroll payload', () => {
    const payload = {
      action: 'payroll',
      payroll: {
        employeeName: 'John Doe',
        employeeNif: '12345678A',
        month: 5,
        year: 2023,
        grossAmount: 3000,
        irpfWithholding: 600,
        ssWorker: 300,
        ssCompany: 200
      }
    };
    expect(() => validateRequest(payload)).not.toThrow();
  });

  it('rejects a payroll payload with missing fields', () => {
    const payload = {
      action: 'payroll',
      payroll: {
        employeeName: 'John Doe',
        month: 5,
        year: 2023,
        grossAmount: 3000,
        irpfWithholding: 600,
        ssWorker: 300,
        ssCompany: 200
      }
    };
    expect(() => validateRequest(payload)).toThrow();
  });

  // Calculate tests
  it('accepts a valid calculate payload', () => {
    const payload = {
      action: 'calculate',
      modelCode: '303',
      year: 2023,
      quarter: '1'
    };
    expect(() => validateRequest(payload)).not.toThrow();
  });

  it('rejects a calculate payload with invalid quarter', () => {
    const payload = {
      action: 'calculate',
      modelCode: '303',
      year: 2023,
      quarter: '5' // invalid
    };
    expect(() => validateRequest(payload)).toThrow();
  });

  // Settings tests (already covered)
  it('accepts settings payload with arbitrary keys', () => {
    const payload = {
      action: 'settings',
      settings: { theme: 'dark', itemsPerPage: '20' }
    };
    expect(() => validateRequest(payload)).not.toThrow();
  });

  // Confirm tests
  it('accepts a valid confirm payload', () => {
    const payload = { action: 'confirm', id: 'abc123' };
    expect(() => validateRequest(payload)).not.toThrow();
  });

  it('rejects a confirm payload without id', () => {
    const payload = { action: 'confirm' };
    expect(() => validateRequest(payload)).toThrow();
  });

  // Status tests
  it('accepts a valid status payload', () => {
    const payload = { action: 'status', id: 'xyz', status: 'draft' };
    expect(() => validateRequest(payload)).not.toThrow();
  });

  it('rejects a status payload with invalid status value', () => {
    const payload = { action: 'status', id: 'xyz', status: 'invalid' };
    expect(() => validateRequest(payload)).toThrow();
  });

  // Authorization tests
  it('accepts a valid authorization payload (update)', () => {
    const payload = {
      action: 'authorization',
      name: 'Contador',
      nif: '98765432B',
      signedAt: Date.now(),
      socialRed: true,
      revoke: false
    };
    expect(() => validateRequest(payload)).not.toThrow();
  });

  it('accepts a revoke authorization payload', () => {
    const payload = { action: 'authorization', revoke: true };
    expect(() => validateRequest(payload)).not.toThrow();
  });

  it('rejects an authorization payload with wrong types', () => {
    const payload = { action: 'authorization', name: 123, socialRed: 'yes' };
    expect(() => validateRequest(payload)).toThrow();
  });
});
