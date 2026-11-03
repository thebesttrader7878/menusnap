const V = 'eatdirect-v1';
const SHELL = ['/offline.html', '/static/base.css', '/static/land.css', '/static/start.css', '/static/land.js', '/static/start.js', '/static/pwa.js', '/static/manifest.webmanifest', '/static/img/logo-icon.png', '/static/img/favicon.png', '/static/img/icon-192.png', '/static/img/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Only these paths are ever cached. Everything else (API, orders, dashboards, owner, admin, auth, restaurant sites) is network-only.
const CACHEABLE = p => p.startsWith('/static/') && !p.startsWith('/static/admin');
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).catch(() => caches.match('/offline.html')));
    return;
  }
  if (CACHEABLE(u.pathname)) e.respondWith(caches.open(V).then(c => fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => c.match(r))));
});
