export async function onRequest(context) {
  const sw = `
const CACHE_NAME = 'adventurers-guild-v1';

const urlsToCache = [
  '/',
  '/index.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
`;

  return new Response(sw, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache"
    }
  });
}