import { describe, it, expect } from 'vitest';
import { unpackList } from '../lib/api';
import { FloorPutBodySchema } from '../lib/schemas/floorSchema';

describe('unpackList', () => {
  it('returns the data array from a paginated response', () => {
    const paginated = { data: [{ id: 'a' }, { id: 'b' }], pagination: { total: 2 } };
    expect(unpackList(paginated)).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('returns the array directly for a bare array response (backwards compat)', () => {
    expect(unpackList([{ id: 'a' }])).toEqual([{ id: 'a' }]);
  });

  it('returns [] for non-array, non-paginated responses', () => {
    expect(unpackList(null)).toEqual([]);
    expect(unpackList(undefined)).toEqual([]);
    expect(unpackList(42)).toEqual([]);
    expect(unpackList({ foo: 'bar' })).toEqual([]);
  });

  it('preserves generic element types', () => {
    const data = unpackList<number>({ data: [1, 2, 3] });
    expect(data).toEqual([1, 2, 3]);
  });
});

describe('FloorPutBodySchema createdAt compatibility', () => {
  it('accepts numeric (epoch ms) createdAt for orders', () => {
    const body = {
      tables: [],
      orders: {
        o1: { id: 'o1', tableId: 't1', items: [], createdAt: 1787923829137 },
      },
    };
    expect(() => FloorPutBodySchema.parse(body)).not.toThrow();
  });

  it('accepts string createdAt for orders', () => {
    const body = {
      tables: [],
      orders: {
        o1: { id: 'o1', tableId: 't1', items: [], createdAt: '2026-01-01T00:00:00Z' },
      },
    };
    expect(() => FloorPutBodySchema.parse(body)).not.toThrow();
  });

  it('accepts omitted createdAt for orders', () => {
    const body = {
      tables: [],
      orders: {
        o1: { id: 'o1', tableId: 't1', items: [] },
      },
    };
    expect(() => FloorPutBodySchema.parse(body)).not.toThrow();
  });
});
