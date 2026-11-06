/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createWebhookHandler } from './webhook.js';
import { createAuthRouter } from './auth.js';

const app = express();

// 允许跨域请求，方便 Taro H5、开发预览以及外部调用
app.use(cors());
app.use(express.json());

// 创建 HTTP 服务器与 WebSocket 服务器
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/**
 * 向所有已连接的活跃客户端广播数据
 * @param {object} data
 * @returns {number} 成功接收的客户端数量
 */
export function broadcast(data) {
  const messageStr = JSON.stringify(data);
  let activeClients = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
        activeClients += 1;
      } catch (err) {
        console.error('[WebSocket] 发送消息失败:', err);
      }
    }
  });

  return activeClients;
}

// 注册健康检查
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'pomodoro-webhook-server',
    timestamp: Date.now(),
    wsClientsCount: wss.clients.size,
  });
});

// 注册 Webhook 接口
app.post('/webhook/ring', createWebhookHandler(broadcast));

// 注册用户认证 API
const authRouter = createAuthRouter();
app.post('/api/auth/register', (req, res) => authRouter.register(req, res));
app.post('/api/auth/login', (req, res) => authRouter.login(req, res));
app.post('/api/auth/send-code', (req, res) => authRouter.sendCode(req, res));
app.post('/api/auth/login-with-code', (req, res) => authRouter.loginWithCode(req, res));
app.post('/api/auth/forgot-password', (req, res) => authRouter.forgotPassword(req, res));
app.post('/api/auth/reset-password', (req, res) => authRouter.resetPassword(req, res));
app.get('/api/auth/me', (req, res) => authRouter.getMe(req, res));
app.post('/api/auth/update-profile', (req, res) => authRouter.updateProfile(req, res));
app.post('/api/auth/logout', (req, res) => authRouter.logout(req, res));

// WebSocket 连接生命周期管理
wss.on('connection', (ws, req) => {
  const remoteIp = req.socket.remoteAddress;
  console.log(`[WebSocket] 新客户端连接成功 (${remoteIp}), 当前在线客户端数: ${wss.clients.size}`);

  // 发送欢迎与心跳包
  ws.send(
    JSON.stringify({
      type: 'connected',
      message: '成功连接到番茄钟 Webhook 响铃服务',
      timestamp: Date.now(),
      clientsOnline: wss.clients.size,
    })
  );

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // 忽略普通字符串输入
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] 客户端断开连接, 剩余在线数: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket 错误]:', err);
  });
});

// 定时心跳清理假死连接（30秒一次）
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[WebSocket] 检测到僵尸连接，执行清理断开');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

export { app, server, wss };

// 当直接通过 node server/index.js 启动时执行监听
const isDirectRun = process.argv[1]?.endsWith('server/index.js') || process.argv[1]?.endsWith('server/index');
if (isDirectRun) {
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🍅 [Pomodoro Webhook Server] 正在监听端口: http://0.0.0.0:${PORT}`);
    console.log(`   - 健康检查: http://localhost:${PORT}/health`);
    console.log(`   - Webhook 接口: POST http://localhost:${PORT}/webhook/ring`);
    console.log(`   - WebSocket 地址: ws://localhost:${PORT}/ws`);
    console.log(`   - 默认 X-Webhook-Token: ${process.env.WEBHOOK_TOKEN || 'dev-token'}`);
  });
}
