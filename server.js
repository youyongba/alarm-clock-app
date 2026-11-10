/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { createWebhookHandler, deduplicator } from './server/webhook.js';
import { createAuthRouter } from './server/auth.js';
import {
  registerClient,
  unregisterClient,
  createWebhookManagerRouter,
} from './server/webhook-manager.js';

const app = express();
app.use(cors());
app.use(express.json());

// 创建主 HTTP 服务器（端口 3000，承载 Vite 前端与 API / WebSocket）
const server3000 = http.createServer(app);
const wss3000 = new WebSocketServer({ noServer: true });

// 路由 3000 端口的 WebSocket 升级请求：/ws 由番茄钟响铃服务处理，其余留给 Vite HMR
server3000.on('upgrade', (req, socket, head) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/ws') {
      wss3000.handleUpgrade(req, socket, head, (ws) => {
        wss3000.emit('connection', ws, req);
      });
    }
  } catch {
    // 忽略异常 URL
  }
});

// 另外启动一个端口 3001 监听器，确保兼容专门指向 3001 的 curl 命令
const app3001 = express();
app3001.use(cors());
app3001.use(express.json());
const server3001 = http.createServer(app3001);
const wss3001 = new WebSocketServer({ server: server3001, path: '/ws' });

/**
 * 联合广播函数：向 3000 与 3001 上的所有活跃 WebSocket 客户端推送消息
 * @param {object} data
 * @returns {number}
 */
export function broadcastToAll(data) {
  const messageStr = JSON.stringify(data);
  let count = 0;

  const sendToWss = (wss) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          count += 1;
        } catch (err) {
          console.error('[WS Broadcast Error]:', err);
        }
      }
    });
  };

  sendToWss(wss3000);
  sendToWss(wss3001);
  return count;
}

// 统一挂载健康检查与 Webhook 路由
const healthHandler = (req, res) => {
  res.json({
    ok: true,
    service: 'pomodoro-webhook-server',
    timestamp: Date.now(),
    clientsCount: wss3000.clients.size + wss3001.clients.size,
    dedupCacheSize: deduplicator.size,
  });
};

const webhookHandler = createWebhookHandler(broadcastToAll);
const webhookManagerRouter = createWebhookManagerRouter(broadcastToAll);
const authRouter = createAuthRouter();

app.get('/health', healthHandler);
app.post('/webhook/ring', webhookHandler);

// 挂载 Webhook 连接管理与测试 API
const mountWebhookManagerRoutes = (targetApp) => {
  targetApp.get('/api/webhook/status', (req, res) => webhookManagerRouter.getStatus(req, res));
  targetApp.post('/api/webhook/test-trigger', (req, res) => webhookManagerRouter.testTrigger(req, res));
  targetApp.post('/api/webhook/clear-logs', (req, res) => webhookManagerRouter.clearLogs(req, res));
  targetApp.delete('/api/webhook/logs', (req, res) => webhookManagerRouter.clearLogs(req, res));
  targetApp.post('/api/webhook/ping-clients', (req, res) => webhookManagerRouter.pingClients(req, res));
};

mountWebhookManagerRoutes(app);

// 挂载用户认证、邮箱登录与密码找回 API
const mountAuthRoutes = (targetApp) => {
  targetApp.post('/api/auth/register', (req, res) => authRouter.register(req, res));
  targetApp.post('/api/auth/login', (req, res) => authRouter.login(req, res));
  targetApp.post('/api/auth/send-code', (req, res) => authRouter.sendCode(req, res));
  targetApp.post('/api/auth/login-with-code', (req, res) => authRouter.loginWithCode(req, res));
  targetApp.post('/api/auth/forgot-password', (req, res) => authRouter.forgotPassword(req, res));
  targetApp.post('/api/auth/reset-password', (req, res) => authRouter.resetPassword(req, res));
  targetApp.get('/api/auth/me', (req, res) => authRouter.getMe(req, res));
  targetApp.post('/api/auth/update-profile', (req, res) => authRouter.updateProfile(req, res));
  targetApp.post('/api/auth/logout', (req, res) => authRouter.logout(req, res));
};

mountAuthRoutes(app);

app3001.get('/health', healthHandler);
app3001.post('/webhook/ring', webhookHandler);
mountWebhookManagerRoutes(app3001);
mountAuthRoutes(app3001);

// 客户端连接处理
function setupWssListeners(wss, label) {
  wss.on('connection', (ws, req) => {
    registerClient(ws, req, label);
    console.log(`[WebSocket ${label}] 客户端已连接，总在线: ${wss3000.clients.size + wss3001.clients.size}`);
    ws.isAlive = true;

    ws.send(
      JSON.stringify({
        type: 'connected',
        server: label,
        message: '成功连接到番茄钟 Webhook 响铃服务',
        timestamp: Date.now(),
      })
    );

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // ignore
      }
    });

    ws.on('close', () => {
      unregisterClient(ws);
      console.log(`[WebSocket ${label}] 客户端断开连接`);
    });
  });
}

setupWssListeners(wss3000, 'Port-3000');
setupWssListeners(wss3001, 'Port-3001');

// 启动 Vite 中间件（用于前端页面渲染）
async function start() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: server3000 },
        hmr: { server: server3000 },
      },
      appType: 'spa',
    });

    // 开发环境路由重写：独立访问 /web 或 /pc 映射至独立的 web.html，/mobile 或 /app 映射至 mobile.html
    app.use((req, res, next) => {
      const pathname = req.url.split('?')[0];
      if (pathname === '/web' || pathname === '/pc' || pathname.startsWith('/web/') || pathname.startsWith('/pc/')) {
        req.url = '/web.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      } else if (pathname === '/mobile' || pathname === '/app' || pathname.startsWith('/mobile/')) {
        req.url = '/mobile.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    // 生产环境独立路由静态资源映射
    app.get(['/web', '/pc', '/web/*', '/pc/*'], (req, res) => {
      res.sendFile(path.resolve('dist/web.html'));
    });
    app.get(['/mobile', '/app', '/mobile/*', '/app/*'], (req, res) => {
      res.sendFile(path.resolve('dist/mobile.html'));
    });
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  // 监听 3000（主服务）
  const PORT = parseInt(process.env.PORT || '3000', 10);
  server3000.listen(PORT, '0.0.0.0', () => {
    console.log(`🍅 [Dev Server] 主应用已就绪: http://localhost:${PORT}`);
    console.log(`   - Webhook 路由: POST http://localhost:${PORT}/webhook/ring`);
    console.log(`   - WebSocket: ws://localhost:${PORT}/ws`);
  });

  // 如果主端口不是 3001，则同时在 3001 开启独立服务，支持提示词指定的 curl 命令
  if (PORT !== 3001) {
    server3001.listen(3001, '0.0.0.0', () => {
      console.log(`🔔 [Webhook Standalone] 3001 端口服务已就绪: http://localhost:3001`);
      console.log(`   - 兼容命令: curl -X POST http://localhost:3001/webhook/ring ...`);
    });
    server3001.on('error', (err) => {
      // 若 3001 端口已被占用，静默处理并继续使用 3000
      console.warn(`[Port 3001] 无法绑定 (可能已在运行): ${err.message}`);
    });
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
