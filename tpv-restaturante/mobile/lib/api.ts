import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, TPV_API_KEY } from './config';
import type { Employee, Floor, Product, Category } from './types';

let _tenantId = 'default';
export function setTenantId(id: string) { _tenantId = id; }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}/api${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': _tenantId };
  if (TPV_API_KEY) headers['x-tpv-key'] = TPV_API_KEY;
  const res = await fetch(url, {
    headers: { ...headers, ...options.headers as Record<string, string> },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method || 'GET'} ${url} → ${res.status}: ${body}`);
  }
  return res.json();
}

export async function verifyPin(pin: string): Promise<Employee> {
  return apiFetch('/employees', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify', pin }),
  });
}

let lastFloor: Floor | null = null;

export function setLastFloor(floor: Floor | null) {
  lastFloor = floor ? JSON.parse(JSON.stringify(floor)) : null;
}

function computeFloorDiff(last: Floor | null, next: Floor) {
  if (!last || !last.tables || !next || !next.tables) {
    return { isFullSync: true };
  }
  if (last.tables.length !== next.tables.length || 
      JSON.stringify(last.zones) !== JSON.stringify(next.zones) || 
      last.background !== next.background) {
    return { isFullSync: true };
  }

  const updatedTables: any[] = [];
  const deletedTableIds: string[] = [];
  const lastTablesMap = new Map(last.tables.map(t => [t.id, t]));
  
  for (const t of next.tables) {
    const prev = lastTablesMap.get(t.id);
    if (!prev) {
      return { isFullSync: true };
    }
    if (prev.x !== t.x || prev.y !== t.y || prev.width !== t.width || prev.height !== t.height ||
        prev.radius !== t.radius || prev.shape !== t.shape || prev.rotation !== t.rotation ||
        prev.seats !== t.seats || prev.zone !== t.zone || prev.layer !== t.layer || prev.color !== t.color ||
        prev.name !== t.name || prev.type !== t.type) {
      return { isFullSync: true };
    }
    if (prev.status !== t.status ||
        prev.orderId !== t.orderId ||
        JSON.stringify(prev.orderIds) !== JSON.stringify(t.orderIds) ||
        JSON.stringify(prev.reserved) !== JSON.stringify(t.reserved) ||
        prev.reserved_for !== t.reserved_for ||
        prev.isFiado !== t.isFiado) {
      updatedTables.push(t);
    }
  }

  const updatedOrders: Record<string, any> = {};
  const deletedOrderIds: string[] = [];
  const lastOrders = last.orders || {};
  const nextOrders = next.orders || {};

  for (const [oid, o] of Object.entries(nextOrders)) {
    const prev = lastOrders[oid];
    if (!prev || JSON.stringify(prev) !== JSON.stringify(o)) {
      updatedOrders[oid] = o;
    }
  }
  for (const oid of Object.keys(lastOrders)) {
    if (!nextOrders[oid]) {
      deletedOrderIds.push(oid);
    }
  }

  return {
    isFullSync: false,
    updatedTables,
    deletedTableIds,
    updatedOrders,
    deletedOrderIds
  };
}

export async function fetchFloor(): Promise<Floor> {
  const floor = await apiFetch<Floor>('/floor');
  if (floor) {
    setLastFloor(floor);
  }
  return floor;
}

export async function saveFloor(floor: Floor): Promise<{ ok: boolean }> {
  const diff = computeFloorDiff(lastFloor, floor);
  setLastFloor(floor);

  if (diff.isFullSync) {
    return apiFetch('/floor', {
      method: 'PUT',
      body: JSON.stringify(floor),
    });
  } else {
    if (diff.updatedTables.length === 0 && 
        diff.deletedTableIds.length === 0 && 
        Object.keys(diff.updatedOrders).length === 0 && 
        diff.deletedOrderIds.length === 0) {
      return { ok: true };
    }
    return apiFetch('/floor', {
      method: 'PATCH',
      body: JSON.stringify(diff),
    });
  }
}

export async function fetchCatalog(): Promise<{ categories: Category[]; products: Product[] }> {
  return apiFetch('/catalog');
}

export async function fetchEmployees(): Promise<Employee[]> {
  return apiFetch('/employees');
}

export async function createPaymentIntent(amount: number, tableId: string, tableName: string, employeeName: string): Promise<{ clientSecret: string }> {
  return apiFetch('/stripe/payment-intent', {
    method: 'POST',
    body: JSON.stringify({ amount, tableId, tableName, employeeName }),
  });
}

export async function fetchTerminalConfig(): Promise<{ connectionToken: string; locationId: string }> {
  return apiFetch('/stripe/terminal-connection-token', {
    method: 'POST',
  });
}

export async function createTerminalPaymentIntent(amountCents: number, tableId: string, tableName: string, employeeName: string): Promise<{ clientSecret: string }> {
  return apiFetch('/stripe/terminal-payment-intent', {
    method: 'POST',
    body: JSON.stringify({ amount: amountCents, tableId, tableName, employeeName }),
  });
}

export async function addSale(sale: Record<string, unknown>): Promise<{ ok: boolean } | null> {
  // Cache immediately so it shows up in tickets right away (no race)
  try {
    const cached = await AsyncStorage.getItem('tpv:sales');
    const sales = cached ? JSON.parse(cached) : [];
    sales.push(sale);
    await AsyncStorage.setItem('tpv:sales', JSON.stringify(sales));
  } catch {}
  // Try API POST
  try {
    return await apiFetch<{ ok: boolean }>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  } catch (e) {
    console.warn('addSale API error:', e);
    return null;
  }
}

export async function fetchSales(): Promise<Record<string, unknown>[]> {
  try {
    const data = await apiFetch<Record<string, unknown>[]>('/sales');
    // Merge with local cache so recently-saved sales appear immediately
    const cached = await AsyncStorage.getItem('tpv:sales');
    const local = cached ? JSON.parse(cached) : [];
    const ids = new Set(data.map(s => s.id));
    const merged = [...data, ...local.filter(s => !ids.has(s.id))];
    await AsyncStorage.setItem('tpv:sales', JSON.stringify(merged));
    return merged;
  } catch {
    const cached = await AsyncStorage.getItem('tpv:sales');
    return cached ? JSON.parse(cached) : [];
  }
}
