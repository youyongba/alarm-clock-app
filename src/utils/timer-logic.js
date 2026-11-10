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

export const SESSION_STORAGE_KEY = 'pomodoro_active_session';

/**
 * 根据目标结束时间戳计算剩余秒数
 * @param {number | null} targetEndTime 目标时间毫秒时间戳
 * @param {number} [now] 当前时间戳
 * @returns {number} 剩余秒数
 */
export function calculateRemainingSeconds(targetEndTime, now = Date.now()) {
  if (!targetEndTime || typeof targetEndTime !== 'number') return 0;
  return Math.max(0, Math.round((targetEndTime - now) / 1000));
}

/**
 * 恢复持久化会话状态
 * @param {object | null} saved 存储的对象
 * @param {number} [now] 当前时间戳
 * @returns {{ phase: 'focus'|'shortBreak'|'longBreak', status: 'idle'|'running'|'paused'|'completed', timeLeft: number, targetEndTime: number|null, completedPomodoros: number }}
 */
export function restoreSessionState(saved, now = Date.now()) {
  const defaultPhase = 'focus';
  const defaultDuration = PHASE_CONFIG[defaultPhase].duration;

  if (!saved || typeof saved !== 'object') {
    return {
      phase: defaultPhase,
      status: 'idle',
      timeLeft: defaultDuration,
      targetEndTime: null,
      completedPomodoros: 0,
    };
  }

  const phase = PHASE_CONFIG[saved.phase] ? saved.phase : defaultPhase;
  const completedPomodoros = typeof saved.completedPomodoros === 'number' ? saved.completedPomodoros : 0;
  const phaseDuration = PHASE_CONFIG[phase].duration;

  if (saved.status === 'running' && typeof saved.targetEndTime === 'number') {
    const remaining = calculateRemainingSeconds(saved.targetEndTime, now);
    if (remaining > 0) {
      return {
        phase,
        status: 'running',
        timeLeft: remaining,
        targetEndTime: saved.targetEndTime,
        completedPomodoros,
      };
    }
    // 已在后台运行到达时间
    return {
      phase,
      status: 'completed',
      timeLeft: 0,
      targetEndTime: null,
      completedPomodoros,
    };
  }

  if (saved.status === 'paused') {
    const remaining = typeof saved.timeLeft === 'number' && saved.timeLeft > 0 ? saved.timeLeft : phaseDuration;
    return {
      phase,
      status: 'paused',
      timeLeft: remaining,
      targetEndTime: null,
      completedPomodoros,
    };
  }

  return {
    phase,
    status: 'idle',
    timeLeft: typeof saved.timeLeft === 'number' && saved.timeLeft > 0 ? saved.timeLeft : phaseDuration,
    targetEndTime: null,
    completedPomodoros,
  };
}

