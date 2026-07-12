let cache: unknown = null;
let cacheTime = 0;
const TTL = 30000;

export function getCachedSettings(): unknown {
  if (cache && Date.now() - cacheTime < TTL) return cache;
  return null;
}

export function setCachedSettings(settings: unknown): void {
  cache = settings;
  cacheTime = Date.now();
}

export function invalidateSettingsCache(): void {
  cache = null;
  cacheTime = 0;
}
