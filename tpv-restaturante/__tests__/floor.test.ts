import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tables, orders, floorPlan } from '../db/schema';
import { putFloorInTransaction, deleteTablesInTransaction, deleteOrdersInTransaction, fetchFullFloor } from '../lib/floor';

const dbData = new Map<object, any[]>();
function seed(table: object, data: any[]) { dbData.set(table, data); }

vi.mock('@/lib/drizzle', () => {
  function whereResult(data: any[]) {
    const p: any = Promise.resolve(data);
    p.orderBy = () => p;
    return p;
  }
  function from(table: any) {
    return {
      where: () => whereResult(dbData.get(table) || []),
    };
  }
  return { getDb: () => ({ select: () => ({ from }) }) };
});

beforeEach(() => dbData.clear());

describe('putFloorInTransaction', () => {
  it('inserts tables, orders and floor plan via tx.execute', async () => {
    const calls: string[] = [];
    const tx: any = { execute: vi.fn(async (q: any) => { calls.push(String(q)); }) };
    await putFloorInTransaction(
      tx,
      [{ id: 't1', name: 'Mesa 1', status: 'libre' }],
      { o1: { tableId: 't1', items: [], createdAt: 1, employeeName: 'Ana' } },
      [{ id: 1 }],
      { dark: true },
      'default',
    );
    expect(calls).toHaveLength(3);
  });

  it('omits floor plan when zones and background are falsey', async () => {
    const tx: any = { execute: vi.fn() };
    await putFloorInTransaction(tx, [], {}, null, null, 'default');
    expect(tx.execute).not.toHaveBeenCalled();
  });

  it('handles string zones and background', async () => {
    const tx: any = { execute: vi.fn() };
    await putFloorInTransaction(tx, [], {}, '[]', 'null', 'default');
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it('applies table defaults when fields are missing', async () => {
    const tx: any = { execute: vi.fn() };
    await putFloorInTransaction(tx, [{ id: 't2' }], {}, null, null, 'default');
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });
});

describe('delete tables/orders in transaction', () => {
  it('does nothing when ids are empty', async () => {
    const tx: any = { execute: vi.fn() };
    await deleteTablesInTransaction(tx, [], 'default');
    await deleteOrdersInTransaction(tx, [], 'default');
    expect(tx.execute).not.toHaveBeenCalled();
  });

  it('deletes tables for ids', async () => {
    const tx: any = { execute: vi.fn() };
    await deleteTablesInTransaction(tx, ['t1', 't2'], 'default');
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it('deletes orders for ids', async () => {
    const tx: any = { execute: vi.fn() };
    await deleteOrdersInTransaction(tx, ['o1'], 'default');
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });
});

describe('fetchFullFloor', () => {
  it('maps tables, orders and floor plan', async () => {
    seed(tables, [{ id: 't1', name: 'Mesa 1', status: 'libre', orderId: null, orderIds: [], reserved: null, reservedFor: '', isFiado: false, type: 'mesa', posX: 1, posY: 2, tableWidth: 80, tableHeight: 80, tableRadius: 40, tableShape: 'rect', rotation: 0, seats: 4, zone: '', layer: 0, tableColor: '' }]);
    seed(orders, [{ id: 'o1', tableId: 't1', items: [], createdAt: 1, employeeName: 'A' }]);
    seed(floorPlan, [{ id: 1, zones: ['z1'], background: 'bg' }]);

    const out = await fetchFullFloor('default');
    expect(out.tables).toHaveLength(1);
    expect(out.tables[0].id).toBe('t1');
    expect(out.orders).toHaveProperty('o1');
    expect(out.zones).toEqual(['z1']);
    expect(out.background).toBe('bg');
  });

  it('defaults floor plan when absent', async () => {
    seed(tables, [{ id: 't1', tenantId: 'default', orderIds: [] }]);
    const out = await fetchFullFloor('default');
    expect(out.zones).toEqual([]);
    expect(out.background).toBeNull();
    expect(out.orders).toEqual({});
  });
});