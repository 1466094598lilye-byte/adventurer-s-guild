// --------------------------------------------------
// 简单可靠的音频系统 - 使用 HTML Audio（绕过 CORS）
// --------------------------------------------------

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

// 音频实例缓存
const audioCache = {};

// ----------------------
// 播放音效（使用 Audio 标签）
// ----------------------
export function playSound(key, options = {}) {
  const url = AUDIO_URLS[key];
  if (!url) {
    console.warn(`[AudioManager] Sound key not found: ${key}`);
    return null;
  }

  try {
    const { loop = false, volume = 0.7 } = options;

    // 如果是循环音效，复用同一个实例
    if (loop && audioCache[key]) {
      const audio = audioCache[key];
      audio.currentTime = 0;
      audio.play().catch(e => console.warn(`[AudioManager] Play failed:`, e));
      return audio;
    }

    // 创建新的 Audio 实例
    const audio = new Audio(url);
    audio.volume = volume;
    audio.loop = loop;

    if (loop) {
      audioCache[key] = audio;
    }

    audio.play().catch(e => {
      console.warn(`[AudioManager] Failed to play ${key}:`, e);
    });

    console.log(`[AudioManager] ✓ Playing ${key} (loop: ${loop}, volume: ${volume})`);

    return audio;
  } catch (err) {
    console.error(`[AudioManager] Error playing ${key}:`, err);
    return null;
  }
}

// ----------------------
// 停止循环音效
// ----------------------
export function stopSound(audio) {
  if (audio && audio.pause) {
    audio.pause();
    audio.currentTime = 0;
  }
}

export { AUDIO_URLS };