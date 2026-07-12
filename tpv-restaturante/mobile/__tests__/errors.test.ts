import { describe, it, expect } from 'vitest';
import { classifyError } from '../lib/errors';

describe('classifyError', () => {
  it('returns generic error for null/undefined', () => {
    expect(classifyError(null)).toEqual({ title: 'Error', message: 'null' });
    expect(classifyError(undefined)).toEqual({ title: 'Error', message: 'undefined' });
  });

  it('returns generic error for primitives', () => {
    expect(classifyError('crash')).toEqual({ title: 'Error', message: 'crash' });
    expect(classifyError(42)).toEqual({ title: 'Error', message: '42' });
  });

  it('classifies Stripe card errors', () => {
    const e = { code: 'card_error', message: 'Your card was declined.' };
    expect(classifyError(e)).toEqual({ title: 'Error de pago', message: 'Your card was declined.' });
  });

  it('classifies Stripe processing errors', () => {
    const e = { code: 'processing_error', message: '' };
    expect(classifyError(e)).toEqual({
      title: 'Error de pago',
      message: 'La tarjeta fue rechazada. Prueba con otro método de pago.',
    });
  });

  it('classifies Stripe connection errors', () => {
    const e = { code: 'api_connection_error', message: 'Connection failed' };
    expect(classifyError(e)).toEqual({
      title: 'Error de Stripe',
      message: 'No se pudo procesar el pago. Revisa la conexión e inténtalo de nuevo.',
    });
  });

  it('classifies Stripe canceled payment', () => {
    expect(classifyError({ code: 'canceled' })).toEqual({ title: 'Pago cancelado', message: '' });
    expect(classifyError({ code: 'Canceled' })).toEqual({ title: 'Pago cancelado', message: '' });
  });

  it('classifies NFC reader errors', () => {
    const e = { code: 'NotConnected', message: 'Reader not found' };
    expect(classifyError(e)).toEqual({
      title: 'Error de conexión NFC',
      message: 'No se pudo conectar con el lector NFC. Verifica que esté encendido y cerca del dispositivo.',
    });
  });

  it('classifies Bluetooth errors', () => {
    const e = { code: 'BluetoothError', message: 'Bluetooth is off' };
    expect(classifyError(e)).toEqual({
      title: 'Bluetooth',
      message: 'Activa el Bluetooth y vuelve a intentarlo.',
    });
  });

  it('classifies Bluetooth in message text', () => {
    const e = new Error('bluetooth connection lost');
    expect(classifyError(e)).toEqual({
      title: 'Bluetooth',
      message: 'Activa el Bluetooth y vuelve a intentarlo.',
    });
  });

  it('classifies network errors from fetch failure', () => {
    const e = new Error('Failed to fetch');
    expect(classifyError(e)).toEqual({
      title: 'Error de red',
      message: 'No se pudo conectar con el servidor. Comprueba tu conexión a Internet.',
    });
  });

  it('classifies network timeout', () => {
    const e = new Error('timed out');
    expect(classifyError(e)).toEqual({
      title: 'Error de red',
      message: 'No se pudo conectar con el servidor. Comprueba tu conexión a Internet.',
    });
  });

  it('classifies ECONNREFUSED', () => {
    const e = new Error('ECONNREFUSED 127.0.0.1:3000');
    expect(classifyError(e)).toEqual({
      title: 'Error de red',
      message: 'No se pudo conectar con el servidor. Comprueba tu conexión a Internet.',
    });
  });

  it('classifies NFC permission error', () => {
    const e = new Error('NFC permission denied');
    expect(classifyError(e)).toEqual({
      title: 'Permiso NFC',
      message: 'No se concedió el permiso NFC. Actívalo en Ajustes del dispositivo.',
    });
  });

  it('fallback for unknown errors', () => {
    const e = new Error('Something weird happened');
    expect(classifyError(e)).toEqual({ title: 'Error', message: 'Something weird happened' });
  });

  it('fallback for objects without message', () => {
    const e = { foo: 'bar' };
    expect(classifyError(e)).toEqual({ title: 'Error', message: 'Ocurrió un error inesperado.' });
  });
});
