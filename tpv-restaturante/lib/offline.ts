import { z } from 'zod'

const CACHE_PREFIX = 'tpv:cache:';
const QUEUE_KEY = 'tpv:mutations';

export function cacheGet<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function cacheSet(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch { /* quota exceeded, silently ignore */ }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

type NetworkListener = (online: boolean) => void;

let listeners: NetworkListener[] = [];

export function onNetworkChange(fn: NetworkListener): () => void {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => listeners.forEach(fn => fn(true)));
  window.addEventListener('offline', () => listeners.forEach(fn => fn(false)));
}

// ─────────────────────────────────────────────────────────────
// Mutation queue v2 — tipada (Zod), dedup por idempotencyKey,
// retry exponencial + jitter, LWW + vector clock para floor.
// ─────────────────────────────────────────────────────────────

export const BASE_RETRY_MS = 1000
export const MAX_RETRY_MS = 60_000
export const MAX_ATTEMPTS = 10

export interface MutationV2 {
  id: string
  key: string
  method: string
  schemaName: string
  payload: unknown
  idempotencyKey: string
  coalesce: boolean
  createdAt: number
  attempts: number
  nextRetryAt: number
  lastError?: string
}

// Guard estructural por endpoint: comprueba solo la forma esperada.
// La validación autoritativa de campos la hace el servidor (safeParse → 400),
// y el loop de sync descarta los 4xx sin reintentar.
const ANY_ARRAY = z.array(z.any())
const ANY_OBJECT = z.object({}).passthrough()

export const MUTATION_SCHEMAS: Record<string, z.ZodType> = {
  '/api/floor': ANY_OBJECT,
  '/api/employees': ANY_ARRAY,
  '/api/catalog': ANY_OBJECT,
  '/api/offers': ANY_ARRAY,
  '/api/combos': ANY_ARRAY,
  '/api/meal-menus': ANY_ARRAY,
  '/api/price-rules': ANY_ARRAY,
  '/api/sales': ANY_OBJECT,
  '/api/sales/refund': ANY_OBJECT,
}

const COALESCE_KEYS = new Set(['/api/floor', '/api/employees', '/api/catalog', '/api/offers', '/api/combos', '/api/meal-menus', '/api/price-rules'])

let uidCounter = 0
export function generateMutationId(): string {
  uidCounter = (uidCounter + 1) % 0xffff
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${uidCounter.toString(36)}`
}

export function hashPayload(payload: unknown): string {
  const s = JSON.stringify(payload)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

export function computeBackoff(attempts: number, jitter = Math.random): number {
  const exp = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * Math.pow(2, attempts))
  return Math.round(exp + jitter() * BASE_RETRY_MS)
}

export function validateMutationPayload(key: string, payload: unknown): { ok: true } | { ok: false; error: string } {
  const schema = MUTATION_SCHEMAS[key]
  if (!schema) return { ok: true }
  const res = schema.safeParse(payload)
  if (!res.success) {
    return { ok: false, error: res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }
  }
  return { ok: true }
}

export function getMutations(): MutationV2[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as MutationV2[]
    return Array.isArray(raw) ? raw : []
  } catch { return []; }
}

function persistQueue(q: MutationV2[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  } catch { /* quota */ }
}

export interface EnqueueMutationInput {
  key: string
  method?: string
  payload: unknown
  idempotencyKey?: string
  coalesce?: boolean
}

export function enqueueMutation(input: EnqueueMutationInput | string, payload?: unknown, method = 'PUT'): void {
  if (typeof input === 'string') {
    // Backwards-compatible shim: enqueueMutation('/api/x', '{"a":1}')
    input = { key: input, payload, method }
  }
  const { key, method: m = method } = input as EnqueueMutationInput
  const q = getMutations()
  let body = input.payload
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { /* keep raw string */ }
  }
  const idempotencyKey = input.idempotencyKey || hashPayload(body)
  const coalesce = input.coalesce ?? COALESCE_KEYS.has(key)
  const now = Date.now()

  const existingIdx = q.findIndex(mut => mut.key === key && mut.idempotencyKey === idempotencyKey)
  const mutation: MutationV2 = {
    id: generateMutationId(),
    key,
    method: m,
    schemaName: key,
    payload: body,
    idempotencyKey,
    coalesce,
    createdAt: now,
    attempts: 0,
    nextRetryAt: now,
  }

  if (coalesce) {
    const dropIdx = q.findIndex(mut => mut.key === key)
    if (dropIdx >= 0) q.splice(dropIdx, 1)
    q.push(mutation)
  } else if (existingIdx >= 0) {
    q[existingIdx] = mutation
  } else {
    q.push(mutation)
  }
  persistQueue(q)
}

export function dequeueMutation(): MutationV2 | null {
  const q = getMutations()
  const first = q.shift() ?? null;
  if (first) persistQueue(q);
  return first;
}

export function getDueMutations(now = Date.now()): MutationV2[] {
  return getMutations().filter(m => m.nextRetryAt <= now)
}

export function setMutations(q: MutationV2[]): void {
  persistQueue(q)
}

export function updateMutation(id: string, patch: Partial<MutationV2>): void {
  const q = getMutations()
  const idx = q.findIndex(m => m.id === id)
  if (idx >= 0) {
    q[idx] = { ...q[idx], ...patch }
    persistQueue(q)
  }
}

export function removeMutation(id: string): void {
  persistQueue(getMutations().filter(m => m.id !== id))
}

export function clearMutations(): void {
  localStorage.removeItem(QUEUE_KEY);
}
