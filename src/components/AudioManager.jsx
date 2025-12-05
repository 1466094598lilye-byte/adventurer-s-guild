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
  if (initialized) {
    console.log("[AudioManager] Already initialized, skipping...");
    return;
  }

  console.log("[AudioManager] Starting initialization...");

  // 必须在用户第一次交互后创建
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    console.log("[AudioManager] AudioContext created:", audioCtx.state);
  } catch (err) {
    console.error("[AudioManager] Failed to create AudioContext:", err);
    return;
  }

  // Resume AudioContext if suspended
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
      console.log("[AudioManager] AudioContext resumed");
    } catch (err) {
      console.error("[AudioManager] Failed to resume AudioContext:", err);
    }
  }

  console.log("[AudioManager] Fetching & decoding audio...");

  const entries = Object.entries(AUDIO_URLS);
  console.log(`[AudioManager] Total sounds to load: ${entries.length}`);

  // 使用 Promise.allSettled 并行加载所有音频，失败也不阻塞
  const results = await Promise.allSettled(
    entries.map(async ([key, url]) => {
      try {
        console.log(`[AudioManager] Fetching ${key} from ${url}`);
        const res = await fetch(url, {
          cache: 'force-cache'
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const arrayBuffer = await res.arrayBuffer();
        console.log(`[AudioManager] Fetched ${key}, size: ${arrayBuffer.byteLength} bytes`);
        
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioBuffers[key] = audioBuffer;

        console.log(`[AudioManager] ✓ Loaded: ${key} (duration: ${audioBuffer.duration.toFixed(2)}s)`);
        return { key, success: true };

      } catch (err) {
        console.error(`[AudioManager] ✗ Failed to load ${key}:`, err);
        console.error(`[AudioManager] ✗ URL was: ${url}`);
        return { key, success: false, error: err.message };
      }
    })
  );

  initialized = true;
  
  const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success);
  
  console.log(`[AudioManager] Initialization complete! Loaded ${Object.keys(audioBuffers).length}/${entries.length} sounds`);
  console.log("[AudioManager] Available sounds:", Object.keys(audioBuffers));
  
  if (failed.length > 0) {
    console.error(`[AudioManager] ⚠️ FAILED TO LOAD ${failed.length} SOUNDS:`);
    failed.forEach(r => {
      console.error(`  - ${r.value.key}: ${r.value.error}`);
    });
  }
}

// ----------------------
// 播放音效（懒加载模式）
// ----------------------
export async function playSound(key, options = {}) {
  // 首次调用时自动初始化
  if (!initialized) {
    await initAudioManager();
  }
  
  // 如果初始化失败或音频不存在，静默返回
  if (!audioCtx || !audioBuffers[key]) {
    return null;
  }

  try {
    const { loop = false, volume = 0.7 } = options;

    // Resume context if suspended
    if (audioCtx.state === 'suspended') {
      console.log("[AudioManager] Resuming suspended AudioContext...");
      audioCtx.resume();
    }

    const buffer = audioBuffers[key];

    // 每次播放都必须创建新的 source
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode).connect(audioCtx.destination);
    source.start(0);

    console.log(`[AudioManager] ✓ Playing ${key} (loop: ${loop}, volume: ${volume})`);

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
    try {
      handle.source.stop();
      console.log('[AudioManager] ✓ Sound stopped');
    } catch (err) {
      console.error('[AudioManager] Failed to stop sound:', err);
    }
  } else {
    console.warn('[AudioManager] ⚠️ stopSound called but handle is invalid:', handle);
  }
}

export { AUDIO_URLS };