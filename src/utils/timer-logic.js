/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 番茄钟阶段预设时长（秒）
 */
export const PHASE_CONFIG = {
  focus: {
    name: '专注',
    duration: 25 * 60, // 25 分钟
    color: '#E74C3C',
    titlePrefix: '专注中',
  },
  shortBreak: {
    name: '短休息',
    duration: 5 * 60, // 5 分钟
    color: '#27AE60',
    titlePrefix: '休息中',
  },
  longBreak: {
    name: '长休息',
    duration: 15 * 60, // 15 分钟
    color: '#2980B9',
    titlePrefix: '长休息中',
  },
};

/**
 * 格式化秒数为 mm:ss
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * 计算剩余进度比例 (0.0 到 1.0)
 * @param {number} timeLeft
 * @param {number} totalDuration
 * @returns {number}
 */
export function calculateProgress(timeLeft, totalDuration) {
  if (!totalDuration || totalDuration <= 0) return 0;
  const progress = (totalDuration - Math.max(0, timeLeft)) / totalDuration;
  return Math.min(1, Math.max(0, progress));
}

/**
 * 确定下一个番茄阶段
 * 每完成 4 个专注阶段进入一次长休息，否则进入短休息
 * @param {'focus' | 'shortBreak' | 'longBreak'} currentPhase
 * @param {number} completedFocusCount
 * @returns {{ nextPhase: 'focus' | 'shortBreak' | 'longBreak', updatedCount: number }}
 */
export function getNextPhase(currentPhase, completedFocusCount) {
  if (currentPhase === 'focus') {
    const newCount = completedFocusCount + 1;
    if (newCount % 4 === 0) {
      return { nextPhase: 'longBreak', updatedCount: newCount };
    }
    return { nextPhase: 'shortBreak', updatedCount: newCount };
  }
  // 如果是从短休息或长休息结束，下一个必定是专注阶段
  return { nextPhase: 'focus', updatedCount: completedFocusCount };
}
