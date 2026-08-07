import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '../lib/event-bus';

describe('lib/event-bus', () => {
  it('delivers events to subscribed handlers', () => {
    const handler = vi.fn();
    eventBus.on('order:created', handler);
    const payload = { orderId: 'o1', tableId: 't1', tableName: 'Mesa 1', items: [], employeeName: null, createdAt: 'x' };
    eventBus.emit('order:created', payload);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('supports multiple handlers per event', () => {
    const a = vi.fn();
    const b = vi.fn();
    eventBus.on('stock:changed', a);
    eventBus.on('stock:changed', b);
    eventBus.emit('stock:changed', { productId: 'p', productName: 'n', ubicacion: 'u', delta: 1, newStock: 2 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes via the returned function', () => {
    const handler = vi.fn();
    const off = eventBus.on('payment:completed', handler);
    off();
    eventBus.emit('payment:completed', { saleId: 's', tableId: 't', amount: 1, method: 'efectivo', payments: [], employeeName: null, timestamp: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('removes a handler with off()', () => {
    const handler = vi.fn();
    eventBus.on('item:sent', handler);
    eventBus.off('item:sent', handler);
    eventBus.emit('item:sent', { orderId: 'o', itemId: 'i', productName: 'p', course: 'c', tableName: 'm' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('isolates events of different types', () => {
    const handler = vi.fn();
    eventBus.on('order:closed', handler);
    eventBus.emit('payment:refunded', { saleId: 's', amount: 1, reason: 'r', employeeName: 'e', timestamp: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call handlers for the same event after clear()', () => {
    const handler = vi.fn();
    eventBus.on('order:created', handler);
    eventBus.clear('order:created');
    eventBus.emit('order:created', { orderId: 'o', tableId: 't', tableName: 'm', items: [], employeeName: null, createdAt: 'x' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('clears all handlers', () => {
    const a = vi.fn();
    const b = vi.fn();
    eventBus.on('order:created', a);
    eventBus.on('order:closed', b);
    eventBus.clear();
    eventBus.emit('order:created', { orderId: 'o', tableId: 't', tableName: 'm', items: [], employeeName: null, createdAt: 'x' });
    eventBus.emit('order:closed', { saleId: 's', tableId: 't', tableName: 'm', items: [], subtotal: 0, discount: 0, total: 0, tip: 0, totalWithTip: 0, paymentMethod: 'efectivo', payments: [], isFiado: false, isDebtPayment: false, employeeId: null, employeeName: null, closedAt: 'x' });
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('keeps emitting to other handlers when one throws', () => {
    const bad = vi.fn().mockImplementation(() => { throw new Error('boom'); });
    const good = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    eventBus.on('stock:changed', bad);
    eventBus.on('stock:changed', good);
    eventBus.emit('stock:changed', { productId: 'p', productName: 'n', ubicacion: 'u', delta: 1, newStock: 2 });
    expect(good).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});