import { Floor } from './domain/types';
const f: Floor = { tables: [], orders: {} };
const r: Record<string, unknown> = f as unknown as Record<string, unknown>;
