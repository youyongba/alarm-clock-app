/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 格式化当前日期为中文展示
 * @param {Date} [date=new Date()]
 * @returns {string} 例如 "2026年11月05日 星期四"
 */
export function formatCurrentDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const week = weekDays[date.getDay()];
  return `${year}年${month}月${day}日 ${week}`;
}

/**
 * 格式化时间为 HH:mm:ss
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function formatCurrentTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 计算距离当天或隔天指定 HH:mm 定时点的剩余秒数
 * @param {string} targetTimeStr "HH:mm"
 * @param {Date} [now=new Date()]
 * @returns {number} 剩余秒数
 */
export function getRemainingSecondsToTime(targetTimeStr, now = new Date()) {
  if (!targetTimeStr || !targetTimeStr.includes(':')) return 0;
  const parts = targetTimeStr.split(':');
  const targetHour = parseInt(parts[0], 10);
  const targetMinute = parseInt(parts[1], 10);

  if (isNaN(targetHour) || isNaN(targetMinute)) return 0;

  const targetDate = new Date(now);
  targetDate.setHours(targetHour, targetMinute, 0, 0);

  // 如果目标时间已过当前时间，顺延到次日同一时间
  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const diffMs = targetDate.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}
