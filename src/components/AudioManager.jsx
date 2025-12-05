// 音效管理器 - 预加载并缓存所有音效

const audioCache = new Map();

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

// 预加载音频文件到缓存
async function preloadAudio(key, url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    audioCache.set(key, arrayBuffer);
    console.log(`[AudioManager] Cached: ${key}`);
  } catch (error) {
    console.warn(`[AudioManager] Failed to cache ${key}:`, error);
  }
}

// 初始化：预加载所有音效
export async function initAudioManager() {
  const promises = Object.entries(AUDIO_URLS).map(([key, url]) => 
    preloadAudio(key, url)
  );
  await Promise.all(promises);
  console.log('[AudioManager] All audio files cached');
}

// 播放音效
export function playSound(key, options = {}) {
  const { loop = false } = options;
  
  const buffer = audioCache.get(key);
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