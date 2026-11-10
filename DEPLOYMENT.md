# 🍅 番茄响铃器 (Pomodoro Webhook) 架构、目录结构与部署起动指南

本文档详细说明了番茄风格 Webhook 响铃器项目的**解耦目录结构**、**本地开发启动**以及**生产环境多种部署方案**（单端口全功能部署、多端口物理隔离独立部署、PM2 守护与 Nginx 反代配置）。

---

## 目录索引

- [一、项目架构与解耦设计](#一项目架构与解耦设计)
- [二、完整工程目录结构说明](#二完整工程目录结构说明)
- [三、本地起动指南 (Development)](#三本地起动指南-development)
  - [1. 安装依赖](#1-安装依赖)
  - [2. 快捷启动命令](#2-快捷启动命令)
  - [3. 自动化测试](#3-自动化测试)
- [四、生产构建指南 (Build)](#四生产构建指南-build)
- [五、生产部署方案 (Deployment)](#五生产部署方案-deployment)
  - [方案 A：单实例融合部署 (推荐，极简运维)](#方案-a单实例融合部署-推荐极简运维)
  - [方案 B：移动端与 Web 端物理隔离独立部署](#方案-b移动端与-web-端物理隔离独立部署)
  - [方案 C：PM2 进程守护配置](#方案-cpm2-进程守护配置)
  - [方案 D：Nginx 反向代理与 SSL 配置](#方案-dnginx-反向代理与-ssl-配置)
  - [方案 E：Docker 容器化部署](#方案-edocker-容器化部署)
- [六、环境变量与网络端口一览表](#六环境变量与网络端口一览表)
- [七、Webhook 对接与排错说明](#七webhook-对接与排错说明)

---

## 一、项目架构与解耦设计

本项目采用**前端页面解耦**与**后端服务模块化**架构：

1. **页面与业务解耦**：
   - 移动端 App（专注番茄钟、定点闹钟、打卡计数、骑行热量、移动端个人中心）完全隔离在 `src/mobile/` 下。
   - Web / PC 控制台（WebSocket 设备大盘、Webhook 模拟触发器、调用审计日志、多语言代码生成、Token 管理）完全隔离在 `src/web/` 下。
   - 顶层由 `src/pages/index/index.jsx` 路由中心根据用户访问设备或 URL 路径实现平滑分发与一键互切。
2. **多页面静态入口**：
   - `index.html`：自适应双端主入口。
   - `mobile.html`：纯移动端独立宿主页。
   - `web.html`：纯 Web 控制台独立宿主页。
3. **服务端解耦分发**：
   - `server.js`：单端口全栈主服务（集成 Vite 开发中间件、HTTP API、静态资源托管与 WebSocket 广播）。
   - `server/server-mobile.js`：专用于移动端独立起动和部署的服务实例。
   - `server/server-web.js`：专用于 Web 控制台独立起动和部署的服务实例。

---

## 二、完整工程目录结构说明

```text
├── index.html                   # 统一全功能入口 HTML
├── mobile.html                  # 移动端 APP 独立宿主 HTML
├── web.html                     # Web / PC 控制台独立宿主 HTML
├── vite.config.js               # Vite 8 多页面构建与 Taro 别名配置
├── package.json                 # 项目依赖与各类起动/打包脚本定义
├── server.js                    # 全功能主服务入口（Port 3000）
│
├── server/                      # 🛠️ 后端服务与 API 实现
│   ├── index.js                 # 独立后端 API + WebSocket 服务（默认端口 3001）
│   ├── server-mobile.js         # 移动端独立部署 Express 实例
│   ├── server-web.js            # Web 控制台独立部署 Express 实例
│   ├── webhook.js               # Webhook 核心路由 (POST /webhook/ring, 状态与日志接口)
│   ├── webhook-logic.js         # 纯逻辑：内存幂等去重 (FIFO 1000条)、格式校验、客户端注册
│   ├── webhook-logic.test.js    # Webhook 路由与去重算法单元测试
│   ├── auth.js                  # 账户服务 (注册、登录、修改资料、密码找回验证码)
│   ├── auth.test.js             # 账户与会话管理单元测试
│   └── server-deployment.test.js# 独立部署服务可用性单元测试
│
├── src/
│   ├── index.css                # 全局样式（Tailwind CSS + 6px 优雅纤细自定义滚动条）
│   ├── main.jsx                 # 统一主入口
│   ├── main-mobile.jsx          # 移动端专属入口文件
│   ├── main-web.jsx             # Web 控制台专属入口文件
│   │
│   ├── mobile/                  # 📱 移动端页面及子模块
│   │   ├── MobileApp.jsx        # 移动端主界面（六大功能聚合、全局响铃监听）
│   │   └── components/
│   │       ├── MobileHeader.jsx # 移动端顶栏（状态徽标、已连接台数、登录与切换 PC）
│   │       ├── MobileNav.jsx    # 功能导航栏（番茄钟/闹钟/打卡/骑行/记录/我的）
│   │       ├── QuickActions.jsx # 快捷操作条（静音穿透发声测试、屏幕常亮保持）
│   │       └── DevPanel.jsx     # 开发者调试与 WSS 诊断折叠卡片
│   │
│   ├── web/                     # 💻 Web / PC 控制台页面及子模块
│   │   ├── WebApp.jsx           # PC 控制台主界面（选项卡切换、音频试听、状态轮询）
│   │   └── components/
│   │       ├── WebHeader.jsx    # 控制台顶栏（服务健康指标、登录/注册、切换移动端）
│   │       ├── ClientsPanel.jsx # [TAB 1] 实时在线 WebSocket 客户端列表与心跳 Ping
│   │       ├── TriggerPanel.jsx # [TAB 2] Webhook 模拟触发器（预设文案、即时响铃测试）
│   │       ├── LogsPanel.jsx    # [TAB 3] 审计日志面板（状态筛选、关键词搜索、清空日志）
│   │       ├── CodeGenPanel.jsx # [TAB 4] 接口对接代码生成器 (cURL, Node.js, Python, Go)
│   │       └── WebProfilePanel.jsx # [TAB 5] 账户管理（双端同步统计、专属 Token 复制管理）
│   │
│   ├── pages/                   # 📄 页面路由层
│   │   └── index/
│   │       ├── index.jsx        # 路由总调度层（根据 URL 智能分发至 MobileApp 或 WebApp）
│   │       └── index.scss       # 番茄红与奶油黄暖色主题样式
│   │
│   ├── components/              # 🧩 跨端共享通用 UI 组件
│   │   ├── PomodoroTimer.jsx    # 番茄钟 SVG 动态进度环与倒计时控制
│   │   ├── CurrentClock.jsx     # 实时数字时钟与日期显示
│   │   ├── CustomTimer.jsx      # 定点闹钟与快速倒计时
│   │   ├── TallyCounter.jsx     # 多目标打卡计数器
│   │   ├── CyclingCalculator.jsx# 骑行燃脂卡路里与 BMI 计算器
│   │   ├── RingHistory.jsx      # 历史响铃与触发事件记录
│   │   ├── RingBanner.jsx       # 顶部全屏红色脉冲高优先级响铃浮层
│   │   ├── AuthModal.jsx        # 账号登录/注册/找回密码弹窗
│   │   ├── UserProfile.jsx      # 移动端“我的”用户中心
│   │   ├── PcDashboard.jsx      # PC 控制台兼容导出组件（委托至 WebApp）
│   │   └── WebDashboardApp.jsx  # 独立 Web 应用包装组件
│   │
│   ├── services/                # 🔌 基础服务层
│   │   ├── audio.js             # Web Audio + HTML5 Audio 静音穿透发声引擎
│   │   ├── websocket.js         # WebSocket 连接池、指数退避重连与消息订阅
│   │   ├── auth.js              # 用户认证、Token 保存与会话订阅
│   │   └── taro-shim.js         # 跨平台 Taro API Web 垫片
│   │
│   ├── utils/                   # 🧮 纯业务逻辑与单测
│   │   ├── routing-logic.js     # 路由模式解析纯函数（解析 pathname / query / env）
│   │   ├── routing-logic.test.js# 路由决策单元测试
│   │   ├── timer-logic.js       # 番茄钟倒计时与阶段推进逻辑
│   │   ├── auth-logic.js        # 邮箱验证、验证码校验与用户预设
│   │   ├── cycling-logic.js     # MET 标准骑行卡路里计算算法
│   │   ├── history-logic.js     # 响铃历史记录过滤与格式化
│   │   └── counter-logic.js     # 计数器防负数算法与进度统计
│   │
│   └── assets/
│       └── audio/               # 🔔 本地内置音频文件 (ring.mp3, focus-end.mp3, break-end.mp3)
```

---

## 三、本地起动指南 (Development)

### 1. 安装依赖

进入项目根目录执行：

```bash
npm install
```

### 2. 快捷启动命令

在 `package.json` 中配置了多种起动方式，请根据需求选择：

| 命令 | 说明 | 监听端口 | 访问地址 |
| :--- | :--- | :--- | :--- |
| **`npm run dev`** 或 **`npm start`** | **全端联合启动（最推荐）**：包含移动端、PC 控制台、WebSocket 和 Webhook | `3000` | 主页: `http://localhost:3000`<br>移动端: `http://localhost:3000/mobile`<br>PC控制台: `http://localhost:3000/web` |
| **`npm run dev:mobile`** | **移动端专用开发模式**：自动固定在移动端视图 | `3000` | `http://localhost:3000/mobile` |
| **`npm run dev:web`** | **PC 控制台专用开发模式**：直接呈现 Web 管理后台 | `3000` | `http://localhost:3000/web` |
| **`node server/index.js`** | **独立后端服务**：仅提供 Webhook 接收与 WebSocket 广播 | `3001` | API: `http://localhost:3001/webhook/ring`<br>WS: `ws://localhost:3001/ws` |

### 3. 自动化测试

项目内包含 41 项完备的单元测试，涵盖路由分发、认证状态、计时器循环、骑行计算与去重机制：

```bash
npm test
```

---

## 四、生产构建指南 (Build)

运行构建命令将生成多页面静态包到 `dist/` 目录：

```bash
npm run build
```

构建产物结构：
```text
dist/
├── index.html           # 统一自适应页面
├── mobile.html          # 移动端独立静态页
├── web.html             # Web 控制台独立静态页
└── assets/              # 编译后的 CSS、JS 与音频资源
```

此外，如仅需构建单端产物：
- 构建移动端：`npm run build:mobile`
- 构建 Web 端：`npm run build:web`

---

## 五、生产部署方案 (Deployment)

### 方案 A：单实例融合部署 (推荐，极简运维)

最简单、资源开销最小的部署方式。一个 Node.js 进程即可同时处理前端静态资源路由、WebSocket 实时长连接以及外部 Webhook 调用。

1. **构建生产包**：
   ```bash
   npm run build
   ```
2. **启动生产服务**：
   ```bash
   PORT=3000 NODE_ENV=production node server.js
   ```
3. 服务将自动代理静态资源并处理单页刷新重定向：
   - 访问 `http://your-server-ip:3000/` 自动路由
   - 访问 `http://your-server-ip:3000/mobile` 访问移动端
   - 访问 `http://your-server-ip:3000/web` 访问 PC 控制台
   - 外部调用 `POST http://your-server-ip:3000/webhook/ring` 推送响铃

---

### 方案 B：移动端与 Web 端物理隔离独立部署

当团队希望将移动端与 PC 控制台部署在不同服务器或不同端口时采用此方案：

1. **移动端服务部署**：
   ```bash
   # 启动移动端专用服务 (监听 3000 端口)
   PORT=3000 node server/server-mobile.js
   ```
2. **Web 控制台服务部署**：
   ```bash
   # 启动 Web 控制台专用服务 (监听 3001 端口)
   PORT=3001 node server/server-web.js
   ```

---

### 方案 C：PM2 进程守护配置

在生产环境中推荐使用 **PM2** 进行开机自启、奔溃自动重启和多核负载管理。

在项目根目录下创建 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [
    {
      name: 'pomodoro-fullstack',
      script: 'server.js',
      instances: 1, // WebSocket 需要保持长连接状态，建议单实例或配合 Redis 适配器
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DEFAULT_WEBHOOK_TOKEN: 'dev-token',
      },
    },
  ],
};
```

管理命令：
```bash
# 启动应用
pm2 start ecosystem.config.cjs

# 查看日志与运行状态
pm2 status
pm2 logs pomodoro-fullstack

# 保存配置以便开机自启
pm2 save
pm2 startup
```

---

### 方案 D：Nginx 反向代理与 SSL 配置

如果使用 Nginx 作为网关并开启 HTTPS/WSS 加密，配置范例如下：

```nginx
# HTTP 自动重定向到 HTTPS
server {
    listen 80;
    server_name pomodoro.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pomodoro.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/pomodoro.crt;
    ssl_certificate_key /etc/nginx/ssl/pomodoro.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 1. 静态与主站代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. WebSocket 长连接升级配置 (必须)
    location /ws {
        proxy_pass http://127.0.0.1:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s; # 保持长连接避免被超时切断
    }

    # 3. Webhook 接口反代
    location /webhook/ {
        proxy_pass http://127.0.0.1:3000/webhook/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Webhook-Token $http_x_webhook_token;
    }
}
```

---

### 方案 E：Docker 容器化部署

创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.js ./server.js

EXPOSE 3000
CMD ["node", "server.js"]
```

运行 Docker 容器：
```bash
# 构建镜像
docker build -t pomodoro-webhook:latest .

# 启动容器
docker run -d \
  --name pomodoro-app \
  -p 3000:3000 \
  -e PORT=3000 \
  -e DEFAULT_WEBHOOK_TOKEN=your-custom-token \
  --restart unless-stopped \
  pomodoro-webhook:latest
```

---

## 六、环境变量与网络端口一览表

| 变量名 | 默认值 | 作用说明 |
| :--- | :--- | :--- |
| `PORT` | `3000` | 主服务或独立部署时监听的 HTTP & WebSocket 端口 |
| `NODE_ENV` | `development` | 运行环境，设为 `production` 时自动启用压缩和静态分发优化 |
| `DEFAULT_WEBHOOK_TOKEN` | `dev-token` | 默认未绑定用户时的全局 Webhook 鉴权 Token |
| `VITE_APP_MODE` | `""` | 可设为 `app` 或 `pc`，强制指定前端编译或启动模式 |

---

## 七、Webhook 对接与排错说明

外部系统可通过标准 HTTP POST 调用触发各在线设备的广播响铃。

### 1. 快速调用示例 (cURL)

```bash
curl -X POST http://localhost:3000/webhook/ring \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: dev-token" \
  -d '{
    "eventId": "deploy-success-9901",
    "source": "GitLab CI",
    "message": "生产镜像打包上线成功！",
    "durationMs": 4000,
    "sound": "ring"
  }'
```

### 2. 常见调用结果说明

- **HTTP 200 `{"ok": true, "clientsNotified": 2}`**：广播成功，已有 2 台在线设备成功触发响铃。
- **HTTP 200 `{"ok": true, "duplicate": true}`**：幂等去重命中（相同的 `eventId` 在过去 1000 次内已被消费），避免重复响铃。
- **HTTP 401 `{"error": "Unauthorized"}`**：请求头中未附带 `X-Webhook-Token` 或 Token 错误。
- **HTTP 400 `{"error": "Missing message"}`**：缺少必需的 `message` 提醒文本。
