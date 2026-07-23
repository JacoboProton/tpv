import { cacheGet, cacheSet } from './offline';

declare global {
  interface Window {
    __TPV_API_KEY?: string;
    __employeeRole?: string;
    __employeeId?: string;
  }
}

const TPV_API_KEY: string = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY
  ? process.env.NEXT_PUBLIC_TPV_API_KEY
  : (typeof window !== 'undefined' && window.__TPV_API_KEY) || '';

export function getTenantId(): string {
  if (typeof window === 'undefined') return 'default';
  try { return localStorage.getItem('tpv:tenant') || 'default'; } catch { return 'default'; }
}

function apiHeaders(headers: Record<string, string> = {}): Record<string, string> {
  headers['Content-Type'] = 'application/json';
  if (TPV_API_KEY) headers['x-tpv-key'] = TPV_API_KEY;
  headers['x-tenant-id'] = getTenantId();
  if (typeof window !== 'undefined') {
    if (window.__employeeRole) headers['x-employee-role'] = window.__employeeRole;
    if (window.__employeeId) headers['x-employee-id'] = window.__employeeId;
    const did = localStorage.getItem('tpv:device_id');
    if (did) headers['x-device-id'] = did;
  }
  return headers;
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<unknown> {
  try {
    const res = await fetch(url, {
      headers: apiHeaders(options.headers as Record<string, string> | undefined),
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

async function apiFetchWithCache(url: string, cacheKey: string, options: RequestInit = {}): Promise<unknown> {
  try {
    const data = await apiFetch(url, options);
    if (data) cacheSet(cacheKey, data);
    return data;
  } catch {
    return cacheGet(cacheKey);
  }
}

export async function runMigrate(): Promise<unknown> {
  return apiFetch('/api/migrate', { method: 'POST' });
}

export async function fetchCatalog(): Promise<unknown> {
  return apiFetchWithCache('/api/catalog', 'catalog');
}
export async function saveCatalog(catalog: unknown): Promise<unknown> {
  cacheSet('catalog', catalog);
  return apiFetch('/api/catalog', { method: 'PUT', body: JSON.stringify(catalog) });
}

let lastFloor: Record<string, unknown> | null = null;

export function setLastFloor(floor: Record<string, unknown> | null): void {
  lastFloor = floor ? JSON.parse(JSON.stringify(floor)) : null;
}

function stableKeyOrder(a: unknown, b: unknown): boolean {
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
    const av = (a as Record<string, unknown>)[k];
    const bv = (b as Record<string, unknown>)[k];
    if (typeof av === 'object' && typeof bv === 'object' && av !== null && bv !== null) {
      if (Array.isArray(av) && Array.isArray(bv)) {
        if (av.length !== bv.length) return false;
        for (let i = 0; i < av.length; i++) {
          if (typeof av[i] === 'object' || typeof bv[i] === 'object') {
            if (!stableKeyOrder(av[i], bv[i])) return false;
          } else if (av[i] !== bv[i]) {
            return false;
          }
        }
      } else if (!stableKeyOrder(av, bv)) {
        return false;
      }
    } else if (av !== bv) {
      return false;
    }
  }
  return true;
}

interface FloorDiff {
  isFullSync: boolean;
  updatedTables?: unknown[];
  deletedTableIds?: string[];
  updatedOrders?: Record<string, unknown>;
  deletedOrderIds?: string[];
}

function computeFloorDiff(last: Record<string, unknown> | null, next: Record<string, unknown>): FloorDiff {
  if (!last || !last.tables || !next || !next.tables) {
    return { isFullSync: true };
  }
  const lastTables = last.tables as unknown[];
  const nextTables = next.tables as unknown[];
  if (lastTables.length !== nextTables.length || 
      !stableKeyOrder(last.zones, next.zones) || 
      last.background !== next.background) {
    return { isFullSync: true };
  }

  const updatedTables: unknown[] = [];
  const deletedTableIds: string[] = [];
  const lastTablesMap = new Map<string, Record<string, unknown>>(
    (lastTables as Array<Record<string, unknown>>).map(t => [t.id as string, t])
  );
  
  for (const t of nextTables as Array<Record<string, unknown>>) {
    const prev = lastTablesMap.get(t.id as string);
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

  const updatedOrders: Record<string, unknown> = {};
  const deletedOrderIds: string[] = [];
  const lastOrders = (last.orders as Record<string, unknown>) || {};
  const nextOrders = (next.orders as Record<string, unknown>) || {};

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

export async function fetchFloor(): Promise<unknown> {
  const floor = await apiFetchWithCache('/api/floor', 'floor') as Record<string, unknown> | null;
  if (floor) {
    setLastFloor(floor);
  }
  return floor;
}

export async function saveFloor(floor: Record<string, unknown>): Promise<unknown> {
  cacheSet('floor', floor);
  const diff = computeFloorDiff(lastFloor, floor);
  setLastFloor(floor);

  if (diff.isFullSync) {
    return apiFetch('/api/floor', { method: 'PUT', body: JSON.stringify(floor) });
  } else {
    if (diff.updatedTables!.length === 0 && 
        diff.deletedTableIds!.length === 0 && 
        Object.keys(diff.updatedOrders!).length === 0 && 
        diff.deletedOrderIds!.length === 0) {
      return { ok: true };
    }
    return apiFetch('/api/floor', { method: 'PATCH', body: JSON.stringify(diff) });
  }
}

export async function fetchSales(): Promise<unknown> {
  return apiFetchWithCache('/api/sales', 'sales');
}

export async function addSale(sale: unknown): Promise<unknown> {
  return apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(sale) });
}

export async function fetchEmployees(): Promise<unknown> {
  return apiFetchWithCache('/api/employees', 'employees');
}

export async function saveEmployees(employees: unknown): Promise<unknown> {
  cacheSet('employees', employees);
  return apiFetch('/api/employees', { method: 'PUT', body: JSON.stringify(employees) });
}

export async function logAccess(data: unknown): Promise<unknown> {
  return apiFetch('/api/access-logs', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchAccessLogs(limit = 200, offset = 0): Promise<unknown> {
  return apiFetch(`/api/access-logs?limit=${limit}&offset=${offset}`);
}

export async function registerVerifactu(saleId: string, sale: unknown): Promise<unknown> {
  return apiFetch('/api/verifactu', { method: 'POST', body: JSON.stringify({ saleId, sale }) });
}

export async function fetchVerifactuRegistros(): Promise<unknown> {
  return apiFetch('/api/verifactu');
}

export async function verifyVerifactuChain(saleId: string): Promise<unknown> {
  return apiFetch('/api/verifactu/verify', { method: 'POST', body: JSON.stringify({ saleId }) });
}

export async function fetchStockLog(limit = 100): Promise<unknown> {
  return apiFetch(`/api/stock-log?limit=${limit}`);
}

export async function saveStockLog(entry: unknown): Promise<unknown> {
  return apiFetch('/api/stock-log', { method: 'POST', body: JSON.stringify(entry) });
}

export async function fetchCancelledOrders(limit = 50): Promise<unknown> {
  return apiFetch(`/api/cancelled?limit=${limit}`);
}

export async function saveCancelledOrder(data: unknown): Promise<unknown> {
  return apiFetch('/api/cancelled', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchTurns(employeeId?: string, turnDate?: string): Promise<unknown> {
  const params = new URLSearchParams();
  if (employeeId) params.set('employeeId', employeeId);
  if (turnDate) params.set('turnDate', turnDate);
  return apiFetch(`/api/turns?${params}`);
}

export async function saveTurn(data: unknown): Promise<unknown> {
  return apiFetch('/api/turns', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchBackup(): Promise<unknown> {
  return apiFetch('/api/backup');
}

export async function fetchModifiers(): Promise<unknown> {
  return apiFetchWithCache('/api/modifiers', 'modifiers');
}

export async function saveModifiers(data: unknown): Promise<unknown> {
  cacheSet('modifiers', data);
  return apiFetch('/api/modifiers', { method: 'PUT', body: JSON.stringify(data) });
}

export async function fetchCombos(): Promise<unknown> {
  return apiFetchWithCache('/api/combos', 'combos');
}

export async function saveCombos(combos: unknown): Promise<unknown> {
  cacheSet('combos', combos);
  return apiFetch('/api/combos', { method: 'PUT', body: JSON.stringify(combos) });
}

export async function fetchSettings(): Promise<unknown> {
  return apiFetch('/api/settings');
}

export async function saveSettings(settings: unknown): Promise<unknown> {
  return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function fetchOffers(): Promise<unknown> {
  return apiFetch('/api/offers');
}

export async function saveOffers(offers: unknown): Promise<unknown> {
  return apiFetch('/api/offers', { method: 'PUT', body: JSON.stringify(offers) });
}

export async function fetchMealMenus(): Promise<unknown> {
  return apiFetchWithCache('/api/meal-menus', 'mealMenus');
}

export async function saveMealMenus(menus: unknown): Promise<unknown> {
  cacheSet('mealMenus', menus);
  return apiFetch('/api/meal-menus', { method: 'PUT', body: JSON.stringify(menus) });
}

export async function fetchPriceRules(): Promise<unknown> {
  return apiFetchWithCache('/api/price-rules', 'priceRules');
}

export async function savePriceRules(rules: unknown): Promise<unknown> {
  cacheSet('priceRules', rules);
  return apiFetch('/api/price-rules', { method: 'PUT', body: JSON.stringify(rules) });
}

export async function fetchExportSales(year: string | number): Promise<unknown> {
  return apiFetch(`/api/export/sales?year=${year}`);
}

export async function fetchDeliveryRunners(): Promise<unknown> {
  return apiFetch('/api/delivery/runners');
}

export async function saveDeliveryRunners(runners: unknown): Promise<unknown> {
  return apiFetch('/api/delivery/runners', { method: 'PUT', body: JSON.stringify(runners) });
}

export async function deleteDeliveryRunner(id: string): Promise<unknown> {
  return apiFetch('/api/delivery/runners', { method: 'DELETE', body: JSON.stringify({ id }) });
}

export async function fetchDeliveryOrders(): Promise<unknown> {
  return apiFetch('/api/delivery/orders');
}

export async function createDeliveryOrder(data: unknown): Promise<unknown> {
  return apiFetch('/api/delivery/orders', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateDeliveryOrder(data: unknown): Promise<unknown> {
  return apiFetch('/api/delivery/orders', { method: 'PUT', body: JSON.stringify(data) });
}

export async function fetchDeliveryTracking(deliveryId: string): Promise<unknown> {
  return apiFetch(`/api/delivery/tracking?deliveryId=${deliveryId}`);
}

export async function addDeliveryTracking(data: unknown): Promise<unknown> {
  return apiFetch('/api/delivery/tracking', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchGestoriaSettings(): Promise<unknown> {
  return apiFetch('/api/gestoria?action=settings');
}

export async function saveGestoriaSettings(settings: unknown): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'settings', settings }) });
}

export async function fetchGestoriaDocuments(type: string): Promise<unknown> {
  return apiFetch(`/api/gestoria?action=documents&type=${type}`);
}

export async function saveGestoriaDocument(doc: unknown): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'POST', body: JSON.stringify({ action: 'document', document: doc }) });
}

export async function deleteGestoriaDocument(id: string): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'DELETE', body: JSON.stringify({ action: 'document', id }) });
}

export async function confirmGestoriaDocument(id: string): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'confirm', id }) });
}

