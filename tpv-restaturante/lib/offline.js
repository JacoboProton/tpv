const CACHE_PREFIX = 'tpv:cache:';
const QUEUE_KEY = 'tpv:mutations';

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function cacheSet(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {}
}

export function isOnline() {
  return navigator.onLine;
}

let listeners = [];
export function onNetworkChange(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => listeners.forEach(fn => fn(true)));
  window.addEventListener('offline', () => listeners.forEach(fn => fn(false)));
}

export function getMutations() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

export function enqueueMutation(key, payload) {
  const q = getMutations();
  q.push({ key, payload, createdAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function dequeueMutation() {
  const q = getMutations();
  if (q.length === 0) return null;
  const first = q.shift();
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  return first;
}

export function clearMutations() {
  localStorage.removeItem(QUEUE_KEY);
}
