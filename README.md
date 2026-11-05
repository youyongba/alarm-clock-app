# 🍅 番茄风格 Webhook 响铃器 (Pomodoro Webhook Ring Demo)

这是一个基于 **Taro 4 + React + 纯 JavaScript** 实现的番茄钟 Web 应用，并配套轻量 **Node.js (Express + ws)** 服务端。
支持外部系统通过 **Webhook (HTTP POST)** 触发响铃，服务端通过 **WebSocket** 广播给活跃的前端客户端，并在 iPhone 开启硬件静音拨片时强制发声。

---

## 目录结构
```text
├── index.html                   # 页面入口
├── vite.config.js               # Vite 配置（纯 JavaScript，包含 Taro 别名）
├── server.js                    # 全栈主服务（支持 3000 端口全栈与 3001 端口独立 Webhook）
├── server/
│   ├── index.js                 # 独立后端服务（Express + ws，默认端口 3001）
│   ├── webhook.js               # Webhook 鉴权、校验与广播路由
│   ├── webhook-logic.js         # Webhook 校验与 1000条 FIFO 内存幂等去重
│   ├── webhook-logic.test.js    # Webhook 单元测试
│   └── package.json             # 服务端独立 package.json
├── src/
│   ├── main.jsx                 # 前端应用入口
│   ├── App.jsx                  # 根组件
│   ├── index.css                # 全局样式
│   ├── pages/
│   │   └── index/
│   │       ├── index.jsx        # 番茄钟主页面
│   │       └── index.scss       # 番茄红暖色主题样式
│   ├── components/
│   │   ├── PomodoroTimer.jsx    # SVG 圆形进度环与番茄计时控制器
│   │   ├── RingBanner.jsx       # Webhook 响铃红色脉冲横幅
│   │   ├── CurrentClock.jsx     # 实时数字时钟与中文日期
│   │   ├── CustomTimer.jsx      # 自定义快捷倒计时与定点响铃闹钟
│   │   ├── TallyCounter.jsx     # 多分类打卡计数器与目标达成追踪
│   │   ├── CyclingCalculator.jsx# 骑行热量计算、BMI 分析与实地计时打卡
│   │   └── RingHistory.jsx      # Webhook 触发与本地定时响铃记录列表
│   ├── services/
│   │   ├── audio.js             # 音频管理器（设置 obeyMuteSwitch = false）
│   │   ├── websocket.js         # WebSocket 客户端（指数退避自动重连）
│   │   └── taro-shim.js         # Taro 4 核心 API 纯 JS 兼容层与 Web Audio 引擎
│   ├── hooks/
│   │   └── usePomodoro.js       # 番茄钟业务逻辑 Hook
│   ├── utils/
│   │   ├── timer-logic.js       # 计时器纯函数（计算进度、阶段切换）
│   │   ├── timer-logic.test.js  # 计时器单元测试
│   │   ├── counter-logic.js     # 计数器纯逻辑与进度计算
│   │   ├── counter-logic.test.js# 计数器单元测试
│   │   ├── scheduled-timer-logic.js      # 定点闹钟与时间格式化
│   │   ├── scheduled-timer-logic.test.js # 定点闹钟单元测试
│   │   ├── cycling-logic.js     # 骑行卡路里与 MET 能量公式计算
│   │   ├── cycling-logic.test.js# 骑行热量单元测试
│   │   ├── history-logic.js     # 响铃记录过滤与格式化纯逻辑
│   │   └── history-logic.test.js# 响铃记录单元测试
│   └── assets/
│       └── audio/
│           ├── ring.mp3         # Webhook 响铃音效
│           ├── focus-end.mp3    # 专注完成提示音效
│           └── break-end.mp3    # 休息结束提示音效
└── README.md
```

---

## 启动与运行指南

### 1. 启动全栈应用（前端 + 服务端）
```bash
npm run dev
```
启动后：
- 前端页面在 `http://localhost:3000`
- Webhook 接收端点在 `http://localhost:3001/webhook/ring` 以及 `http://localhost:3000/webhook/ring`
- WebSocket 服务端在 `ws://localhost:3001/ws` 以及 `ws://localhost:3000/ws`

### 2. 单独启动后端服务（可选）
```bash
node server/index.js
```
默认在 `http://localhost:3001` 启动服务。

### 3. 运行自动化单元测试
```bash
npm test
```
使用 Node.js 内置 test runner (`node:test`) 验证计时器逻辑、参数验证与 1000 条 FIFO 内存幂等去重。

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
