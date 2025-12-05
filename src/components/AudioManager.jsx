// --------------------------------------------------
// 真正的"内存预加载音频系统" - 使用 Web Audio API
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

// AudioContext（浏览器必须在用户点击后才能启动）
let audioCtx = null;

// 真正缓存的是音频 buffer（内存数据）
const audioBuffers = {};

let initialized = false;

// ----------------------
// 初始化 & 预加载全部音频
// ----------------------
export async function initAudioManager() {
  if (initialized) return;

  // 必须在用户第一次交互后创建
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (err) {
    console.error("[AudioManager] Failed to create AudioContext:", err);
    return;
  }

  console.log("[AudioManager] Fetching & decoding audio...");

  const entries = Object.entries(AUDIO_URLS);

  for (const [key, url] of entries) {
    try {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioBuffers[key] = audioBuffer;

      console.log(`[AudioManager] Loaded: ${key}`);

    } catch (err) {
      console.error(`[AudioManager] Failed: ${key}`, err);
    }
  }

  initialized = true;
  console.log("[AudioManager] All audio loaded into memory.");
}

// ----------------------
// 播放音效（真正的零延迟）
// ----------------------
export function playSound(key, options = {}) {
  if (!audioCtx || !initialized) {
    console.warn(`[AudioManager] Not initialized yet`);
    return null;
  }

  const buffer = audioBuffers[key];
  if (!buffer) {
    console.warn(`[AudioManager] Sound not found: ${key}`);
    return null;
  }

  try {
    const { loop = false, volume = 0.7 } = options;

    // 每次播放都必须创建新的 source
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode).connect(audioCtx.destination);
    source.start(0);

    return { source, gainNode };
  } catch (err) {
    console.error(`[AudioManager] Failed to play ${key}:`, err);
    return null;
  }
}

// ----------------------
// 停止循环
// ----------------------
export function stopSound(handle) {
  if (handle && handle.source) {
    handle.source.stop();
  }
}

export { AUDIO_URLS };