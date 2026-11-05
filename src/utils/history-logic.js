/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 响铃与 Webhook 触发历史记录纯逻辑模块
 */

/**
 * 创建一条标准响铃记录
 * @param {object} params
 * @param {'webhook' | 'pomodoro' | 'timer' | 'alarm' | 'test'} params.category 触发来源分类
 * @param {string} [params.eventId] Webhook 事件唯一ID
 * @param {string} [params.source] 触发来源（如 'curl', 'GitHub Actions', '系统'）
 * @param {string} params.message 提示文案
 * @param {number} [params.durationMs=5000] 响铃时长（毫秒）
 * @param {string} [params.sound='ring'] 音效名称
 * @param {boolean} [params.isDuplicate=false] 是否为幂等去重命中
 * @param {number} [params.timestamp=Date.now()] 触发时间戳
 * @returns {object} 标准记录对象
 */
export function createRingRecord(params) {
  const now = params.timestamp || Date.now();
  const id = params.eventId || `ring-${now}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    category: params.category || 'webhook', // 'webhook' | 'pomodoro' | 'timer' | 'alarm' | 'test'
    eventId: params.eventId || id,
    source: params.source || (params.category === 'webhook' ? '外部系统' : '本地系统'),
    message: params.message || '响铃事件',
    durationMs: typeof params.durationMs === 'number' ? params.durationMs : 5000,
    sound: params.sound || 'ring',
    isDuplicate: Boolean(params.isDuplicate),
    timestamp: now,
  };
}

/**
 * 按分类过滤记录
 * @param {Array<object>} records
 * @param {'all' | 'webhook' | 'timer'} filterType
 * @returns {Array<object>}
 */
export function filterRecords(records = [], filterType = 'all') {
  if (!Array.isArray(records)) return [];
  if (filterType === 'all') return records;
  if (filterType === 'webhook') {
    return records.filter((r) => r.category === 'webhook');
  }
  if (filterType === 'timer') {
    return records.filter((r) => ['pomodoro', 'timer', 'alarm', 'test'].includes(r.category));
  }
  return records;
}

/**
 * 格式化相对时间或中文时间
 * @param {number} timestamp
 * @param {number} [currentNow=Date.now()]
 * @returns {string} 例如 "刚刚", "2分钟前", "14:20:05"
 */
export function formatTriggerTime(timestamp, currentNow = Date.now()) {
  if (!timestamp) return '--:--:--';
  const diffSec = Math.floor((currentNow - timestamp) / 1000);

  if (diffSec < 10) return '刚刚';
  if (diffSec < 60) return `${diffSec}秒前`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`;

  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
