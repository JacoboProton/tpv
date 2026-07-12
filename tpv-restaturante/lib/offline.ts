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

interface Mutation {
  key: string;
  payload: unknown;
  method: string;
  createdAt: number;
}

export function getMutations(): Mutation[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

export function enqueueMutation(key: string, payload: unknown, method = 'PUT'): void {
  const q = getMutations();
  q.push({ key, payload, method, createdAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function dequeueMutation(): Mutation | null {
  const q = getMutations();
  if (q.length === 0) return null;
  const first = q.shift()!;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  return first;
}

export function clearMutations(): void {
  localStorage.removeItem(QUEUE_KEY);
}
