// حساباتي — المودة للبرمجيات
// Service Worker v3.0

const CACHE_NAME = 'hesabati-v3'; // ⚠️ لازم تزود الرقم ده مع كل نسخة جديدة بترفعها
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// استقبال أمر التفعيل الفوري من الصفحة
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install: cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // يخلي الـ SW الجديد يتفعل فورًا بدل ما يستنى إغلاق كل التابات
});

// Activate: delete old caches + خد تحكم فوري في الصفحات المفتوحة
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' })))
  );
});

// Fetch:
// - صفحات HTML (navigation requests) → network-first عشان أي تحديث ينزل فورًا
// - باقي الملفات (CSS/JS/صور...) → cache-first زي ما هي، أسرع وأوفر
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const isNavigation = e.request.mode === 'navigate' ||
    (e.request.destination === 'document');

  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
