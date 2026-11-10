# 🍅 番茄风格 Webhook 响铃器 (Pomodoro Webhook Ring Demo)

这是一个基于 **Taro 4 + React + 纯 JavaScript** 实现的番茄钟 Web 应用，并配套轻量 **Node.js (Express + ws)** 服务端。
支持外部系统通过 **Webhook (HTTP POST)** 触发响铃，服务端通过 **WebSocket** 广播给活跃的前端客户端，并在 iPhone 开启硬件静音拨片时强制发声。

> 📖 **完整工程架构、起动与部署指南详见**：[**DEPLOYMENT.md (完整部署与启动手册)**](./DEPLOYMENT.md)  
> 🔌 **移动端与 Web 端页面模块接口文档详见**：[**API_DOCUMENTATION.md (接口规范文档)**](./API_DOCUMENTATION.md)

---

## 目录结构（页面与模块完全解耦）
```text
├── index.html                   # 自适应全功能主入口
├── mobile.html                  # 移动端独立挂载宿主页
├── web.html                     # PC 控制台独立挂载宿主页
├── DEPLOYMENT.md                # 部署、起动与目录结构完整技术文档
├── API_DOCUMENTATION.md         # 页面模块与后端接口对照技术文档
├── vite.config.js               # 多页面打包与别名配置
├── server.js                    # 全功能主服务（Port 3000）
├── server/
│   ├── index.js                 # 独立后端服务（Express + ws，默认端口 3001）
│   ├── server-mobile.js         # 移动端专用部署实例
│   ├── server-web.js            # Web 控制台专用部署实例
│   ├── webhook.js               # Webhook 核心路由与广播
│   ├── webhook-logic.js         # 1000条 FIFO 内存幂等去重与校验算法
│   └── auth.js                  # 账户注册、登录与密码找回 API
├── src/
│   ├── index.css                # 全局样式（6px 优雅纤细自定义滚动条）
│   ├── main.jsx                 # 全功能主入口
│   ├── main-mobile.jsx          # 移动端专属入口
│   ├── main-web.jsx             # Web 控制台专属入口
│   ├── mobile/                  # 📱 移动端页面及子模块
│   │   ├── MobileApp.jsx        # 移动端主界面
│   │   └── components/
│   │       ├── MobileHeader.jsx # 移动端顶栏
│   │       ├── MobileNav.jsx    # 核心功能胶囊导航条
│   │       ├── QuickActions.jsx # 静音穿透与常亮控制
│   │       └── DevPanel.jsx     # 开发者调试与 WSS 诊断折叠卡片
│   ├── web/                     # 💻 Web / PC 控制台页面及子模块
│   │   ├── WebApp.jsx           # PC 控制台主界面
│   │   └── components/
│   │       ├── WebHeader.jsx    # 控制台顶栏与登录入口
│   │       ├── ClientsPanel.jsx # 实时在线客户端监控表格
│   │       ├── TriggerPanel.jsx # Webhook 模拟与即时触发器
│   │       ├── LogsPanel.jsx    # 服务端调用审计历史与搜索
│   │       ├── CodeGenPanel.jsx # cURL / JS / Python / Go 代码生成器
│   │       └── WebProfilePanel.jsx # 账户凭证与专属 Token 管理
│   ├── pages/index/index.jsx    # 路由调度层（智能自适应 + 一键互切）
│   ├── components/              # 跨端通用业务组件
│   ├── services/                # 音频、WebSocket、账户与平台能力服务
│   └── utils/                   # 纯业务逻辑与单测
```
│           ├── ring.mp3         # Webhook 响铃音效
│           ├── focus-end.mp3    # 专注完成提示音效
│           └── break-end.mp3    # 休息结束提示音效
└── README.md
```

---

## 启动与独立部署指南

本项目现已全面支持 **移动端** 与 **Web/PC 控制台端** 的**分开启动与独立部署**：

### 1. 统一全栈启动（同时支持移动端与 Web 端切换）
```bash
npm run dev
```
- 主入口：`http://localhost:3000`
- Web/PC 控制台直达入口：`http://localhost:3000/web` 或 `http://localhost:3000/pc`
- 移动端 App 直达入口：`http://localhost:3000/mobile` 或 `http://localhost:3000/app`

---

### 2. 移动端 (Mobile App) 独立启动与独立部署
适合面向 iOS / Android 手机浏览器、PWA 移动客户端单独打包部署。
```bash
# 移动端独立开发启动
npm run dev:mobile

# 移动端独立打包构建
npm run build:mobile

# 移动端独立生产环境启动 (加载 dist/index.html)
npm run start:mobile
```

---

### 3. Web 端 (PC 控制台) 独立启动与独立部署
适合运维看板、管理员调度大屏、多设备连接监控独立打包部署。
```bash
# Web/PC 控制台独立开发启动
npm run dev:web

# Web/PC 控制台独立打包构建
npm run build:web

# Web/PC 控制台独立生产环境启动 (加载 dist/web.html)
npm run start:web
```

