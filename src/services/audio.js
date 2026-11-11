/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Taro from '@tarojs/taro';
import ringAudioUrl from '@/assets/audio/ring.mp3';
import focusEndAudioUrl from '@/assets/audio/focus-end.mp3';
import breakEndAudioUrl from '@/assets/audio/break-end.mp3';

// 维护全局当前正在播放的音频实例与超时定时器
let currentAudioInstance = null;
let currentStopTimer = null;
let vibrationLoopTimer = null;

/**
 * 应用启动时调用：全局设置不遵循 iOS 静音开关，Android 优先外放扬声器
 */
export function initAudio() {
  try {
    Taro.setInnerAudioOption({
      obeyMuteSwitch: false, // iOS
      speakerOn: true,       // Android
      mixWithOther: true,
    });
    console.log('🍅 [Audio Service] 音频服务初始化成功: iOS 静音穿透 + Android 扬声器已就绪');
  } catch (err) {
    console.error('[Audio Service] initAudio 错误:', err);
  }
}

/**
 * 停止当前所有正在播放的音效与震动循环
 */
export function stopAllAudio() {
  if (currentStopTimer) {
    clearTimeout(currentStopTimer);
    currentStopTimer = null;
  }
  if (vibrationLoopTimer) {
    clearInterval(vibrationLoopTimer);
    vibrationLoopTimer = null;
  }
  if (currentAudioInstance) {
    try {
      currentAudioInstance.stop();
      currentAudioInstance.destroy();
    } catch (e) {
      console.warn('[Audio Service] 停止音频实例失败:', e);
    }
    currentAudioInstance = null;
  }
}

/**
 * 核心音频播放器函数
 * 每次播放前均强制调用 Taro.setInnerAudioOption({ obeyMuteSwitch: false, speakerOn: true })
 * 并且为 audio 实例显式设置 audio.obeyMuteSwitch = false, audio.speakerOn = true
 *
 * @param {string} src 音频路径
 * @param {object} [options]
 * @param {number} [options.durationMs] 限制播放时长（毫秒），超时自动停止
 * @param {boolean} [options.loop=false] 是否循环播放
 * @param {boolean} [options.vibrate=false] 是否同步触发 Android/移动端硬件震动
 * @param {() => void} [options.onEnded] 播放结束回调
 * @param {(err: any) => void} [options.onError] 播放出错回调
 * @returns {any} InnerAudioContext 实例
 */
export function playAudio(src, options = {}) {
  // 1. 立即停止上一段正在播放的音效与震动
  stopAllAudio();

  // 2. 关键要求：每次播放前显式调用 Taro.setInnerAudioOption 兼容 iOS & Android
  Taro.setInnerAudioOption({
    obeyMuteSwitch: false,
    speakerOn: true,
    mixWithOther: true,
  });

  // 3. 创建 InnerAudioContext 实例
  const audio = Taro.createInnerAudioContext();

  // 4. 关键要求：实例必须显式设置 obeyMuteSwitch 与 speakerOn
  audio.obeyMuteSwitch = false;
  audio.speakerOn = true;
  audio.src = src;
  audio.loop = options.loop || false;

  currentAudioInstance = audio;

  // 若开启震动，在移动端（Android）同步触发硬件震动
  if (options.vibrate) {
    Taro.vibrateLong();
    if (options.loop) {
      vibrationLoopTimer = setInterval(() => {
        Taro.vibrateLong();
      }, 1500);
    }
  }

  audio.onPlay(() => {
    console.log(`🔊 [Audio Service] 开始播放: ${src}, obeyMuteSwitch=${audio.obeyMuteSwitch}, speakerOn=${audio.speakerOn}`);
  });

  audio.onEnded(() => {
    console.log(`⏹️ [Audio Service] 音频播放完毕: ${src}`);
    if (vibrationLoopTimer) {
      clearInterval(vibrationLoopTimer);
      vibrationLoopTimer = null;
    }
    if (currentAudioInstance === audio) {
      currentAudioInstance = null;
    }
    if (options.onEnded) options.onEnded();
  });

  audio.onError((err) => {
    console.error(`❌ [Audio Service] 音频播放异常:`, err);
    if (vibrationLoopTimer) {
      clearInterval(vibrationLoopTimer);
      vibrationLoopTimer = null;
    }
    if (options.onError) options.onError(err);
  });

  // 执行播放
  audio.play();

  // 5. 若指定了 durationMs，设置超时强制停止
  if (options.durationMs && options.durationMs > 0) {
    currentStopTimer = setTimeout(() => {
      console.log(`⏱️ [Audio Service] 已达指定播放时长 ${options.durationMs}ms，停止响铃`);
      stopAllAudio();
      if (options.onEnded) options.onEnded();
    }, options.durationMs);
  }

  return audio;
}

/**
 * 音频资源映射表
 */
export const AUDIO_SOURCES = {
  ring: ringAudioUrl,
  'focus-end': focusEndAudioUrl,
  'break-end': breakEndAudioUrl,
};

/**
 * 核心响铃与音效播放器
 * 支持根据 sound / soundType 动态切换标准响铃、专注完成或休息结束音效
 * @param {{ sound?: string, soundType?: string, durationMs?: number, loop?: boolean, vibrate?: boolean, onEnded?: () => void }} [params]
 */
export function playRingSound(params = {}) {
  const soundKey = params.sound || params.soundType || 'ring';
  const targetAudioUrl = AUDIO_SOURCES[soundKey] || ringAudioUrl;
  const isRingAlarm = soundKey === 'ring' || soundKey === 'default';

  const duration = params.durationMs || (isRingAlarm ? 5000 : 2500);
  const shouldLoop = params.loop !== undefined ? params.loop : isRingAlarm;
  const shouldVibrate = params.vibrate !== undefined ? params.vibrate : isRingAlarm;

  if (soundKey === 'focus-end' || soundKey === 'break-end') {
    Taro.vibrateShort();
  }

  return playAudio(targetAudioUrl, {
    durationMs: duration,
    loop: shouldLoop,
    vibrate: shouldVibrate,
    onEnded: params.onEnded,
  });
}

/**
 * 播放专注完成提示音效 (focus-end.mp3)
 * @param {() => void} [onEnded]
 */
export function playFocusEndSound(onEnded) {
  Taro.vibrateShort();
  return playAudio(focusEndAudioUrl, {
    durationMs: 2500,
    loop: false,
    vibrate: false,
    onEnded,
  });
}

/**
 * 播放休息结束提示音效 (break-end.mp3)
 * @param {() => void} [onEnded]
 */
export function playBreakEndSound(onEnded) {
  Taro.vibrateShort();
  return playAudio(breakEndAudioUrl, {
    durationMs: 2500,
    loop: false,
    vibrate: false,
    onEnded,
  });
}

/**
 * 测试本地响铃，用于用户在 iPhone 静音拨片或 Android 静音模式下验证能否出声与震动
 */
export function testRingSound(onEnded) {
  return playRingSound({
    sound: 'ring',
    durationMs: 3000,
    onEnded,
  });
}

