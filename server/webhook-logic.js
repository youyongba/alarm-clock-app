/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 校验 Webhook Token
 * @param {string | undefined} providedToken 请求头 X-Webhook-Token
 * @param {string} expectedToken 环境变量中的合法 Token
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateToken(providedToken, expectedToken) {
  if (!providedToken) {
    return { valid: false, error: '缺少 X-Webhook-Token 请求头' };
  }
  if (providedToken !== expectedToken) {
    return { valid: false, error: 'X-Webhook-Token 无效或已过期' };
  }
  return { valid: true };
}

/**
 * 运行时校验 Webhook Payload
 * @param {any} body
 * @returns {{ valid: boolean, error?: string, sanitized?: object }}
 */
export function validateWebhookPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: '请求体必须是 JSON 对象' };
  }

  const { eventId, source, message, durationMs, sound, mode } = body;

  if (typeof eventId !== 'string' || eventId.trim() === '') {
    return { valid: false, error: '字段 eventId 必须为非空字符串' };
  }

  if (typeof message !== 'string' || message.trim() === '') {
    return { valid: false, error: '字段 message 必须为非空字符串' };
  }

  let finalDuration = 5000;
  if (durationMs !== undefined) {
    if (typeof durationMs !== 'number' || isNaN(durationMs) || durationMs <= 0) {
      return { valid: false, error: '字段 durationMs 必须为正整数（毫秒）' };
    }
    finalDuration = Math.min(30000, Math.max(1000, Math.floor(durationMs)));
  }

  return {
    valid: true,
    sanitized: {
      eventId: eventId.trim(),
      source: typeof source === 'string' && source.trim() ? source.trim() : 'webhook',
      message: message.trim(),
      durationMs: finalDuration,
      sound: typeof sound === 'string' && sound.trim() ? sound.trim() : 'ring',
      mode: typeof mode === 'string' && mode.trim() ? mode.trim() : 'ring',
      receivedAt: Date.now(),
    },
  };
}

/**
 * 内存幂等去重管理器，最多保留最近 1000 条
 */
export class EventDeduplicator {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  /**
   * 检查并存入事件
   * @param {string} eventId
   * @param {object} payload
   * @returns {{ isDuplicate: boolean, event: object }}
   */
  checkAndStore(eventId, payload) {
    if (this.map.has(eventId)) {
      return {
        isDuplicate: true,
        event: this.map.get(eventId),
      };
    }

    // 若容量超出，淘汰最老的一条（Map 遍历顺序按插入顺序）
    if (this.map.size >= this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }

    const record = { ...payload, processedAt: Date.now() };
    this.map.set(eventId, record);

    return {
      isDuplicate: false,
      event: record,
    };
  }

  get size() {
    return this.map.size;
  }

  clear() {
    this.map.clear();
  }
}
