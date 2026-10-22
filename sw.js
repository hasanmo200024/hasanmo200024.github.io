// قسطاس — Service Worker (v1.3.2)
// غيّر الرقم ده لما تغيّر قائمة PRECACHE أو عايز تفرّغ الكاش بالكامل.
// الصفحة نفسها بتتحدّث لوحدها (network-first)، وباقي الملفات بتتجدّد في الخلفية.
const CACHE_NAME = 'qistas-v15';

// ملفات الموقع الأساسية (مسارات نسبية لمكان sw.js، فتشتغل حتى لو الموقع في مجلد فرعي)
const PRECACHE = ['./', './index.html', './manifest.json', './qistas.css?v=1.6.0', './qistas.js?v=1.6.0', './icons/icon.png', './icons/favicon-32.png', './icons/apple-touch-icon.png'];

// مكتبات خارجية لازمة للتطبيق أوفلاين (لو غيّرت إصدار Firebase في index.html غيّره هنا)
const PRECACHE_EXTERNAL = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// الدومينات الخارجية الوحيدة اللي بنخزّنها. أي دومين تاني (زي Firestore) بيعدّي مباشرة.
const CACHEABLE_HOSTS = [
  'www.gstatic.com',        // مكتبات Firebase
  'fonts.googleapis.com',   // CSS الخطوط
  'fonts.gstatic.com'       // ملفات الخطوط
];

const NAV_TIMEOUT_MS = 4000;
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

// ───────── رسائل من الصفحة ─────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ───────── Install: تخزين متسامح (ملف ناقص ما يفشّلش التثبيت) ─────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled([
        ...PRECACHE.map(u => cache.add(u)),
        ...PRECACHE_EXTERNAL.map(u => cache.add(new Request(u, { mode: 'cors' })))
      ])
    )
  );
  self.skipWaiting();
});

// ───────── Activate: حذف الكاش القديم + السيطرة الفورية ─────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' })))
  );
});

// ───────── Helpers ─────────
function isCacheable(res) {
  // 200 فقط (206 مينفعش يتخزن)، والـ opaque مسموح للدومينات الخارجية المعروفة
  return !!res && (res.status === 200 || res.type === 'opaque');
}

function putSafe(cache, key, res) {
  return cache.put(key, res).catch(() => {}); // مثلًا لو المساحة خلصت
}

// صفحة التطبيق: الشبكة أولًا بمهلة، ولو فشلت أو اتأخرت → النسخة المخزنة
async function handleNavigation(e) {
  const cache = await caches.open(CACHE_NAME);

  const network = fetch(e.request).then(res => {
    // مبنخزنش ردود redirect لأن المتصفح بيرفضها في الـ navigation
    if (res && res.status === 200 && !res.redirected) {
      e.waitUntil(putSafe(cache, INDEX_URL, res.clone()));
    }
    return res;
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT_MS)
  );

  try {
    return await Promise.race([network, timeout]);
  } catch (err) {
    const cached = await cache.match(INDEX_URL);
    if (cached) {
      network.catch(() => {}); // سيب الطلب يكمل في الخلفية من غير أخطاء
      return cached;
    }
    // مفيش نسخة مخزنة: استنى الشبكة لو لسه شغالة
    return network;
  }
}

// باقي الملفات: من الكاش فورًا وتتحدّث في الخلفية (stale-while-revalidate)
async function handleAsset(e) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(e.request);

  const network = fetch(e.request)
    .then(res => {
      if (isCacheable(res)) e.waitUntil(putSafe(cache, e.request, res.clone()));
      return res;
    })
    .catch(() => null);

  if (cached) {
    e.waitUntil(network);
    return cached;
  }
  const res = await network;
  return res || Response.error(); // فشل واضح بدل ما نرجّع index.html لصورة أو JS
}

// ───────── Fetch ─────────
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return; // صوت/فيديو: سيبه للمتصفح

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // أي دومين خارجي مش في القائمة (Firestore, Google APIs...) → مبنتدخلش فيه
  if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return;

  // من الدومين الخارجي المسموح، المكتبات والخطوط بس
  if (!sameOrigin && url.hostname === 'www.gstatic.com' && !url.pathname.startsWith('/firebasejs/')) return;

  const isNavigation = req.mode === 'navigate' || req.destination === 'document';
  if (isNavigation && sameOrigin) {
    e.respondWith(handleNavigation(e));
    return;
  }

  e.respondWith(handleAsset(e));
});

// ───────── الضغط على إشعار: يركّز على التطبيق المفتوح أو يفتحه ─────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const scope = self.registration.scope;
  const wanted = e.notification.data && e.notification.data.url;
  const target = wanted && wanted.startsWith(scope) ? wanted : scope;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.startsWith(scope) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
