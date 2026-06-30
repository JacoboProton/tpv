import { API_URL } from './config';
import type { Employee, Floor, Product, Category, Order } from './types';

let _tenantId = 'default';
export function setTenantId(id: string) { _tenantId = id; }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}/api${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': _tenantId, ...options.headers },
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