export async function fetchGestoriaPayrolls(): Promise<unknown> {
  return apiFetch('/api/gestoria?action=payrolls');
}

export async function saveGestoriaPayroll(payroll: unknown): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'POST', body: JSON.stringify({ action: 'payroll', payroll }) });
}

export async function deleteGestoriaPayroll(id: string): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'DELETE', body: JSON.stringify({ action: 'payroll', id }) });
}

export async function fetchGestoriaTaxModels(): Promise<unknown> {
  return apiFetch('/api/gestoria?action=taxmodels');
}

export async function calculateGestoriaTaxModel(modelCode: string, year: string | number, quarter: string | number): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'POST', body: JSON.stringify({ action: 'calculate', modelCode, year, quarter }) });
}

export async function updateTaxModelStatus(id: string, status: string): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'status', id, status }) });
}

export async function fetchGestoriaAuthorization(): Promise<unknown> {
  return apiFetch('/api/gestoria?action=authorization');
}

export async function saveGestoriaAuthorization(data: Record<string, unknown>): Promise<unknown> {
  return apiFetch('/api/gestoria', { method: 'PUT', body: JSON.stringify({ action: 'authorization', ...data }) });
}

export async function generateKDSPairCode(label = ''): Promise<unknown> {
  return apiFetch('/api/kds', { method: 'POST', body: JSON.stringify({ action: 'generate', label }) });
}

