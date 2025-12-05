// Service Worker for caching audio files
// Handles cross-origin mp3 files with opaque responses

Deno.serve(async (req) => {
  // Deno 注入的音频 URL 列表（与 AudioManager 保持一致）
  const AUDIO_URLS = [
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%AE%9D%E7%AE%B1%E9%9F%B3%E6%95%88.mp3',
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E6%94%B6%E4%B8%8B%E5%AE%9D%E7%89%A9%E9%9F%B3%E6%95%88.mp3',
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%90%88%E6%88%90%E4%B8%AD%E9%9F%B3%E6%95%88%EF%BC%88%E6%9C%80%E7%BB%88%E7%89%88%EF%BC%89.mp3',
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%90%88%E6%88%90%E6%88%90%E5%8A%9F%E9%9F%B3%E6%95%88.mp3',
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8A%A0%E5%85%A5%E5%90%88%E6%88%90.mp3',
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E8%BF%9B%E5%85%A5%E5%B7%A5%E5%9D%8A%E9%9F%B3%E6%95%88.mp3',
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8A%A0%E8%BD%BD%E6%97%B6%E6%92%AD%E6%94%BE.mp3',
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%BC%B9%E5%87%BA%E9%9F%B3%E6%95%88.mp3',
    'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%8A%A0%E5%85%A5%E5%A7%94%E6%89%98%E6%9D%BF.mp3',
  ];

  const swCode = `
const CACHE_NAME = 'quest-audio-cache-v3';

const AUDIO_URLS = ${JSON.stringify(AUDIO_URLS)};

// Install event - 使用 cache.addAll 预缓存所有音频
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v3...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching all audio files with cache.addAll...');
        return cache.addAll(AUDIO_URLS);
      })
      .then(() => {
        console.log('[SW] All audio files cached successfully');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] cache.addAll failed:', err);
        return self.skipWaiting();
      })
  );
});

// Activate event - 清理旧缓存并立即接管
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v3...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('quest-audio-cache-') && name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Taking control of all clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - 仅拦截 AUDIO_URLS 中的请求
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // 仅精确匹配 AUDIO_URLS 中的 URL
  if (!AUDIO_URLS.includes(url)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.split('/').pop());
          return cachedResponse;
        }
        
        // 缓存未命中，从网络获取并缓存（不检查 response.ok）
        console.log('[SW] Cache miss, fetching:', url.split('/').pop());
        return fetch(event.request)
          .then((response) => {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('[SW] Cached new resource:', url.split('/').pop());
              });
            return response;
          });
      })
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

console.log('[SW] Service Worker v3 script loaded');
`;

  return new Response(swCode, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/'
    }
  });
});