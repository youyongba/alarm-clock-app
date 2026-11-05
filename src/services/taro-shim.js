/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { detectPlatform, getVibrationPattern } from '@/utils/platform-logic.js';

/**
 * Taro 4 核心 API 跨平台兼容层（纯 JavaScript 实现）
 * 全面支持 iOS 与 Android：
 * - iOS: 绕过硬件静音开关 (Web Audio API 媒体流管线)
 * - Android: 支持扬声器强制输出 (speakerOn)、硬件震动触感 (vibrateLong/vibrateShort)
 * - 通用: 屏幕常亮唤醒锁 (setKeepScreenOn / WakeLock API)
 */

// 全局音频设置状态
const globalAudioOption = {
  obeyMuteSwitch: false, // iOS: 默认不遵守静音开关，强制出声
  mixWithOther: true,
  speakerOn: true, // Android: 默认使用外放扬声器发声
};

// 屏幕常亮 Wake Lock 引用
let wakeLockSentinel = null;

// Web Audio API 上下文单例
let sharedAudioContext = null;
const audioBufferCache = new Map();

/**
 * 获取或激活 Web Audio Context
 * @returns {AudioContext | null}
 */
export function getOrCreateAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * 预加载并解码音频为 AudioBuffer
 * @param {string} url
 * @returns {Promise<AudioBuffer>}
 */
async function loadAudioBuffer(url) {
  if (audioBufferCache.has(url)) {
    return audioBufferCache.get(url);
  }
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const ctx = getOrCreateAudioContext();
  if (!ctx) throw new Error('Web Audio not supported');
  const decoded = await ctx.decodeAudioData(arrayBuffer);
  audioBufferCache.set(url, decoded);
  return decoded;
}

/**
 * Taro.InnerAudioContext 实现类
 */
class InnerAudioContext {
  constructor() {
    this.src = '';
    this.startTime = 0;
    this.autoplay = false;
    this.loop = false;
    this.obeyMuteSwitch = globalAudioOption.obeyMuteSwitch;
    this.speakerOn = globalAudioOption.speakerOn;
    this.volume = 1.0;
    this.playbackRate = 1.0;
    this.duration = 0;
    this.currentTime = 0;
    this.paused = true;
    this.buffered = 0;

    // 事件监听器注册表
    this._listeners = {
      play: new Set(),
      pause: new Set(),
      stop: new Set(),
      ended: new Set(),
      error: new Set(),
      timeUpdate: new Set(),
    };

    // 原生 HTMLAudio 元素
    this._audioEl = typeof Audio !== 'undefined' ? new Audio() : null;
    this._setupAudioElement();

    // Web Audio 节点引用
    this._sourceNode = null;
    this._gainNode = null;
  }

  _setupAudioElement() {
    if (!this._audioEl) return;
    this._audioEl.addEventListener('play', () => {
      this.paused = false;
      this._emit('play');
    });
    this._audioEl.addEventListener('pause', () => {
      this.paused = true;
      this._emit('pause');
    });
    this._audioEl.addEventListener('ended', () => {
      this.paused = true;
      this._emit('ended');
    });
    this._audioEl.addEventListener('timeupdate', () => {
      this.currentTime = this._audioEl.currentTime;
      this.duration = this._audioEl.duration || 0;
      this._emit('timeUpdate');
    });
    this._audioEl.addEventListener('error', (err) => {
      this._emit('error', err);
    });
  }

  _emit(event, ...args) {
    const handlers = this._listeners[event];
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`[InnerAudioContext] listener error on ${event}:`, e);
        }
      });
    }
  }

  /**
   * 播放音频
   */
  async play() {
    if (!this.src) {
      this._emit('error', { errMsg: 'src is empty' });
      return;
    }

    const ctx = getOrCreateAudioContext();

    // 在 iOS 静音拨片打开时或移动端环境中，优先使用 Web Audio API 解码输出
    if ((this.obeyMuteSwitch === false || this.speakerOn) && ctx) {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        if (this._sourceNode) {
          try {
            this._sourceNode.stop();
            this._sourceNode.disconnect();
          } catch {}
          this._sourceNode = null;
        }

        const buffer = await loadAudioBuffer(this.src);
        this.duration = buffer.duration;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = this.loop;
        source.playbackRate.value = this.playbackRate;

        const gainNode = ctx.createGain();
        gainNode.gain.value = this.volume;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        this._sourceNode = source;
        this._gainNode = gainNode;
        this.paused = false;

        source.onended = () => {
          if (!this.loop) {
            this.paused = true;
            this._emit('ended');
          }
        };

        source.start(0, this.startTime);
        this._emit('play');
        return;
      } catch (e) {
        console.warn('[InnerAudioContext] Web Audio 回放降级到 HTMLAudio:', e);
      }
    }

    // HTMLAudioElement 回放路径
    if (this._audioEl) {
      if (this._audioEl.src !== this.src) {
        this._audioEl.src = this.src;
      }
      this._audioEl.volume = this.volume;
      this._audioEl.loop = this.loop;
      this._audioEl.playbackRate = this.playbackRate;
      if (this.startTime > 0) {
        this._audioEl.currentTime = this.startTime;
      }
      try {
        await this._audioEl.play();
      } catch (err) {
        this._emit('error', err);
      }
    }
  }

  pause() {
    this.paused = true;
    if (this._sourceNode) {
      try {
        this._sourceNode.stop();
      } catch {}
      this._sourceNode = null;
    }
    if (this._audioEl) {
      this._audioEl.pause();
    }
    this._emit('pause');
  }

  stop() {
    this.paused = true;
    this.currentTime = 0;
    if (this._sourceNode) {
      try {
        this._sourceNode.stop();
        this._sourceNode.disconnect();
      } catch {}
      this._sourceNode = null;
    }
    if (this._audioEl) {
      this._audioEl.pause();
      this._audioEl.currentTime = 0;
    }
    this._emit('stop');
  }

  seek(position) {
    this.currentTime = position;
    if (this._audioEl) {
      this._audioEl.currentTime = position;
    }
  }

  destroy() {
    this.stop();
    Object.keys(this._listeners).forEach((key) => {
      this._listeners[key].clear();
    });
    this._audioEl = null;
  }

  onPlay(fn) {
    this._listeners.play.add(fn);
  }
  offPlay(fn) {
    this._listeners.play.delete(fn);
  }
  onPause(fn) {
    this._listeners.pause.add(fn);
  }
  offPause(fn) {
    this._listeners.pause.delete(fn);
  }
  onStop(fn) {
    this._listeners.stop.add(fn);
  }
  offStop(fn) {
    this._listeners.stop.delete(fn);
  }
  onEnded(fn) {
    this._listeners.ended.add(fn);
  }
  offEnded(fn) {
    this._listeners.ended.delete(fn);
  }
  onError(fn) {
    this._listeners.error.add(fn);
  }
  offError(fn) {
    this._listeners.error.delete(fn);
  }
  onTimeUpdate(fn) {
    this._listeners.timeUpdate.add(fn);
  }
  offTimeUpdate(fn) {
    this._listeners.timeUpdate.delete(fn);
  }
}

