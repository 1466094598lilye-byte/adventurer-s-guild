Deno.serve(async (req) => {
  const sw = `
const CACHE_NAME = 'adventurers-guild-v1';
const urlsToCache = [
  '/',
  '/QuestBoard',
  '/Journal',
  '/Treasures',
  '/Profile'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
  `;

  return new Response(sw, {
    status: 200,
    headers: { "Content-Type": "application/javascript" }
  });
});