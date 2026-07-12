import { cacheGet, cacheSet, isOnline, enqueueMutation } from './offline';

const TPV_API_KEY = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY
  ? process.env.NEXT_PUBLIC_TPV_API_KEY
  : (typeof window !== 'undefined' && window.__TPV_API_KEY) || '';

function getTenantId() {
  if (typeof window === 'undefined') return 'default';
  try { return localStorage.getItem('tpv:tenant') || 'default'; } catch { return 'default'; }
}

function apiHeaders(headers = {}) {
  headers['Content-Type'] = 'application/json';
  if (TPV_API_KEY) headers['x-tpv-key'] = TPV_API_KEY;
  headers['x-tenant-id'] = getTenantId();
  if (typeof window !== 'undefined') {
    if (window.__employeeRole) headers['x-employee-role'] = window.__employeeRole;
    if (window.__employeeId) headers['x-employee-id'] = window.__employeeId;
  }
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
    console.warn(`apiFetch ${options.method || 'GET'} ${url}:`, err);
    throw err;
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

let lastFloor = null;

export function setLastFloor(floor) {
  lastFloor = floor ? JSON.parse(JSON.stringify(floor)) : null;
}

function stableKeyOrder(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  ka.sort();
  kb.sort();
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false;
  }
  for (const k of ka) {
    if (typeof a[k] === 'object' && typeof b[k] === 'object') {
      if (Array.isArray(a[k]) && Array.isArray(b[k])) {
        if (a[k].length !== b[k].length) return false;
        for (let i = 0; i < a[k].length; i++) {
          if (typeof a[k][i] === 'object' || typeof b[k][i] === 'object') {
            if (!stableKeyOrder(a[k][i], b[k][i])) return false;
          } else if (a[k][i] !== b[k][i]) {
            return false;
          }
        }
      } else if (!stableKeyOrder(a[k], b[k])) {
        return false;
      }
    } else if (a[k] !== b[k]) {
      return false;
    }
  }
  return true;
}

function computeFloorDiff(last, next) {
  if (!last || !last.tables || !next || !next.tables) {
    return { isFullSync: true };
  }
  if (last.tables.length !== next.tables.length || 
      !stableKeyOrder(last.zones, next.zones) || 
      last.background !== next.background) {
    return { isFullSync: true };
  }

  const updatedTables = [];
  const deletedTableIds = [];
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
        !stableKeyOrder(prev.orderIds, t.orderIds) ||
        !stableKeyOrder(prev.reserved, t.reserved) ||
        prev.reserved_for !== t.reserved_for ||
        prev.isFiado !== t.isFiado) {
      updatedTables.push(t);
    }
  }

  const updatedOrders = {};
  const deletedOrderIds = [];
  const lastOrders = last.orders || {};
  const nextOrders = next.orders || {};

  for (const [oid, o] of Object.entries(nextOrders)) {
    const prev = lastOrders[oid];
    if (!prev || !stableKeyOrder(prev, o)) {
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

export async function fetchFloor() {
  const floor = await apiFetchWithCache('/api/floor', 'floor');
  if (floor) {
    setLastFloor(floor);
  }
  return floor;
}

export async function saveFloor(floor) {
  cacheSet('floor', floor);
  const diff = computeFloorDiff(lastFloor, floor);
  setLastFloor(floor);

  if (diff.isFullSync) {
    return apiFetch('/api/floor', { method: 'PUT', body: JSON.stringify(floor) });
  } else {
    if (diff.updatedTables.length === 0 && 
        diff.deletedTableIds.length === 0 && 
        Object.keys(diff.updatedOrders).length === 0 && 
        diff.deletedOrderIds.length === 0) {
      return { ok: true };
    }
    return apiFetch('/api/floor', { method: 'PATCH', body: JSON.stringify(diff) });
  }
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

// ----- Buffet -----
export async function fetchBuffetSessions() {
  return apiFetch('/api/buffet?scope=sessions');
}
export async function fetchBuffetConfig() {
  return apiFetch('/api/buffet?scope=config');
}
export async function buffetAction(action, payload = {}) {
  return apiFetch('/api/buffet', { method: 'POST', body: JSON.stringify({ action, ...payload }) });
}
export async function fetchBuffetTableSession(tableId) {
  return apiFetch(`/api/buffet?scope=table_session&tableId=${tableId}`);
}
export async function fetchBuffetRounds(sessionId) {
  return apiFetch(`/api/buffet?scope=rounds&sessionId=${sessionId}`);
}

export async function fetchClosures() {
  return apiFetch('/api/closures');
}

export async function saveClosure(data) {
  return apiFetch('/api/closures', { method: 'POST', body: JSON.stringify(data) });
}
