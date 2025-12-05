// 音效管理器 - 使用 Cache API 持久化存储音效文件

const CACHE_NAME = 'quest-audio-cache-v1';

const AUDIO_URLS = {
  // 宝箱相关
  chestOpen: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%AE%9D%E7%AE%B1%E9%9F%B3%E6%95%88.mp3',
  collectTreasure: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E6%94%B6%E4%B8%8B%E5%AE%9D%E7%89%A9%E9%9F%B3%E6%95%88.mp3',
  
  // 合成相关
  craftingLoop: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%90%88%E6%88%90%E4%B8%AD%E9%9F%B3%E6%95%88.mp3',
  craftingSuccess: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%90%88%E6%88%90%E6%88%90%E5%8A%9F%E9%9F%B3%E6%95%88.mp3',
  craftingSelect: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8A%A0%E5%85%A5%E5%90%88%E6%88%90.mp3',
  
  // 工坊相关
  enterWorkshop: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E8%BF%9B%E5%85%A5%E5%B7%A5%E5%9D%8A%E9%9F%B3%E6%95%88.mp3',
  
  // 大项目相关
  loadingLoop: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8A%A0%E8%BD%BD%E6%97%B6%E6%92%AD%E6%94%BE.mp3',
  projectParsed: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%BC%B9%E5%87%BA%E9%9F%B3%E6%95%88.mp3',
  projectAdded: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%8A%A0%E5%85%A5%E5%A7%94%E6%89%98%E6%9D%BF.mp3',
};

// 内存缓存（用于快速播放，避免每次从 Cache API 读取）
const memoryCache = new Map();

// 初始化音效管理器 - 使用 Cache API 持久化存储
export async function initAudioManager() {
  // 检查浏览器是否支持 Cache API
  if (!('caches' in window)) {
    console.warn('[AudioManager] Cache API not supported, using memory only');
    await fallbackPreload();
    return;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    
    for (const [key, url] of Object.entries(AUDIO_URLS)) {
      try {
        // 先检查缓存中是否已有
        const cachedResponse = await cache.match(url);
        
        if (cachedResponse) {
          // 从持久化缓存加载到内存
          const arrayBuffer = await cachedResponse.arrayBuffer();
          memoryCache.set(key, arrayBuffer);
          console.log(`[AudioManager] Loaded from cache: ${key}`);
        } else {
          // 从网络获取并存入持久化缓存
          const response = await fetch(url);
          const responseClone = response.clone();
          await cache.put(url, responseClone);
          
          const arrayBuffer = await response.arrayBuffer();
          memoryCache.set(key, arrayBuffer);
          console.log(`[AudioManager] Downloaded and cached: ${key}`);
        }
      } catch (error) {
        console.warn(`[AudioManager] Failed to load ${key}:`, error);
      }
    }
    
    console.log('[AudioManager] Initialized with persistent cache');
  } catch (error) {
    console.warn('[AudioManager] Cache API failed, using memory only', error);
    await fallbackPreload();
  }
}

// 降级方案：仅内存缓存（不支持 Cache API 的浏览器）
async function fallbackPreload() {
  const promises = Object.entries(AUDIO_URLS).map(async ([key, url]) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      memoryCache.set(key, arrayBuffer);
    } catch (error) {
      console.warn(`[AudioManager] Failed to preload ${key}:`, error);
    }
  });
  await Promise.all(promises);
  console.log('[AudioManager] Initialized with memory cache only');
}

// 播放音效
export function playSound(key, options = {}) {
  const { loop = false } = options;
  
  const buffer = memoryCache.get(key);
  if (!buffer) {
    // 如果缓存中没有，降级为直接播放URL
    const url = AUDIO_URLS[key];
    if (url) {
      const audio = new Audio(url);
      audio.loop = loop;
      audio.play().catch(() => {});
      return audio;
    }
    console.warn(`[AudioManager] Sound not found: ${key}`);
    return null;
  }
  
  // 从缓存的 ArrayBuffer 创建 Blob 并播放
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.loop = loop;
  
  audio.onended = () => {
    if (!loop) {
      URL.revokeObjectURL(url);
    }
  };
  
  audio.play().catch(() => {});
  return audio;
}

// 停止循环音效
export function stopSound(audio) {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

export { AUDIO_URLS };