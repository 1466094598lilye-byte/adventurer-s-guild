export async function onRequest(context) {
  const sw = `
const CACHE_NAME = 'adventurers-guild-v1';

// 自动缓存首页与关键静态资源（Base44 的打包产物）
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index-BCSvx_vP.js',
  '/assets/index-LXDvHlPm.css',
];

// 安装阶段：预缓存静态文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 激活阶段：清理旧缓存
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

// 捕获所有请求（SPA 离线支援）
self.addEventListener('fetch', event => {
  const request = event.request;

  // 对请求优先使用缓存，其次 fallback 到网络
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).catch(() => {
        // 离线 fallback：如果请求是页面路由，则返回首页
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