/**
 * 设置全局音频选项（适配 iOS 和 Android）
 * @param {{ obeyMuteSwitch?: boolean, mixWithOther?: boolean, speakerOn?: boolean }} options
 */
export function setInnerAudioOption(options = {}) {
  if (typeof options.obeyMuteSwitch === 'boolean') {
    globalAudioOption.obeyMuteSwitch = options.obeyMuteSwitch;
  }
  if (typeof options.mixWithOther === 'boolean') {
    globalAudioOption.mixWithOther = options.mixWithOther;
  }
  if (typeof options.speakerOn === 'boolean') {
    globalAudioOption.speakerOn = options.speakerOn;
  }
  console.log(
    `[Taro] setInnerAudioOption: obeyMuteSwitch=${globalAudioOption.obeyMuteSwitch}, speakerOn=${globalAudioOption.speakerOn}`
  );
}

/**
 * 创建内部音频上下文实例
 * @returns {InnerAudioContext}
 */
export function createInnerAudioContext() {
  return new InnerAudioContext();
}

/**
 * 触发长震动（400ms 强震），优先调用 Android / Web Vibration API
 */
export function vibrateLong(options = {}) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(getVibrationPattern('ring'));
    }
    if (options.success) options.success();
  } catch (e) {
    if (options.fail) options.fail(e);
  }
}

/**
 * 触发短震动（轻微触觉反馈），优先调用 Android / Web Vibration API
 */
export function vibrateShort(options = {}) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(getVibrationPattern('click'));
    }
    if (options.success) options.success();
  } catch (e) {
    if (options.fail) options.fail(e);
  }
}

/**
 * 设置屏幕是否保持常亮 (Wake Lock API)
 * 完美支持 Android Chrome 与 iOS 16.4+
 * @param {{ keepScreenOn: boolean, success?: () => void, fail?: (err: any) => void }} options
 */
export async function setKeepScreenOn(options) {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      if (options.keepScreenOn) {
        if (!wakeLockSentinel) {
          wakeLockSentinel = await navigator.wakeLock.request('screen');
          wakeLockSentinel.addEventListener('release', () => {
            wakeLockSentinel = null;
          });
        }
      } else {
        if (wakeLockSentinel) {
          await wakeLockSentinel.release();
          wakeLockSentinel = null;
        }
      }
    }
    if (options?.success) options.success();
  } catch (err) {
    console.warn('[Taro] setKeepScreenOn 失败或被系统限制:', err);
    if (options?.fail) options.fail(err);
  }
}

/**
 * 设置导航栏标题
 * @param {{ title: string }} options
 */
export function setNavigationBarTitle(options) {
  if (typeof document !== 'undefined' && options?.title) {
    document.title = options.title;
  }
}

/**
 * 弹出提示框
 * @param {{ title: string, icon?: string, duration?: number }} options
 */
export function showToast(options) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('taro-toast', { detail: options });
    window.dispatchEvent(event);
  }
}

/**
 * 获取跨平台系统与设备信息
 */
export function getSystemInfoSync() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const info = detectPlatform(ua);
  const width = typeof window !== 'undefined' ? window.innerWidth : 375;
  const height = typeof window !== 'undefined' ? window.innerHeight : 667;

  return {
    platform: info.os,
    isIOS: info.isIOS,
    isAndroid: info.isAndroid,
    system: info.label,
    windowWidth: width,
    windowHeight: height,
    screenWidth: width,
    screenHeight: height,
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2,
    hasVibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    hasWakeLock: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
  };
}

const Taro = {
  setInnerAudioOption,
  createInnerAudioContext,
  vibrateLong,
  vibrateShort,
  setKeepScreenOn,
  setNavigationBarTitle,
  showToast,
  getSystemInfoSync,
};

export default Taro;