export async function verifyKDSPairCode(code: string, label: string, deviceId: string): Promise<unknown> {
  return apiFetch('/api/kds', { method: 'POST', body: JSON.stringify({ action: 'verify', code, label, deviceId }) });
}

export async function fetchKDSPairings(): Promise<unknown> {
  return apiFetch('/api/kds');
}

export async function checkKDSPairing(deviceId: string): Promise<unknown> {
  return apiFetch(`/api/kds?deviceId=${encodeURIComponent(deviceId)}`);
}

export async function revokeKDSPairing(id: string): Promise<unknown> {
  return apiFetch('/api/kds', { method: 'DELETE', body: JSON.stringify({ id }) });
}

export async function logKDSAudit(action: string, details: Record<string, unknown> = {}): Promise<unknown> {
  return apiFetch('/api/kds/audit', { method: 'POST', body: JSON.stringify({ action, details }) });
}

export async function fetchKDSAudit(limit = 200, offset = 0, action = ''): Promise<unknown> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (action) params.set('action', action);
  return apiFetch(`/api/kds/audit?${params}`);
}

interface ReservationParams {
  date?: string;
  from?: string;
  to?: string;
  status?: string;
}

export async function fetchReservations(params: ReservationParams = {}): Promise<unknown> {
  const q = new URLSearchParams();
  if (params.date) q.set('date', params.date);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.status) q.set('status', params.status);
  return apiFetch(`/api/reservations?${q}`);
}

