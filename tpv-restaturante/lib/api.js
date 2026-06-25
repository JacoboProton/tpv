import { cacheGet, cacheSet, isOnline, enqueueMutation } from './offline';

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${options.method ?? 'GET'} ${url} → ${res.status}: ${body}`);
    }
    return res.json();
  } catch (err) {
    if (!isOnline() || options.method === 'GET') throw err;
    enqueueMutation(url, options.body);
    return null;
  }
}

async function apiFetchWithCache(url, cacheKey, options = {}) {
  try {
    const data = await apiFetch(url, options);
    if (data) cacheSet(cacheKey, data);
    return data;
  } catch {
    return cacheGet(cacheKey);
  }
}

export async function runMigrate() {
  return apiFetch('/api/migrate', { method: 'POST' });
}

export async function fetchCatalog() {
  return apiFetchWithCache('/api/catalog', 'catalog');
}
export async function saveCatalog(catalog) {
  cacheSet('catalog', catalog);
  return apiFetch('/api/catalog', { method: 'PUT', body: JSON.stringify(catalog) });
}

export async function fetchFloor() {
  return apiFetchWithCache('/api/floor', 'floor');
}
export async function saveFloor(floor) {
  cacheSet('floor', floor);
  return apiFetch('/api/floor', { method: 'PUT', body: JSON.stringify(floor) });
}

export async function fetchSales() {
  return apiFetchWithCache('/api/sales', 'sales');
}
export async function addSale(sale) {
  return apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(sale) });
}

export async function fetchEmployees() {
  return apiFetchWithCache('/api/employees', 'employees');
}
export async function saveEmployees(employees) {
  cacheSet('employees', employees);
  return apiFetch('/api/employees', { method: 'PUT', body: JSON.stringify(employees) });
}

export async function logAccess(data) {
  return apiFetch('/api/access-logs', { method: 'POST', body: JSON.stringify(data) });
}
export async function fetchAccessLogs(limit = 200, offset = 0) {
  return apiFetch(`/api/access-logs?limit=${limit}&offset=${offset}`);
}

export async function registerVerifactu(saleId, sale) {
  return apiFetch('/api/verifactu', { method: 'POST', body: JSON.stringify({ saleId, sale }) });
}
export async function fetchVerifactuRegistros() {
  return apiFetch('/api/verifactu');
}
export async function verifyVerifactuChain(saleId) {
  return apiFetch('/api/verifactu/verify', { method: 'POST', body: JSON.stringify({ saleId }) });
}

export async function fetchStockLog(limit = 100) {
  return apiFetch(`/api/stock-log?limit=${limit}`);
}
export async function saveStockLog(entry) {
  return apiFetch('/api/stock-log', { method: 'POST', body: JSON.stringify(entry) });
}

export async function fetchCancelledOrders(limit = 50) {
  return apiFetch(`/api/cancelled?limit=${limit}`);
}
export async function saveCancelledOrder(data) {
  return apiFetch('/api/cancelled', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchTurns(employeeId, turnDate) {
  const params = new URLSearchParams();
  if (employeeId) params.set('employeeId', employeeId);
  if (turnDate) params.set('turnDate', turnDate);
  return apiFetch(`/api/turns?${params}`);
}
export async function saveTurn(data) {
  return apiFetch('/api/turns', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchBackup() {
  return apiFetch('/api/backup');
}

export async function fetchModifiers() {
  return apiFetchWithCache('/api/modifiers', 'modifiers');
}
export async function saveModifiers(data) {
  cacheSet('modifiers', data);
  return apiFetch('/api/modifiers', { method: 'PUT', body: JSON.stringify(data) });
}
