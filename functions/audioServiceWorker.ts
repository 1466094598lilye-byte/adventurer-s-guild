// Service Worker for caching audio files
// This file will be served as a static JS file

const CACHE_NAME = 'quest-audio-cache-v1';

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

Deno.serve(async (req) => {
  // Generate Service Worker JS code
  const swCode = `
const CACHE_NAME = '${CACHE_NAME}';
const AUDIO_URLS = ${JSON.stringify(AUDIO_URLS)};

// Install event - pre-cache audio files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing and caching audio files...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use no-cors mode for cross-origin requests
        const cachePromises = AUDIO_URLS.map(url => 
          fetch(url, { mode: 'cors' })
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
              console.warn('[SW] Failed to cache:', url);
            })
            .catch(err => console.warn('[SW] Fetch error for:', url, err))
        );
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW] Audio files cached successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('quest-audio-cache-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Only intercept audio file requests
  if (AUDIO_URLS.includes(url) || url.includes('.mp3')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', url);
            return cachedResponse;
          }
          
          console.log('[SW] Fetching from network:', url);
          return fetch(event.request).then((response) => {
            // Cache the new response
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
    );
  }
});
`;

  return new Response(swCode, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    }
  });
});