/* ORBIT service worker — offline-first shell caching. */
const VERSION = 'orbit-v2';
const SHELL = [
  '/',
  '/offline',
  '/assessments',
  '/body',
  '/insights',
  '/nasa',
  '/report',
  '/settings',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never intercept cross-origin

  // Navigation: network-first, fall back to cache, then /offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('/offline')),
        ),
    );
    return;
  }

  // Static assets: network-first (dev chunks are unhashed), cache fallback.
  // /icons/ and manifest are immutable, so cache-first is safe there.
  const immutable = url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest';
  event.respondWith(
    (async () => {
      if (!immutable) {
        try {
          const res = await fetch(req);
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        } catch {
          const hit = await caches.match(req);
          return hit || Response.error();
        }
      }
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      } catch {
        return Response.error();
      }
    })(),
  );
});
