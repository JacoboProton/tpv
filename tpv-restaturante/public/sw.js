const CACHE = 'tpv-v2';
const STATIC_EXTS = /\.(svg|webp|png|jpg|jpeg|gif|ico|woff2?|ttf|eot)$/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Solo cachear assets estáticos
  if (STATIC_EXTS.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        fetch(request)
          .then(res => { cache.put(request, res.clone()); return res; })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  // Todo lo demás — red directa
  e.respondWith(fetch(request).catch(() => new Response('Offline', { status: 503 })));
});
