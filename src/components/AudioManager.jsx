// 音效管理器 - 使用 Service Worker 缓存

const CACHE_NAME = 'quest-audio-cache-v3';

// 注册 Service Worker
async function registerAudioServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        '/functions/audioServiceWorker',
        { scope: '/' }
      );
      console.log('[AudioManager] Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.warn('[AudioManager] Service Worker registration failed:', error);
    }
  }
  return null;
}

const AUDIO_URLS = {
  // 宝箱相关
  chestOpen: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%AE%9D%E7%AE%B1%E9%9F%B3%E6%95%88.mp3',
  collectTreasure: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E6%94%B6%E4%B8%8B%E5%AE%9D%E7%89%A9%E9%9F%B3%E6%95%88.mp3',
  
  // 合成相关
  craftingLoop: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%90%88%E6%88%90%E4%B8%AD%E9%9F%B3%E6%95%88%EF%BC%88%E6%9C%80%E7%BB%88%E7%89%88%EF%BC%89.mp3',
  craftingSuccess: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%90%88%E6%88%90%E6%88%90%E5%8A%9F%E9%9F%B3%E6%95%88.mp3',
  craftingSelect: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8A%A0%E5%85%A5%E5%90%88%E6%88%90.mp3',
  
  // 工坊相关
  enterWorkshop: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E8%BF%9B%E5%85%A5%E5%B7%A5%E5%9D%8A%E9%9F%B3%E6%95%88.mp3',
  
  // 大项目相关
  loadingLoop: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8A%A0%E8%BD%BD%E6%97%B6%E6%92%AD%E6%94%BE.mp3',
  projectParsed: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%BC%B9%E5%87%BA%E9%9F%B3%E6%95%88.mp3',
  projectAdded: 'https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%8A%A0%E5%85%A5%E5%A7%94%E6%89%98%E6%9D%BF.mp3',
};

// 初始化音效管理器（仅注册 SW，不做预加载）
let initialized = false;

export async function initAudioManager() {
  if (initialized) {
    console.log('[AudioManager] Already initialized, skipping');
    return;
  }
  
  // 仅注册 Service Worker，由 SW 负责缓存
  await registerAudioServiceWorker();
  initialized = true;
  console.log('[AudioManager] Initialized (SW will handle caching)');
}

// 播放音效 - 直接使用 new Audio()，让 SW 拦截请求
export function playSound(key, options = {}) {
  const { loop = false } = options;
  
  const url = AUDIO_URLS[key];
  if (!url) {
    console.warn(`[AudioManager] Sound not found: ${key}`);
    return null;
  }
  
  const audio = new Audio(url);
  audio.loop = loop;
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