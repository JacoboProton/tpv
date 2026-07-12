import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, TPV_API_KEY } from './config';
import type { Employee, Floor, Product, Category, ModifierGroup, Sale, GestoriaDocument, GestoriaPayroll, GestoriaTaxModel, GestoriaAuthorization, GestoriaOperationsResponse } from './types';

let _tenantId = 'default';
let _employeeId = '';
let _employeeRole = '';
export function setTenantId(id: string) { _tenantId = id; }
export function getTenantId() { return _tenantId; }
export function setEmployeeSession(id: string, role: string) { _employeeId = id; _employeeRole = role; }
export function clearEmployeeSession() { _employeeId = ''; _employeeRole = ''; }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}/api${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': _tenantId };
  if (TPV_API_KEY) headers['x-tpv-key'] = TPV_API_KEY;
  if (_employeeId) headers['x-employee-id'] = _employeeId;
  if (_employeeRole) headers['x-employee-role'] = _employeeRole;
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
  const pinHash = await sha256(pin);
  return apiFetch('/employees', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify', pin, pinHash }),
  });
}

async function sha256(s: string): Promise<string> {
  const { digestStringAsync, CryptoDigestAlgorithm } = await import('expo-crypto');
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, s);
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

export async function fetchModifiers(): Promise<{ groups: ModifierGroup[]; productModifiers: Record<string, string[]> }> {
  return apiFetch('/modifiers');
}

export async function fetchSettings(): Promise<Record<string, string>> {
  return apiFetch('/settings');
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
    const result = await apiFetch<{ ok: boolean }>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
    return result;
  } catch (e) {
    console.warn('addSale API error:', e);
    // Queue for retry
    try {
      const pending = JSON.parse(await AsyncStorage.getItem('tpv:sales_pending') || '[]');
      pending.push({ sale, timestamp: Date.now() });
      await AsyncStorage.setItem('tpv:sales_pending', JSON.stringify(pending));
    } catch {}
    setTimeout(() => processPendingSales(), 5000);
    return null;
  }
}

export async function processPendingSales(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('tpv:sales_pending');
    if (!raw) return;
    const pending = JSON.parse(raw);
    if (pending.length === 0) return;
    const remaining: typeof pending = [];
    for (const item of pending) {
      try {
        await apiFetch<{ ok: boolean }>('/sales', {
          method: 'POST',
          body: JSON.stringify(item.sale),
        });
      } catch {
        remaining.push(item);
      }
    }
    await AsyncStorage.setItem('tpv:sales_pending', JSON.stringify(remaining));
  } catch {}
}

export async function fetchSales(): Promise<Sale[]> {
  try {
    const data = await apiFetch<Sale[]>('/sales');
    // Trigger retry of pending sales — online again
    processPendingSales();
    // Merge with local cache so recently-saved sales appear immediately
    const cached = await AsyncStorage.getItem('tpv:sales');
    const local = cached ? JSON.parse(cached) : [];
    const ids = new Set(data.map(s => s.id));
    const merged = [...data, ...local.filter(s => !ids.has(s.id))]
      .sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
    await AsyncStorage.setItem('tpv:sales', JSON.stringify(merged));
    return merged;
  } catch {
    const cached = await AsyncStorage.getItem('tpv:sales');
    return cached ? JSON.parse(cached) : [];
  }
}

export async function fetchGestoriaOperations(): Promise<GestoriaOperationsResponse> {
  return apiFetch<GestoriaOperationsResponse>('/gestoria?action=operations');
}

export async function fetchGestoriaSettings(): Promise<Record<string, string>> {
  return apiFetch('/gestoria?action=settings');
}

export async function saveGestoriaSettings(settings: Record<string, string>): Promise<{ ok: boolean }> {
  return apiFetch('/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'settings', settings }) });
}

export async function fetchGestoriaDocuments(type: string): Promise<GestoriaDocument[]> {
  return apiFetch(`/gestoria?action=documents&type=${type}`);
}

export async function saveGestoriaDocument(doc: Record<string, unknown>): Promise<{ ok: boolean }> {
  return apiFetch('/gestoria', { method: 'POST', body: JSON.stringify({ action: 'document', document: doc }) });
}

export async function deleteGestoriaDocument(id: string): Promise<{ ok: boolean }> {
  return apiFetch('/gestoria', { method: 'DELETE', body: JSON.stringify({ action: 'document', id }) });
}

export async function confirmGestoriaDocument(id: string): Promise<{ ok: boolean }> {
  return apiFetch('/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'confirm', id }) });
}

export async function fetchGestoriaPayrolls(): Promise<GestoriaPayroll[]> {
  return apiFetch('/gestoria?action=payrolls');
}

export async function saveGestoriaPayroll(payroll: Record<string, unknown>): Promise<{ ok: boolean }> {
  return apiFetch('/gestoria', { method: 'POST', body: JSON.stringify({ action: 'payroll', payroll }) });
}

export async function deleteGestoriaPayroll(id: string): Promise<{ ok: boolean }> {
  return apiFetch('/gestoria', { method: 'DELETE', body: JSON.stringify({ action: 'payroll', id }) });
}

export async function fetchGestoriaTaxModels(): Promise<GestoriaTaxModel[]> {
  return apiFetch('/gestoria?action=taxmodels');
}

export async function calculateGestoriaTaxModel(modelCode: string, year: number, quarter: number): Promise<{ data: Record<string, unknown> }> {
  return apiFetch('/gestoria', { method: 'POST', body: JSON.stringify({ action: 'calculate', modelCode, year, quarter }) });
}

export async function updateTaxModelStatus(id: string, status: string): Promise<{ ok: boolean }> {
  return apiFetch('/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'status', id, status }) });
}

export async function fetchGestoriaAuthorization(): Promise<GestoriaAuthorization | null> {
  return apiFetch('/gestoria?action=authorization');
}

export async function saveGestoriaAuthorization(data: Record<string, unknown>): Promise<{ ok: boolean }> {
  return apiFetch('/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'authorization', ...data }) });
}
