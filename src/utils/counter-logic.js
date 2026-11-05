/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 计数器纯逻辑模块
 */

/**
 * 创建默认计数器列表
 * @returns {Array<{ id: string, name: string, icon: string, count: number, target: number, step: number }>}
 */
export function getDefaultCounters() {
  return [
    { id: 'pomodoro', name: '今日番茄', icon: '🍅', count: 0, target: 8, step: 1 },
    { id: 'water', name: '喝水打卡', icon: '💧', count: 0, target: 8, step: 1 },
    { id: 'standup', name: '起身活动', icon: '🚶', count: 0, target: 6, step: 1 },
    { id: 'custom', name: '自选计数', icon: '✨', count: 0, target: 10, step: 1 },
  ];
}

/**
 * 更新计数器数值
 * @param {number} currentCount
 * @param {number} delta 增量 (+1, -1, +5 等)
 * @param {number} [min=0] 最小值
 * @returns {number}
 */
export function updateCounter(currentCount, delta, min = 0) {
  const result = currentCount + delta;
  return Math.max(min, result);
}

/**
 * 计算目标完成百分比 (0 ~ 100)
 * @param {number} count
 * @param {number} target
 * @returns {number}
 */
export function calculateCounterProgress(count, target) {
  if (!target || target <= 0) return 0;
  const percent = Math.round((count / target) * 100);
  return Math.min(100, Math.max(0, percent));
}
