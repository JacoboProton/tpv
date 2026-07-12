let cache = null;
let cacheTime = 0;
const TTL = 30000;

export function getCachedSettings() {
  if (cache && Date.now() - cacheTime < TTL) return cache;
  return null;
}

export function setCachedSettings(settings) {
  cache = settings;
  cacheTime = Date.now();
}

export function invalidateSettingsCache() {
  cache = null;
  cacheTime = 0;
}
