/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { validateToken, validateWebhookPayload, EventDeduplicator } from './webhook-logic.js';

// 全局事件去重管理器，最多保留 1000 条
export const deduplicator = new EventDeduplicator(1000);

// 在线客户端存储映射: wsInstance -> clientMeta
const clientsMap = new Map();

// 最近收到的 Webhook 调用审计日志，最多保留 100 条
const webhookLogs = [];

/**
 * 注册 WebSocket 客户端
 * @param {import('ws').WebSocket} ws
 * @param {import('http').IncomingMessage} req
 * @param {string} serverLabel
 * @returns {string} 客户端ID
 */
export function registerClient(ws, req, serverLabel = 'Port-3000') {
  const clientId = `client_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const ip = req?.socket?.remoteAddress || req?.headers['x-forwarded-for'] || '127.0.0.1';
  const ua = req?.headers['user-agent'] || 'App / Browser Client';

  // 解析简要平台标识
  let platform = 'Web 桌面端';
  if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS APP / 浏览器';
  else if (/Android/i.test(ua)) platform = 'Android APP / 微信';
  else if (/Macintosh/i.test(ua)) platform = 'macOS 桌面端';
  else if (/Windows/i.test(ua)) platform = 'Windows 桌面端';

  const clientMeta = {
    id: clientId,
    ip: ip.replace(/^::ffff:/, ''),
    platform,
    userAgent: ua,
    connectedAt: Date.now(),
    server: serverLabel,
    ws,
  };

  clientsMap.set(ws, clientMeta);

  ws.on('close', () => {
    clientsMap.delete(ws);
  });

  return clientId;
}

/**
 * 移除客户端
 * @param {import('ws').WebSocket} ws
 */
export function unregisterClient(ws) {
  clientsMap.delete(ws);
}

/**
 * 获取当前所有已连接客户端信息列表（去除不可序列化的 ws 实例）
 * @returns {Array<object>}
 */
export function getActiveClientsList() {
  const list = [];
  const now = Date.now();
  for (const [, meta] of clientsMap.entries()) {
    list.push({
      id: meta.id,
      ip: meta.ip,
      platform: meta.platform,
      server: meta.server,
      connectedAt: meta.connectedAt,
      onlineDurationSec: Math.floor((now - meta.connectedAt) / 1000),
    });
  }
  return list;
}

/**
 * 记录一条 Webhook 日志
 * @param {object} logItem
 */
export function recordWebhookLog(logItem) {
  webhookLogs.unshift({
    id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: Date.now(),
    ...logItem,
  });

  if (webhookLogs.length > 100) {
    webhookLogs.pop();
  }
}

/**
 * 获取 Webhook 调用历史日志
 * @returns {Array<object>}
 */
export function getWebhookLogs() {
  return [...webhookLogs];
}

/**
 * 清空 Webhook 调用历史日志
 */
export function clearWebhookLogs() {
  webhookLogs.length = 0;
}

/**
 * 创建综合 Webhook 管理路由处理器
 * @param {(data: object) => number} broadcastFn 全局广播函数
 */
export function createWebhookManagerRouter(broadcastFn) {
  return {
    /**
     * GET /api/webhook/status
     * 获取 Webhook 服务器实时连接数、客户端列表、去重数及日志
     */
    getStatus(req, res) {
      const activeClients = getActiveClientsList();
      res.json({
        ok: true,
        clientsCount: activeClients.length,
        activeClients,
        dedupSize: deduplicator.size,
        totalLogsCount: webhookLogs.length,
        recentLogs: webhookLogs.slice(0, 30),
        defaultToken: process.env.WEBHOOK_TOKEN || 'dev-token',
        timestamp: Date.now(),
      });
    },

    /**
     * POST /api/webhook/test-trigger
     * 从 PC 控制台手动测试触发 Webhook 响铃
     */
    testTrigger(req, res) {
      try {
        const body = req.body || {};
        const eventId = body.eventId || `pc-test-${Date.now().toString().slice(-6)}`;
        const message = body.message || 'PC 控制台手动测试响铃';
        const source = body.source || 'PC 控制台';
        const durationMs = Math.min(30000, Math.max(1000, Number(body.durationMs) || 5000));
        const sound = body.sound || 'ring';
        const mode = body.mode || 'ring';

        const payload = {
          eventId,
          source,
          message,
          durationMs,
          sound,
          mode,
          receivedAt: Date.now(),
        };

        const dedupResult = deduplicator.checkAndStore(eventId, payload);
        if (dedupResult.isDuplicate) {
          recordWebhookLog({
            eventId,
            source,
            message,
            durationMs,
            sound,
            clientsNotified: 0,
            isDuplicate: true,
            status: 'deduplicated',
            clientIp: req.ip || '127.0.0.1',
          });

          return res.json({
            ok: true,
            duplicate: true,
            message: '该 eventId 已存在，被幂等去重器过滤（不重复响铃）',
            eventId,
            clientsNotified: 0,
          });
        }

        const broadcastPayload = {
          type: 'ring',
          ...payload,
        };

        const notifiedCount = typeof broadcastFn === 'function' ? broadcastFn(broadcastPayload) : 0;

        recordWebhookLog({
          eventId,
          source,
          message,
          durationMs,
          sound,
          clientsNotified: notifiedCount,
          isDuplicate: false,
          status: 'broadcasted',
          clientIp: req.ip || '127.0.0.1',
        });

        return res.json({
          ok: true,
          duplicate: false,
          message: '响铃已成功广播至在线设备',
          eventId,
          clientsNotified: notifiedCount,
          broadcastPayload,
        });
      } catch (err) {
        return res.status(500).json({ ok: false, message: err?.message || '触发失败' });
      }
    },

    /**
     * POST /api/webhook/clear-logs
     * 清空调用日志
     */
    clearLogs(req, res) {
      clearWebhookLogs();
      res.json({ ok: true, message: 'Webhook 历史调用日志已清空' });
    },

    /**
     * POST /api/webhook/ping-clients
     * 广播 Ping 心跳测试
     */
    pingClients(req, res) {
      const pingData = { type: 'ping', timestamp: Date.now(), source: 'PC 控制台' };
      const count = typeof broadcastFn === 'function' ? broadcastFn(pingData) : 0;
      res.json({ ok: true, message: `已向 ${count} 台在线客户端发送心跳测试包`, notified: count });
    },
  };
}
