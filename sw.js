// Service Worker — 备忘日历 PWA 离线缓存
const CACHE_NAME = 'memo-calendar-v4';
const ASSETS = [
  './',
  './index.html?v=20260725',
  './manifest.json',
  './icon.svg',
  './css/style.css?v=20260725',
  './js/app.js?v=20260725',
  './js/calendar.js?v=20260725',
  './js/events.js?v=20260725',
  './js/countdown.js?v=20260725',
  './js/lunar.js?v=20260725'
];

// 安装：缓存所有静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // 缓存成功的网络请求
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      // 完全离线且缓存未命中时，返回占位页（仅对页面请求）
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
