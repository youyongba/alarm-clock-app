# 🍅 番茄响铃器 - 移动端与 Web 端页面模块接口文档 (API Documentation)

本文档根据**移动端（Mobile App）**与 **Web 端（PC 控制台）**的页面及页面功能模块划分，详细定义了系统涉及的全部 HTTP RESTful 接口与 WebSocket 实时推送协议规范。

---

## 目录索引

- [一、全局约定与接口基础规范](#一全局约定与接口基础规范)
  - [1.1 服务地址 (Base URL)](#11-服务地址-base-url)
  - [1.2 通用请求头 (Headers)](#12-通用请求头-headers)
  - [1.3 身份鉴权机制](#13-身份鉴权机制)
  - [1.4 通用 HTTP 状态码与响应体结构](#14-通用-http-状态码与响应体结构)
- [二、移动端 (Mobile App) 页面模块与接口对照](#二移动端-mobile-app-页面模块与接口对照)
  - [2.1 移动端模块接口映射总览](#21-移动端模块接口映射总览)
  - [2.2 模块：网络连接状态与实时响铃 (MobileHeader / DevPanel)](#22-模块网络连接状态与实时响铃-mobileheader--devpanel)
  - [2.3 模块：认证与会话管理 (AuthModal)](#23-模块认证与会话管理-authmodal)
  - [2.4 模块：个人中心与多端数据同步 (UserProfile)](#24-模块个人中心与多端数据同步-userprofile)
- [三、Web 端 (PC 控制台) 页面模块与接口对照](#三web-端-pc-控制台-页面模块与接口对照)
  - [3.1 Web 控制台模块接口映射总览](#31-web-控制台模块接口映射总览)
  - [3.2 模块：控制台顶栏与健康指标 (WebHeader)](#32-模块控制台顶栏与健康指标-webheader)
  - [3.3 模块：WebSocket 客户端管理面板 (ClientsPanel)](#33-模块websocket-客户端管理面板-clientspanel)
  - [3.4 模块：Webhook 模拟与广播触发器 (TriggerPanel)](#34-模块webhook-模拟与广播触发器-triggerpanel)
  - [3.5 模块：调用与审计日志面板 (LogsPanel)](#35-模块调用与审计日志面板-logspanel)
  - [3.6 模块：外部系统代码生成器 (CodeGenPanel)](#36-模块外部系统代码生成器-codegenpanel)
  - [3.7 模块：PC 个人中心与凭证管理 (WebProfilePanel)](#37-模块pc-个人中心与凭证管理-webprofilepanel)
- [四、核心接口详细规格说明 (API Specifications)](#四核心接口详细规格说明-api-specifications)
  - [4.1 核心 Webhook 接收与广播：`POST /webhook/ring`](#41-核心-webhook-接收与广播post-webhookring)
  - [4.2 服务健康状态检查：`GET /health`](#42-服务健康状态检查get-health)
  - [4.3 获取 Webhook 运行状态与连接：`GET /api/webhook/status`](#43-获取-webhook-运行状态与连接get-apiwebhookstatus)
  - [4.4 控制台模拟触发 Webhook：`POST /api/webhook/test-trigger`](#44-控制台模拟触发-webhookpost-apiwebhooktest-trigger)
  - [4.5 广播客户端心跳检测：`POST /api/webhook/ping-clients`](#45-广播客户端心跳检测post-apiwebhookping-clients)
  - [4.6 清空 Webhook 调用审计日志：`POST /api/webhook/clear-logs` & `DELETE /api/webhook/logs`](#46-清空-webhook-调用审计日志post-apiwebhookclear-logs--delete-apiwebhooklogs)
  - [4.7 用户邮箱密码注册：`POST /api/auth/register`](#47-用户邮箱密码注册post-apiauthregister)
  - [4.8 用户邮箱密码登录：`POST /api/auth/login`](#48-用户邮箱密码登录post-apiauthlogin)
  - [4.9 发送登录/找密验证码：`POST /api/auth/send-code`](#49-发送登录找密验证码post-apiauthsend-code)
  - [4.10 验证码快捷登录 (免密)：`POST /api/auth/login-with-code`](#410-验证码快捷登录-免密post-apiauthlogin-with-code)
  - [4.11 申请找回密码验证码：`POST /api/auth/forgot-password`](#411-申请找回密码验证码post-apiauthforgot-password)
  - [4.12 提交新密码重置：`POST /api/auth/reset-password`](#412-提交新密码重置post-apiauthreset-password)
  - [4.13 获取当前登录用户信息：`GET /api/auth/me`](#413-获取当前登录用户信息get-apiauthme)
  - [4.14 更新用户资料与统计数据：`POST /api/auth/update-profile`](#414-更新用户资料与统计数据post-apiauthupdate-profile)
  - [4.15 退出登录：`POST /api/auth/logout`](#415-退出登录post-apiauthlogout)
- [五、WebSocket 实时通信协议规范](#五websocket-实时通信协议规范)
  - [5.1 连接握手与注册](#51-连接握手与注册)
  - [5.2 下行协议载荷清单 (Server -> Client)](#52-下行协议载荷清单-server---client)
  - [5.3 心跳保活与自动重连机制](#53-心跳保活与自动重连机制)
- [六、幂等去重与防静音机制规范](#六幂等去重与防静音机制规范)

---

## 一、全局约定与接口基础规范

### 1.1 服务地址 (Base URL)

- **全栈主服务 (开发/生产单端口部署)**：`http://localhost:3000`
- **独立后端服务 (多端口部署模式)**：`http://localhost:3001`
- **WebSocket 连接地址**：`ws://<host>:<port>/ws`（如启用 HTTPS，则自动升级为 `wss://<host>/ws`）

### 1.2 通用请求头 (Headers)

| Header 名称 | 必填 | 适用接口类型 | 说明与示例 |
| :--- | :---: | :--- | :--- |
| `Content-Type` | 是 | 所有 POST / PUT 请求 | 固定为 `application/json; charset=utf-8` |
| `Authorization` | 条件 | 需要登录态的用户接口 (`/api/auth/*`) | Bearer 鉴权凭证，示例: `Bearer 6a94b301f8...` |
| `X-Webhook-Token` | 条件 | Webhook 外部推送接口 (`/webhook/ring`) | Webhook 鉴权凭证，默认: `dev-token` 或用户专属 Token |

### 1.3 身份鉴权机制

1. **用户会话鉴权 (`Authorization: Bearer <token>`)**：
   - 用户通过密码或验证码登录成功后，服务端返回 `token`，前端存储在 `localStorage` 中。
   - 访问 `/api/auth/me`、`/api/auth/update-profile`、`/api/auth/logout` 时携带在请求头。
2. **Webhook 鉴权 (`X-Webhook-Token`)**：
   - 外部业务系统向 `/webhook/ring` 推送响铃时，必须携带有效的 Token。
   - APP 与 PC 控制台账号共用 Token，支持在个人中心实时更换。

### 1.4 通用 HTTP 状态码与响应体结构

```json
// 成功响应基类结构
{
  "ok": true,
  "message": "操作成功的中文提示",
  "data": {} // 具体返回数据或实体对象
}

// 失败响应基类结构
{
  "ok": false,
  "error": "错误原因说明",
  "message": "给用户的友好提示文案"
}
```

| 状态码 | 含义说明 | 典型场景 |
| :--- | :--- | :--- |
| `200 OK` | 请求成功并已正常处理 | 数据获取、成功广播、幂等去重拦截（避免调用方报错） |
| `400 Bad Request` | 请求入参校验不合格 | 缺少 message、邮箱格式不正确、密码长度不达标 |
| `401 Unauthorized` | 身份验证未通过 | Token 缺失、Token 过期或 X-Webhook-Token 错误 |
| `404 Not Found` | 资源未找到 | 邮箱未注册用户查询密码找回 |
| `409 Conflict` | 资源唯一性冲突 | 邮箱已被注册 |
| `429 Too Many Requests` | 频次超限被限流 | 60 秒内重复获取邮箱验证码 |
| `500 Internal Error` | 服务端运行时异常 | 内部逻辑异常或服务器意外错误 |

---

## 二、移动端 (Mobile App) 页面模块与接口对照

### 2.1 移动端模块接口映射总览

移动端代码独立位于 `src/mobile/` 目录，各组件与后端接口/协议的对应关系如下：

| 模块文件 | 模块职责 | 依赖接口 / 协议 | 调用方式与频次 |
| :--- | :--- | :--- | :--- |
| **`MobileHeader.jsx`** | 顶部状态栏与在线台数展示 | `GET /health`<br>`WebSocket /ws` | 挂载建立 WS 长连接，监听在线客户端与连接断开 |
| **`DevPanel.jsx`** | 跨平台调试与 WSS 说明面板 | `GET /health` | 展开时探测服务端健康状态，展示当前连接元数据 |
| **`AuthModal.jsx`** | 登录/注册/找回密码弹窗 | `POST /api/auth/register`<br>`POST /api/auth/login`<br>`POST /api/auth/send-code`<br>`POST /api/auth/login-with-code`<br>`POST /api/auth/forgot-password`<br>`POST /api/auth/reset-password` | 用户手动在移动端点击登录、注册或修改密码时触发 |
| **`UserProfile.jsx`** | “我的”个人中心与自律看板 | `GET /api/auth/me`<br>`POST /api/auth/update-profile`<br>`POST /api/auth/logout` | 切换到“我的”Tab 时拉取最新数据，修改头像/Token 或退出登录时触发 |
| **`RingBanner.jsx`** | 全屏响铃震动与声音脉冲浮层 | `WebSocket (type: "ring")` | 服务端下发远程响铃指令时被动触发强开静音发声 |

### 2.2 模块：网络连接状态与实时响铃 (MobileHeader / DevPanel)

- **通信协议**：`WebSocket` (`ws://<host>:<port>/ws`)
- **交互流程**：
  1. 移动端 App 初始化加载时调用 `connectWebSocket()` 发起连接。
  2. 服务端在握手完成时返回 `{"type": "connected", "message": "...", "timestamp": ...}`。
  3. `MobileHeader.jsx` 中的状态圆点变绿，显示“已连接”。
  4. 外部推送 Webhook 触发响铃时，WebSocket 接收 `{"type": "ring", ...}`，移动端调用 `playRingSound()` 并唤起 `RingBanner.jsx`。

### 2.3 模块：认证与会话管理 (AuthModal)

移动端支持与 PC 端完全一致的 3 种认证模式：
1. **密码注册/登录**：调用 `POST /api/auth/login` 或 `POST /api/auth/register`。
2. **免密快捷登录**：用户输入邮箱点击“获取验证码”，触发 `POST /api/auth/send-code`，随后调用 `POST /api/auth/login-with-code`，未注册账号自动无感初始化。
3. **找回密码**：调用 `POST /api/auth/forgot-password` 发送重置码，录入新密码后调用 `POST /api/auth/reset-password`。

### 2.4 模块：个人中心与多端数据同步 (UserProfile)

- **数据同步机制**：
  - 用户登录后，移动端将本地完成的番茄数（`completedPomodoros`）、骑行消耗热量（`caloriesBurned`）与服务端存储的历史统计合并计算。
  - 用户在移动端点击更换头像时，调用 `POST /api/auth/update-profile` 实时更新，随后 PC 控制台刷新即可同步看到新头像。

---

## 三、Web 端 (PC 控制台) 页面模块与接口对照

### 3.1 Web 控制台模块接口映射总览

Web 控制台独立位于 `src/web/` 目录，结构高度模块化：

| 页面选项卡 / 模块文件 | 模块职责 | 调用的后端接口 / 协议 | 调用方式与频次 |
| :--- | :--- | :--- | :--- |
| **`WebHeader.jsx`** | 顶栏、服务健康指标与登录状态 | `GET /health`<br>`GET /api/webhook/status` | 页面挂载与状态轮询（每 3.5s 刷新一次） |
| **`ClientsPanel.jsx`** (TAB 1) | 在线客户端设备列表与心跳测试 | `GET /api/webhook/status`<br>`POST /api/webhook/ping-clients` | 自动轮询展示设备 IP/在线时长；点击“广播心跳”手动触发 |
| **`TriggerPanel.jsx`** (TAB 2) | 可视化 Webhook 模拟与广播触发 | `POST /webhook/ring`<br>`POST /api/webhook/test-trigger` | 点击“立即触发 Webhook 响铃”表单提交时触发 |
| **`LogsPanel.jsx`** (TAB 3) | 外部调用审计历史与去重记录 | `GET /api/webhook/status` (提取 `recentLogs`)<br>`POST /api/webhook/clear-logs`<br>`DELETE /api/webhook/logs` | 自动获取审计列表；点击“清空调用日志”时触发 |
| **`CodeGenPanel.jsx`** (TAB 4) | 外部业务系统代码生成器 | `POST /webhook/ring` (代码模板规范展示) | 纯前端渲染并自动填入当前用户专属 Token 与 Host |
| **`WebProfilePanel.jsx`** (TAB 5) | PC 账户中心、Token 查看与重置 | `GET /api/auth/me`<br>`POST /api/auth/update-profile`<br>`POST /api/auth/logout` | 切换到此 Tab 时同步最新数据，修改头像或退出登录时触发 |

### 3.2 模块：控制台顶栏与健康指标 (WebHeader)
- 调用 `GET /api/webhook/status` 获取在线总客户端数 `clientsCount`，实时呈现在顶栏徽标上。

### 3.3 模块：WebSocket 客户端管理面板 (ClientsPanel)
- 调用 `GET /api/webhook/status` 获取 `activeClients` 数组。
- 展示字段：设备平台（iOS / Android / macOS / Windows）、客户端随机 ID、IP 地址、连接的服务端（Port-3000 / Port-3001）、已在线秒数。
- 点击“广播 Ping 心跳测试”按钮调用 `POST /api/webhook/ping-clients`，向所有已连接设备广播 Ping 检测包。

### 3.4 模块：Webhook 模拟与广播触发器 (TriggerPanel)
- 支持预设常用文案（CPU 警戒线告警、构建成功、久坐补水提醒、订单通知等）。
- 提交表单时直接向 `POST /webhook/ring` 发送标准载荷，请求头自动携带用户当前 Token。
- 右侧实时区域即时渲染 HTTP 状态码、响应耗时、去重拦截标志及原始 JSON。

### 3.5 模块：调用与审计日志面板 (LogsPanel)
- 读取 `recentLogs` 数组，支持前端按“全部 / 广播成功 / 去重拦截”快速过滤与关键字全文检索。
- 点击清空按钮调用 `POST /api/webhook/clear-logs` 或 `DELETE /api/webhook/logs`。

### 3.6 模块：外部系统代码生成器 (CodeGenPanel)
- 基于当前浏览器的 `location.protocol`、`location.host` 和当前登录账号的 `webhookToken`，动态生成 cURL、Node.js、Python、Go 4 种语言的即时可用代码，支持一键复制到剪贴板。

### 3.7 模块：PC 个人中心与凭证管理 (WebProfilePanel)
- 显示用户专属 `webhookToken` 并提供一键复制。
- 与移动端数据完全打通：实时统计累加本地完成番茄数和燃脂卡路里。
- 支持 8 种特色预设头像实时更换（同步写入后端存储）。

---

## 四、核心接口详细规格说明 (API Specifications)

### 4.1 核心 Webhook 接收与广播：`POST /webhook/ring`

- **适用模块**：外部所有系统对接、Web 端 `TriggerPanel.jsx`、`CodeGenPanel.jsx`
- **功能描述**：接收外部系统 HTTP POST 请求，校验 Token，通过 1000 条 FIFO 内存去重器拦截重复事件，并将合法响铃事件向所有在线 WebSocket 客户端广播。
- **请求头 (Headers)**：
  - `Content-Type: application/json`
  - `X-Webhook-Token: <token>` (必填)

#### 请求体参数 (Request Body)

| 字段名 | 类型 | 必填 | 默认值 | 说明与范围 |
| :--- | :---: | :---: | :--- | :--- |
| `message` | string | **是** | - | 响铃提醒正文，长度 1~500 字符 |
| `eventId` | string | 否 | 随机生成 | 事件唯一业务 ID，用于**幂等去重防重复广播** |
| `source` | string | 否 | `external` | 调用来源系统标识（如 `GitHub CI`、`Prometheus` 等） |
| `durationMs` | number | 否 | `5000` | 响铃持续时长（毫秒），限制范围 `1000 ~ 30000` (1秒~30秒) |
| `sound` | string | 否 | `ring` | 音效类型：`ring` (标准铃声)、`focus-end` (专注结束)、`break-end` (休息结束) |
| `mode` | string | 否 | `ring` | 播放模式，预留扩展字段 |

#### 请求体示例

```json
{
  "eventId": "evt-order-20261110-001",
  "source": "商城支付系统",
  "message": "用户完成 1 笔大额订单支付，请及时处理发货！",
  "durationMs": 4000,
  "sound": "ring"
}
```

#### 响应体示例 (HTTP 200 - 首次广播成功)

```json
{
  "ok": true,
  "duplicate": false,
  "eventId": "evt-order-20261110-001",
  "message": "响铃指令已接收并成功广播",
  "clientsNotified": 2,
  "broadcastData": {
    "type": "ring",
    "eventId": "evt-order-20261110-001",
    "source": "商城支付系统",
    "message": "用户完成 1 笔大额订单支付，请及时处理发货！",
    "durationMs": 4000,
    "sound": "ring",
    "mode": "ring",
    "receivedAt": 1794275011130
  }
}
```

#### 响应体示例 (HTTP 200 - 幂等去重命中，不重复响铃)

```json
{
  "ok": true,
  "duplicate": true,
  "message": "事件已处理（幂等去重生效，不重复广播）",
  "eventId": "evt-order-20261110-001"
}
```

#### 响应体示例 (HTTP 401 - 鉴权失败)

```json
{
  "error": "Invalid X-Webhook-Token",
  "hint": "请在请求头携带正确的 X-Webhook-Token"
}
```

---

### 4.2 服务健康状态检查：`GET /health`

- **适用模块**：`MobileHeader.jsx`、`WebHeader.jsx`、`DevPanel.jsx`、外部探活检查
- **请求头**：无特殊要求
- **成功响应 (HTTP 200)**：
```json
{
  "ok": true,
  "service": "pomodoro-webhook-server",
  "timestamp": 1794275011130,
  "clientsCount": 2,
  "dedupCacheSize": 12
}
```

---

### 4.3 获取 Webhook 运行状态与连接：`GET /api/webhook/status`

- **适用模块**：Web 端 `WebHeader.jsx`、`ClientsPanel.jsx`、`LogsPanel.jsx`
- **功能描述**：获取当前在线的 WebSocket 客户端清单、去重池容量及最近 30 条调用审计日志。
- **成功响应 (HTTP 200)**：
```json
{
  "ok": true,
  "clientsCount": 1,
  "activeClients": [
    {
      "id": "client_mwa100hm_6f7569",
      "ip": "127.0.0.1",
      "platform": "macOS 桌面端",
      "server": "Port-3000",
      "connectedAt": 1794274986874,
      "onlineDurationSec": 24
    }
  ],
  "dedupSize": 1,
  "totalLogsCount": 1,
  "recentLogs": [
    {
      "id": "log_1794274987_a8b9c0",
      "timestamp": 1794274987000,
      "eventId": "pc-evt-101",
      "source": "PC 控制台",
      "message": "测试响铃推送",
      "durationMs": 4000,
      "sound": "ring",
      "clientsNotified": 1,
      "isDuplicate": false,
      "status": "broadcasted",
      "clientIp": "127.0.0.1"
    }
  ],
  "defaultToken": "dev-token",
  "timestamp": 1794275011130
}
```

---

### 4.4 控制台模拟触发 Webhook：`POST /api/webhook/test-trigger`

- **适用模块**：Web 端 `TriggerPanel.jsx`
- **请求体参数**：
  - `message` (string, 必填): 消息文本
  - `eventId` (string, 可选): 事件 ID
  - `source` (string, 可选): 调用源
  - `durationMs` (number, 可选): 时长
  - `sound` (string, 可选): 音效

---

### 4.5 广播客户端心跳检测：`POST /api/webhook/ping-clients`

- **适用模块**：Web 端 `ClientsPanel.jsx`
- **功能描述**：立即向所有在线 WebSocket 客户端广播一个 `type: "ping"` 测试包，用于排查链路可用性。
- **成功响应 (HTTP 200)**：
```json
{
  "ok": true,
  "message": "已向 2 台在线客户端发送心跳测试包",
  "notified": 2
}
```

---

### 4.6 清空 Webhook 调用审计日志：`POST /api/webhook/clear-logs` & `DELETE /api/webhook/logs`

- **适用模块**：Web 端 `LogsPanel.jsx`
- **功能描述**：清空服务端内存中暂存的历史 Webhook 调用与拦截日志。
- **成功响应 (HTTP 200)**：
```json
{
  "ok": true,
  "message": "Webhook 历史调用日志已清空"
}
```

---

### 4.7 用户邮箱密码注册：`POST /api/auth/register`

- **适用模块**：双端通用认证弹窗 `AuthModal.jsx`
- **请求体参数**：
  - `email` (string, 必填): 合法邮箱地址
  - `password` (string, 必填): 登录密码（最少 6 位）
  - `nickname` (string, 可选): 初始昵称
  - `avatar` (string, 可选): 初始 Emoji 头像（如 `🍅`）
- **成功响应 (HTTP 200)**：
```json
{
  "ok": true,
  "message": "注册成功并已自动登录",
  "user": {
    "uid": "user_mw4an7d9_3x9a1c",
    "email": "user@example.com",
    "nickname": "番茄新人",
    "avatar": "🍅",
    "webhookToken": "tk_user_mw4an7d9",
    "stats": {
      "totalFocusMinutes": 0,
      "totalCompletedPomodoros": 0,
      "totalWebhookRings": 0,
      "totalCyclingKm": 0,
      "totalCaloriesKcal": 0
    }
  },
  "token": "4f9d2c1b8a7e6f5d4c3b2a10"
}
```
- **冲突响应 (HTTP 409)**：`{"ok": false, "message": "该邮箱已被注册，请直接登录"}`

---

### 4.8 用户邮箱密码登录：`POST /api/auth/login`

- **适用模块**：双端通用认证弹窗 `AuthModal.jsx`
- **请求体参数**：
  - `email` (string, 必填): 注册邮箱
  - `password` (string, 必填): 密码
- **成功响应 (HTTP 200)**：返回包含 `user` 详情对象和 `token`。
- **错误响应 (HTTP 401)**：`{"ok": false, "message": "邮箱或密码不正确"}`

---

### 4.9 发送登录/找密验证码：`POST /api/auth/send-code`

- **适用模块**：双端认证弹窗 `AuthModal.jsx` (免密登录、找回密码)
- **请求体参数**：
  - `email` (string, 必填): 目标邮箱
  - `type` (string, 可选): 业务类型，`login` (免密登录) 或 `reset-password` (找回密码)
- **成功响应 (HTTP 200)**：
```json
{
  "ok": true,
  "message": "验证码已发送至 user@example.com，10 分钟内有效",
  "codeForTesting": "303970"
}
```
- **频次超限响应 (HTTP 429)**：`{"ok": false, "message": "请求过于频繁，请等待 45 秒后再试"}`

---

### 4.10 验证码快捷登录 (免密)：`POST /api/auth/login-with-code`

- **适用模块**：双端认证弹窗 `AuthModal.jsx`
- **功能描述**：通过 6 位数字验证码登录，若邮箱未注册则自动注册并登录。
- **请求体参数**：
  - `email` (string, 必填): 接收验证码的邮箱
  - `code` (string, 必填): 6 位纯数字验证码
- **成功响应 (HTTP 200)**：返回登录成功用户信息与会话 `token`。

---

### 4.11 申请找回密码验证码：`POST /api/auth/forgot-password`

- **适用模块**：双端认证弹窗 `AuthModal.jsx` (找回密码第一步)
- **请求体参数**：`{"email": "qihong1222@gmail.com"}`
- **成功响应 (HTTP 200)**：返回发送成功状态；若邮箱未注册则返回 HTTP 404。

---

### 4.12 提交新密码重置：`POST /api/auth/reset-password`

- **适用模块**：双端认证弹窗 `AuthModal.jsx` (找回密码第二步)
- **请求体参数**：
  - `email` (string, 必填): 目标邮箱
  - `code` (string, 必填): 6 位有效重置验证码
  - `newPassword` (string, 必填): 新登录密码（>= 6位）
- **成功响应 (HTTP 200)**：重置成功并直接返回登录会话。

---

### 4.13 获取当前登录用户信息：`GET /api/auth/me`

- **适用模块**：移动端 `UserProfile.jsx`、Web 端 `WebProfilePanel.jsx`、主路由 `IndexPage`
- **请求头**：`Authorization: Bearer <token>` (必填)
- **成功响应 (HTTP 200)**：
```json
{
  "ok": true,
  "user": {
    "uid": "user_mw4an7d9_3x9a1c",
    "email": "qihong1222@gmail.com",
    "nickname": "番茄主理人",
    "avatar": "🍅",
    "webhookToken": "dev-token",
    "stats": {
      "totalFocusMinutes": 125,
      "totalCompletedPomodoros": 5,
      "totalWebhookRings": 12,
      "totalCyclingKm": 18.5,
      "totalCaloriesKcal": 420
    }
  }
}
```

---

### 4.14 更新用户资料与统计数据：`POST /api/auth/update-profile`

- **适用模块**：移动端 `UserProfile.jsx`、Web 端 `WebProfilePanel.jsx`
- **请求头**：`Authorization: Bearer <token>` (必填)
- **请求体参数**：
  - `nickname` (string, 可选): 新昵称
  - `avatar` (string, 可选): 新 Emoji 头像（如 `🚴`、`⚡`、`☕`）
  - `webhookToken` (string, 可选): 用户自定义的专属 Webhook Token
  - `stats` (object, 可选): 增量更新或同步番茄专注统计对象
- **成功响应 (HTTP 200)**：返回更新后的完整用户对象。

---

### 4.15 退出登录：`POST /api/auth/logout`

- **适用模块**：移动端 `UserProfile.jsx`、Web 端 `WebProfilePanel.jsx`
- **请求头**：`Authorization: Bearer <token>`
- **成功响应 (HTTP 200)**：`{"ok": true, "message": "已安全登出"}`

---

## 五、WebSocket 实时通信协议规范

### 5.1 连接握手与注册

- **URL 地址**：`ws://<host>:<port>/ws`
- **握手行为**：客户端连接建立后，服务端底层调用 `registerClient(ws, req)` 解析其 IP、设备平台（iOS / Android / Mac / Win），并分配唯一 `clientId`。

### 5.2 下行协议载荷清单 (Server -> Client)

#### 1. 连接就绪欢迎包 (`type: "connected"`)
```json
{
  "type": "connected",
  "server": "Port-3000",
  "message": "成功连接到番茄钟 Webhook 响铃服务",
  "timestamp": 1794275011130
}
```

#### 2. 远程 Webhook 广播响铃指令 (`type: "ring"`)
当外部系统调用 `POST /webhook/ring` 成功后下发：
```json
{
  "type": "ring",
  "eventId": "evt-build-9921",
  "source": "GitHub Actions",
  "message": "生产环境部署完成，请验收！",
  "durationMs": 4000,
  "sound": "ring",
  "mode": "ring",
  "receivedAt": 1794275011130
}
```
*客户端收到后执行：*
- 调起全屏红色脉冲浮层 `RingBanner.jsx`。
- 调用音频服务 `playRingSound()`，在 iOS 开启静音开关（obeyMuteSwitch=false）及 Android 扬声器模式下强行播放。
- 触发手机物理震动（如设备支持震动 API）。

#### 3. 诊断心跳包 (`type: "ping"`)
```json
{
  "type": "ping",
  "timestamp": 1794275011130,
  "source": "PC 控制台"
}
```

### 5.3 心跳保活与自动重连机制

1. **服务端保活 Ping/Pong**：服务端定时向连接发送底层 WebSocket Ping 帧，客户端返回 Pong，心跳超时的僵尸连接自动回收。
2. **客户端指数退避重连**：
   - 基础重连间隔：`1000ms`。
   - 最大重连间隔：`15000ms`。
   - 退避系数：`1.5`。
   - 网络断开时，客户端自动尝试重新握手，恢复后自动同步连接状态。

---

## 六、幂等去重与防静音机制规范

1. **1000 条 FIFO 内存去重器**：
   - 外部业务系统重试或网络抖动可能重复提交同一个 `eventId`。
   - 服务端 `EventDeduplicator` 会在内存 Map 中维护最近 1000 条 `eventId`。
   - 命中重复时，返回 HTTP 200 并附带 `duplicate: true`，记录一条去重拦截日志，**绝不重复触发广播与手机响铃**。
2. **防静音拨片音频强开**：
   - 音频模块通过 Taro 与 HTML5 Audio / Web Audio 深度绑定，初始化时声明 `obeyMuteSwitch = false` 与 `speakerOn = true`。
   - 确保外部报警类 Webhook 能够在用户设备处于静音模式时正常响起。