export async function saveReservation(reservation: unknown): Promise<unknown> {
  return apiFetch('/api/reservations', { method: 'POST', body: JSON.stringify(reservation) });
}

export async function deleteReservation(id: string): Promise<unknown> {
  return apiFetch('/api/reservations', { method: 'DELETE', body: JSON.stringify({ id }) });
}

export async function fetchWaitlist(): Promise<unknown> {
  return apiFetch('/api/waitlist');
}

export async function waitlistAction(action: string, extra: Record<string, unknown> = {}): Promise<unknown> {
  return apiFetch('/api/waitlist', { method: 'POST', body: JSON.stringify({ action, ...extra }) });
}

export async function fetchBuffetSessions(): Promise<unknown> {
  return apiFetch('/api/buffet?scope=sessions');
}

export async function fetchBuffetConfig(): Promise<unknown> {
  return apiFetch('/api/buffet?scope=config');
}

export async function buffetAction(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  return apiFetch('/api/buffet', { method: 'POST', body: JSON.stringify({ action, ...payload }) });
}

export async function fetchBuffetTableSession(tableId: string): Promise<unknown> {
  return apiFetch(`/api/buffet?scope=table_session&tableId=${tableId}`);
}

export async function fetchBuffetRounds(sessionId: string): Promise<unknown> {
  return apiFetch(`/api/buffet?scope=rounds&sessionId=${sessionId}`);
}

export async function fetchClosures(): Promise<unknown> {
  return apiFetch('/api/closures');
}

export async function saveClosure(data: unknown): Promise<unknown> {
  return apiFetch('/api/closures', { method: 'POST', body: JSON.stringify(data) });
}
