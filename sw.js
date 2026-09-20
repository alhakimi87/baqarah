// Service worker: يحفظ واجهة التطبيق والخطوط لتعمل دون إنترنت.
// الصوت والنص يديرهما التطبيق نفسه (Cache API + localStorage).
const SHELL = 'baq-shell-v1';
const FONTS = 'baq-fonts-v1';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('baq-shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ملفات التطبيق: من الذاكرة أولاً مع تحديث في الخلفية
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(r => {
          if (r && r.ok) { const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // الخطوط
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(
      caches.open(FONTS).then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
