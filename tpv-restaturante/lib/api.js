import { cacheGet, cacheSet, isOnline, enqueueMutation } from './offline';

const TPV_API_KEY = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY
  ? process.env.NEXT_PUBLIC_TPV_API_KEY
  : (typeof window !== 'undefined' && window.__TPV_API_KEY) || '';

function apiHeaders(headers = {}) {
  headers['Content-Type'] = 'application/json';
  if (TPV_API_KEY) headers['x-tpv-key'] = TPV_API_KEY;
  return headers;
}

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: apiHeaders(options.headers),
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

export async function fetchCombos() {
  return apiFetchWithCache('/api/combos', 'combos');
}
export async function saveCombos(combos) {
  cacheSet('combos', combos);
  return apiFetch('/api/combos', { method: 'PUT', body: JSON.stringify(combos) });
}

export async function fetchSettings() {
  return apiFetch('/api/settings');
}
export async function saveSettings(settings) {
  return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function fetchOffers() {
  return apiFetch('/api/offers');
}
export async function saveOffers(offers) {
  return apiFetch('/api/offers', { method: 'PUT', body: JSON.stringify(offers) });
}

export async function fetchMealMenus() {
  return apiFetchWithCache('/api/meal-menus', 'mealMenus');
}
export async function saveMealMenus(menus) {
  cacheSet('mealMenus', menus);
  return apiFetch('/api/meal-menus', { method: 'PUT', body: JSON.stringify(menus) });
}

export async function fetchPriceRules() {
  return apiFetchWithCache('/api/price-rules', 'priceRules');
}
export async function savePriceRules(rules) {
  cacheSet('priceRules', rules);
  return apiFetch('/api/price-rules', { method: 'PUT', body: JSON.stringify(rules) });
}

export async function fetchExportSales(year) {
  return apiFetch(`/api/export/sales?year=${year}`);
}

// Delivery
export async function fetchDeliveryRunners() {
  return apiFetch('/api/delivery/runners');
}
export async function saveDeliveryRunners(runners) {
  return apiFetch('/api/delivery/runners', { method: 'PUT', body: JSON.stringify(runners) });
}
export async function deleteDeliveryRunner(id) {
  return apiFetch('/api/delivery/runners', { method: 'DELETE', body: JSON.stringify({ id }) });
}
export async function fetchDeliveryOrders() {
  return apiFetch('/api/delivery/orders');
}
export async function createDeliveryOrder(data) {
  return apiFetch('/api/delivery/orders', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateDeliveryOrder(data) {
  return apiFetch('/api/delivery/orders', { method: 'PUT', body: JSON.stringify(data) });
}
export async function fetchDeliveryTracking(deliveryId) {
  return apiFetch(`/api/delivery/tracking?deliveryId=${deliveryId}`);
}
export async function addDeliveryTracking(data) {
  return apiFetch('/api/delivery/tracking', { method: 'POST', body: JSON.stringify(data) });
}

// ----- Gestoría -----
export async function fetchGestoriaSettings() {
  return apiFetch('/api/gestoria?action=settings');
}
export async function saveGestoriaSettings(settings) {
  return apiFetch('/api/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'settings', settings }) });
}

export async function fetchGestoriaDocuments(type) {
  return apiFetch(`/api/gestoria?action=documents&type=${type}`);
}
export async function saveGestoriaDocument(doc) {
  return apiFetch('/api/gestoria', { method: 'POST', body: JSON.stringify({ action: 'document', document: doc }) });
}
export async function deleteGestoriaDocument(id) {
  return apiFetch('/api/gestoria', { method: 'DELETE', body: JSON.stringify({ action: 'document', id }) });
}
export async function confirmGestoriaDocument(id) {
  return apiFetch('/api/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'confirm', id }) });
}

export async function fetchGestoriaPayrolls() {
  return apiFetch('/api/gestoria?action=payrolls');
}
export async function saveGestoriaPayroll(payroll) {
  return apiFetch('/api/gestoria', { method: 'POST', body: JSON.stringify({ action: 'payroll', payroll }) });
}
export async function deleteGestoriaPayroll(id) {
  return apiFetch('/api/gestoria', { method: 'DELETE', body: JSON.stringify({ action: 'payroll', id }) });
}

export async function fetchGestoriaTaxModels() {
  return apiFetch('/api/gestoria?action=taxmodels');
}
export async function calculateGestoriaTaxModel(modelCode, year, quarter) {
  return apiFetch('/api/gestoria', { method: 'POST', body: JSON.stringify({ action: 'calculate', modelCode, year, quarter }) });
}
export async function updateTaxModelStatus(id, status) {
  return apiFetch('/api/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'status', id, status }) });
}

export async function fetchGestoriaAuthorization() {
  return apiFetch('/api/gestoria?action=authorization');
}
export async function saveGestoriaAuthorization(data) {
  return apiFetch('/api/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'authorization', ...data }) });
}

// ----- KDS Pairing -----
export async function generateKDSPairCode(label = '') {
  return apiFetch('/api/kds', { method: 'POST', body: JSON.stringify({ action: 'generate', label }) });
}
export async function verifyKDSPairCode(code, label, deviceId) {
  return apiFetch('/api/kds', { method: 'POST', body: JSON.stringify({ action: 'verify', code, label, deviceId }) });
}
export async function fetchKDSPairings() {
  return apiFetch('/api/kds');
}
export async function checkKDSPairing(deviceId) {
  return apiFetch(`/api/kds?deviceId=${encodeURIComponent(deviceId)}`);
}
export async function revokeKDSPairing(id) {
  return apiFetch('/api/kds', { method: 'DELETE', body: JSON.stringify({ id }) });
}

// ----- KDS Audit -----
export async function logKDSAudit(action, details = {}) {
  return apiFetch('/api/kds/audit', { method: 'POST', body: JSON.stringify({ action, details }) });
}
export async function fetchKDSAudit(limit = 200, offset = 0, action = '') {
  const params = new URLSearchParams({ limit, offset });
  if (action) params.set('action', action);
  return apiFetch(`/api/kds/audit?${params}`);
}

// ----- Reservations -----
export async function fetchReservations(params = {}) {
  const q = new URLSearchParams();
  if (params.date) q.set('date', params.date);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.status) q.set('status', params.status);
  return apiFetch(`/api/reservations?${q}`);
}
export async function saveReservation(reservation) {
  return apiFetch('/api/reservations', { method: 'POST', body: JSON.stringify(reservation) });
}
export async function deleteReservation(id) {
  return apiFetch('/api/reservations', { method: 'DELETE', body: JSON.stringify({ id }) });
}
export async function fetchWaitlist() {
  return apiFetch('/api/waitlist');
}
export async function waitlistAction(action, extra = {}) {
  return apiFetch('/api/waitlist', { method: 'POST', body: JSON.stringify({ action, ...extra }) });
}
