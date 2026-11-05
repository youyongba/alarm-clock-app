/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 跨平台环境与设备特性检测纯逻辑
 */

/**
 * 检测操作系统与平台类型
 * @param {string} [userAgent]
 * @returns {{ os: 'ios' | 'android' | 'desktop', isIOS: boolean, isAndroid: boolean, isWeChat: boolean, label: string }}
 */
export function detectPlatform(userAgent = '') {
  const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isWeChat = /MicroMessenger/i.test(ua);

  let os = 'desktop';
  let label = '桌面端 Web';

  if (isIOS) {
    os = 'ios';
    label = isWeChat ? 'iOS 微信环境' : 'iOS Safari / Web';
  } else if (isAndroid) {
    os = 'android';
    label = isWeChat ? 'Android 微信环境' : 'Android Chrome / Web';
  }

  return {
    os,
    isIOS,
    isAndroid,
    isWeChat,
    label,
  };
}

/**
 * 获取适用于当前平台的振动模式（毫秒数组）
 * @param {'ring' | 'click' | 'complete'} type
 * @returns {number[]} 振动毫秒模式
 */
export function getVibrationPattern(type) {
  switch (type) {
    case 'ring':
      // 警报急促交替震动：200ms震动 - 100ms停顿 - 200ms震动 - 100ms停顿 - 400ms强震
      return [200, 100, 200, 100, 400, 100, 400];
    case 'complete':
      // 任务完成舒缓震动
      return [150, 80, 250];
    case 'click':
    default:
      // 轻微触觉反馈
      return [35];
  }
}
