/* Marathon app service worker */
const CACHE = 'marathon-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => {}))))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // App navigation: try network, fall back to cached app shell (offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          caches.open(CACHE).then((c) => c.put('./index.html', r.clone()).catch(() => {}));
          return r;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Other assets (incl. fonts): serve cached, refresh in background
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((r) => {
          if (r && r.status === 200) {
            const clone = r.clone();
            caches.open(CACHE).then((c) => c.put(req, clone).catch(() => {}));
          }
          return r;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