---

### 4. 独立后端服务（Headless API & WebSocket 服务）
适用于前后端分离架构，前端静态托管至 CDN/Nginx，后端独立运行在云服务器或 Docker：
```bash
npm run server
# 或直接运行：node server/index.js
```
- 默认监听端口：`http://0.0.0.0:3001`
- 健康检查：`GET http://localhost:3001/health`
- Webhook 触发：`POST http://localhost:3001/webhook/ring`
- WebSocket 广播：`ws://localhost:3001/ws`

---

### 5. 运行自动化单元测试
```bash
npm test
```
覆盖 41 项纯函数与逻辑单元测试（包含路由判断、独立部署服务器导出、Webhook 幂等去重、用户鉴权等）。

---

## 环境变量说明

| 变量名 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `WEBHOOK_TOKEN` | `dev-token` | 外部调用 Webhook 时必须在请求头 `X-Webhook-Token` 中携带的密钥 |
| `PORT` | `3000` (主服务) / `3001` (独立服务) | HTTP 与 WebSocket 监听端口 |

---

## Webhook 接口规范与 curl 测试命令

### 1. 发送响铃请求 (POST /webhook/ring)

```bash
curl -X POST http://localhost:3001/webhook/ring \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: dev-token" \
  -d '{
    "eventId": "test-001",
    "source": "curl",
    "message": "喝水提醒",
    "durationMs": 3000,
    "sound": "ring",
    "mode": "ring"
  }'
```

**成功返回示例 (200 OK):**
```json
{
  "ok": true,
  "duplicate": false,
  "eventId": "test-001",
  "message": "响铃指令已接收并成功广播",
  "clientsNotified": 1,
  "broadcastData": {
    "type": "ring",
    "eventId": "test-001",
    "source": "curl",
    "message": "喝水提醒",
    "durationMs": 3000,
    "sound": "ring",
    "mode": "ring",
    "receivedAt": 1730765400000
  }
}
```

### 2. 幂等去重测试 (重复发送相同 eventId)
再次执行相同 `eventId` 的请求：
```bash
curl -X POST http://localhost:3001/webhook/ring \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: dev-token" \
  -d '{"eventId":"test-001","source":"curl","message":"喝水提醒","durationMs":3000}'
```
**返回结果：** 服务端识别到重复事件，返回 `duplicate: true` 且**不重复向前端广播**：
```json
{
  "ok": true,
  "duplicate": true,
  "message": "事件已处理（幂等去重生效，不重复广播）",
  "eventId": "test-001"
}
```

### 3. 错误处理与鉴权校验测试
- **Token 错误或缺失：**
  ```bash
  curl -X POST http://localhost:3001/webhook/ring \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Token: invalid-token" \
    -d '{"eventId":"test-002","message":"测试"}'
  ```
  返回 `401 Unauthorized`。

- **参数缺失或类型不匹配：**
  ```bash
  curl -X POST http://localhost:3001/webhook/ring \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Token: dev-token" \
    -d '{"message":"缺少 eventId"}'
  ```
  返回 `400 Bad Request`。

### 4. 服务健康检查
```bash
curl http://localhost:3001/health
```
返回 `{ "ok": true, "wsClientsCount": 1 }`。

---

## 关键技术实现：iOS 与 Android 跨平台专属适配

### 1. 🍎 iOS (iPhone/iPad) 专属适配
- **静音拨片穿透**：应用启动及每次播放前均调用 `Taro.setInnerAudioOption({ obeyMuteSwitch: false })`，配合 Web Audio API 解码输出，在 iPhone 开启侧边物理静音开关时依然强制通过外放扬声器响铃。
- **安全区与视口**：适配 Safari 底部 Home Indicator 与顶部刘海屏安全区（`env(safe-area-inset-*)`）。
- **PWA 主屏幕启动**：包含 `apple-mobile-web-app-capable` 独立全屏模式。

### 2. 🤖 Android (安卓手机/平板) 专属适配
- **扬声器优先**：配置 `speakerOn: true`，优先调用 Android 设备外放扬声器发声。
- **硬件震动反馈 (Vibration API)**：响铃时同步联动安卓设备马达触发交替节奏强震（`[200, 100, 200, 100, 400]`），按钮点击提供轻微触觉反馈。
- **屏幕常亮唤醒锁 (Wake Lock API)**：通过 `Taro.setKeepScreenOn`，在专注与倒计时期间保持屏幕不熄屏，防止安卓系统息屏休眠中断计时。

### 3. 双端通用前台活跃约束说明（重要）
- **仅限前台活跃**：iOS 与 Android 系统均有严格的功耗管理，**只有在应用处于前台且当前页面活跃时能可靠响铃**。
- **后台与锁屏限制**：锁屏、切至其他 App 或浏览器标签页挂起时，移动端系统会暂停 WebSocket 与定时器。
- **降级建议**：若有硬性锁屏强提醒需求，建议引导用户结合系统日历或 APNs / FCM 官方系统级推送通知。
