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
