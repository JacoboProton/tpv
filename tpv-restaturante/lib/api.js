/**
 * Capa de acceso a datos desde el cliente.
 * Todos los fetch apuntan a los API routes de Next.js,
 * que a su vez hablan con Neon PostgreSQL.
 */

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method ?? 'GET'} ${url} → ${res.status}: ${body}`);
  }
  return res.json();
}

// ---------- Migración (ejecutar una vez al iniciar) ----------
export async function runMigrate() {
  return apiFetch('/api/migrate', { method: 'POST' });
}

// ---------- Catálogo ----------
export async function fetchCatalog() {
  return apiFetch('/api/catalog');
}
export async function saveCatalog(catalog) {
  return apiFetch('/api/catalog', { method: 'PUT', body: JSON.stringify(catalog) });
}

// ---------- Sala ----------
export async function fetchFloor() {
  return apiFetch('/api/floor');
}
export async function saveFloor(floor) {
  return apiFetch('/api/floor', { method: 'PUT', body: JSON.stringify(floor) });
}

// ---------- Ventas ----------
export async function fetchSales() {
  return apiFetch('/api/sales');
}
export async function addSale(sale) {
  return apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(sale) });
}

// ---------- Empleados ----------
export async function fetchEmployees() {
  return apiFetch('/api/employees');
}
export async function saveEmployees(employees) {
  return apiFetch('/api/employees', { method: 'PUT', body: JSON.stringify(employees) });
}

// ---------- Registros de entrada ----------
export async function logAccess({ employeeId, employeeName, role, entryPoint }) {
  return apiFetch('/api/access-logs', {
    method: 'POST',
    body: JSON.stringify({ employeeId, employeeName, role, entryPoint }),
  });
}
export async function fetchAccessLogs(limit = 200) {
  return apiFetch(`/api/access-logs?limit=${limit}`);
}

// ---------- Verifactu ----------
export async function registerVerifactu(saleId, sale) {
  return apiFetch('/api/verifactu', {
    method: 'POST',
    body: JSON.stringify({ saleId, sale }),
  });
}
export async function fetchVerifactuRegistros() {
  return apiFetch('/api/verifactu');
}
export async function verifyVerifactuChain(saleId) {
  return apiFetch('/api/verifactu/verify', {
    method: 'POST',
    body: JSON.stringify({ saleId }),
  });
}
