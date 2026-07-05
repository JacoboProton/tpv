import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, TPV_API_KEY } from './config';
import type { Employee, Floor, Product, Category, Order } from './types';

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

export async function fetchFloor(): Promise<Floor> {
  return apiFetch('/floor');
}

export async function saveFloor(floor: Floor): Promise<{ ok: boolean }> {
  return apiFetch('/floor', {
    method: 'PUT',
    body: JSON.stringify(floor),
  });
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
