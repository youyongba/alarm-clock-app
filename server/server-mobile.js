/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createWebhookHandler } from './webhook.js';
import { createAuthRouter } from './auth.js';
import {
  registerClient,
  unregisterClient,
  createWebhookManagerRouter,
} from './webhook-manager.js';

/**
 * 移动端独立部署 HTTP + WebSocket 服务器
 */
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

export function broadcast(data) {
  const messageStr = JSON.stringify(data);
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
        count += 1;
      } catch (err) {
        console.error('[WS Mobile Broadcast Error]:', err);
      }
    }
  });
  return count;
}

const webhookHandler = createWebhookHandler(broadcast);
const webhookManager = createWebhookManagerRouter(broadcast);
const authRouter = createAuthRouter();

// 基础健康检查
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'pomodoro-mobile-app-server',
    mode: 'mobile-standalone',
    timestamp: Date.now(),
    wsClientsCount: wss.clients.size,
  });
});

// API 路由
app.post('/webhook/ring', webhookHandler);
app.get('/api/webhook/status', (req, res) => webhookManager.getStatus(req, res));
app.post('/api/webhook/test-trigger', (req, res) => webhookManager.testTrigger(req, res));
app.post('/api/webhook/clear-logs', (req, res) => webhookManager.clearLogs(req, res));
app.post('/api/webhook/ping-clients', (req, res) => webhookManager.pingClients(req, res));

app.post('/api/auth/register', (req, res) => authRouter.register(req, res));
app.post('/api/auth/login', (req, res) => authRouter.login(req, res));
app.post('/api/auth/send-code', (req, res) => authRouter.sendCode(req, res));
app.post('/api/auth/login-with-code', (req, res) => authRouter.loginWithCode(req, res));
app.post('/api/auth/forgot-password', (req, res) => authRouter.forgotPassword(req, res));
app.post('/api/auth/reset-password', (req, res) => authRouter.resetPassword(req, res));
app.get('/api/auth/me', (req, res) => authRouter.getMe(req, res));
app.post('/api/auth/update-profile', (req, res) => authRouter.updateProfile(req, res));
app.post('/api/auth/logout', (req, res) => authRouter.logout(req, res));

// WebSocket 客户端事件
wss.on('connection', (ws, req) => {
  registerClient(ws, req, 'Mobile-Server');
  ws.isAlive = true;
  ws.send(
    JSON.stringify({
      type: 'connected',
      server: 'Mobile-Server',
      message: '成功连接到移动端专属番茄钟 Webhook 服务',
      timestamp: Date.now(),
    })
  );

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    unregisterClient(ws);
  });
});

// 静态资源与移动端专属 SPA Fallback
app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(path.resolve('dist/index.html'));
});

const isDirectRun =
  process.argv[1]?.endsWith('server-mobile.js') ||
  process.argv[1]?.endsWith('server-mobile');

if (isDirectRun) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`📱 [Mobile Standalone Server] 移动端独立服务已就绪: http://localhost:${PORT}`);
    console.log(`   - Webhook 路由: POST http://localhost:${PORT}/webhook/ring`);
    console.log(`   - WebSocket: ws://localhost:${PORT}/ws`);
  });
}

export { app, server, wss };
