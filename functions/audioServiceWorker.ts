// Service Worker for caching audio files
// Handles cross-origin mp3 files with opaque responses

Deno.serve(async (req) => {
  // 使用与 AudioManager 完全相同的 URL
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
const CACHE_NAME = 'quest-audio-cache-v2';

const AUDIO_URLS = ${JSON.stringify(AUDIO_URLS, null, 2)};

// Install event - pre-cache all audio files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Caching audio files...');
        
        // 使用 no-cors 模式逐个缓存，处理跨域 opaque response
        const cachePromises = AUDIO_URLS.map(async (url) => {
          try {
            // 先检查是否已缓存
            const existing = await cache.match(url);
            if (existing) {
              console.log('[SW] Already cached:', url.split('/').pop());
              return;
            }
            
            // 使用 no-cors 获取跨域资源（返回 opaque response）
            const response = await fetch(url, { mode: 'no-cors' });
            await cache.put(url, response);
            console.log('[SW] Cached:', url.split('/').pop());
          } catch (err) {
            console.warn('[SW] Failed to cache:', url.split('/').pop(), err.message);
          }
        });
        
        await Promise.all(cachePromises);
        console.log('[SW] All audio files cached');
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2...');
  
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

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // 只拦截音频文件请求
  const isAudioUrl = AUDIO_URLS.includes(url) || url.endsWith('.mp3');
  
  if (!isAudioUrl) {
    return; // 不拦截非音频请求
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.split('/').pop());
          return cachedResponse;
        }
        
        // 缓存未命中，从网络获取并缓存
        console.log('[SW] Cache miss, fetching:', url.split('/').pop());
        return fetch(event.request, { mode: 'no-cors' })
          .then((response) => {
            // 缓存新获取的资源
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
        // 返回空响应避免崩溃
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

console.log('[SW] Service Worker script loaded');
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