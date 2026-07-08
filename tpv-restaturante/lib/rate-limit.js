const windows = new Map();

let cleanupTimer = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [key, timestamps] of windows) {
      const recent = timestamps.filter(t => t > cutoff);
      if (recent.length === 0) windows.delete(key);
      else windows.set(key, recent);
    }
    if (windows.size === 0) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 60000);
}

export function rateLimit(key, maxRequests, windowMs) {
  if (!key) return { allowed: true, remaining: Infinity, reset: 0 };

  const now = Date.now();
  const windowStart = now - windowMs;

  if (!windows.has(key)) {
    windows.set(key, []);
  }

  const timestamps = windows.get(key).filter(t => t > windowStart);
  timestamps.push(now);
  windows.set(key, timestamps);
  ensureCleanup();

  const inWindow = timestamps.length;

  if (inWindow > maxRequests * 2) {
    windows.set(key, timestamps.slice(-maxRequests));
  }

  return {
    allowed: inWindow <= maxRequests,
    remaining: Math.max(0, maxRequests - inWindow),
    reset: windowStart + windowMs,
  };
}
