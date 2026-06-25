self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  e.respondWith(
    caches.open('v1').then(cache =>
      fetch(request)
        .then(res => { cache.put(request, res.clone()); return res; })
        .catch(() => cache.match(request))
    )
  );
});
