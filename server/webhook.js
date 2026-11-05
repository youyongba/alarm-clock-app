/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateToken, validateWebhookPayload, EventDeduplicator } from './webhook-logic.js';

// 全局事件去重器，最大保留 1000 条
export const deduplicator = new EventDeduplicator(1000);

/**
 * 创建 Webhook 处理函数
 * @param {(data: object) => number} broadcastFn 广播函数，返回成功接收广播的客户端数量
 * @returns {import('express').RequestHandler}
 */
export function createWebhookHandler(broadcastFn) {
  const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || 'dev-token';

  return (req, res) => {
    try {
      const token = req.headers['x-webhook-token'];
      const tokenCheck = validateToken(token, WEBHOOK_TOKEN);

      if (!tokenCheck.valid) {
        console.warn(`[Webhook 401] 鉴权失败: ${tokenCheck.error}, Client IP: ${req.ip}`);
        return res.status(401).json({
          error: tokenCheck.error,
          hint: '请在请求头携带正确的 X-Webhook-Token',
        });
      }

      const payloadCheck = validateWebhookPayload(req.body);
      if (!payloadCheck.valid) {
        console.warn(`[Webhook 400] 参数无效: ${payloadCheck.error}, Body:`, req.body);
        return res.status(400).json({
          error: payloadCheck.error,
        });
      }

      const sanitized = payloadCheck.sanitized;
      const dedupResult = deduplicator.checkAndStore(sanitized.eventId, sanitized);

      if (dedupResult.isDuplicate) {
        console.log(
          `[Webhook 去重] eventId: "${sanitized.eventId}" 之前已处理，跳过重复广播 (当前去重缓存: ${deduplicator.size}条)`
        );
        return res.status(200).json({
          ok: true,
          duplicate: true,
          message: '事件已处理（幂等去重生效，不重复广播）',
          eventId: sanitized.eventId,
        });
      }

      // 组装 WebSocket 广播载荷
      const broadcastPayload = {
        type: 'ring',
        eventId: sanitized.eventId,
        source: sanitized.source,
        message: sanitized.message,
        durationMs: sanitized.durationMs,
        sound: sanitized.sound,
        mode: sanitized.mode,
        receivedAt: sanitized.receivedAt,
      };

      const clientCount = typeof broadcastFn === 'function' ? broadcastFn(broadcastPayload) : 0;

      console.log(
        `[Webhook 广播成功] eventId: "${sanitized.eventId}", message: "${sanitized.message}", 时长: ${sanitized.durationMs}ms, 已广播至 ${clientCount} 个活跃客户端`
      );

      return res.status(200).json({
        ok: true,
        duplicate: false,
        eventId: sanitized.eventId,
        message: '响铃指令已接收并成功广播',
        clientsNotified: clientCount,
        broadcastData: broadcastPayload,
      });
    } catch (err) {
      console.error('[Webhook 500] 内部错误:', err);
      return res.status(500).json({
        error: '服务端异常，无法处理 Webhook 请求',
        details: err?.message || String(err),
      });
    }
  };
}
