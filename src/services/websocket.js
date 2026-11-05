/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * WebSocket 管理服务
 * 负责与后端 /ws 建立持久连接，并在断线时执行指数退避重连（最大 10 秒）
 */

let ws = null;
let reconnectTimer = null;
let currentRetryDelay = 1000;
const MAX_RETRY_DELAY = 10000;
let isIntentionallyClosed = false;

// 状态与消息事件回调集合
const statusListeners = new Set();
const messageListeners = new Set();

/**
 * @type {'connected' | 'reconnecting' | 'disconnected'}
 */
let connectionStatus = 'disconnected';

/**
 * 获取当前的默认 WebSocket 服务端地址
 * 优先连接 3001 端口，如果处于非标准端口或反向代理环境，支持自适应
 * @returns {string}
 */
export function getDefaultWsUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
  const isHttps = window.location.protocol === 'https:';
  const protocol = isHttps ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  return `${protocol}//${host}/ws`;
}

let targetWsUrl = getDefaultWsUrl();

/**
 * 允许外部修改连接目标地址
 * @param {string} url
 */
export function setWsUrl(url) {
  if (url && url !== targetWsUrl) {
    targetWsUrl = url;
    disconnectWebSocket();
    connectWebSocket();
  }
}

export function getWsUrl() {
  return targetWsUrl;
}

/**
 * 更新并派发连接状态
 * @param {'connected' | 'reconnecting' | 'disconnected'} nextStatus
 */
function updateStatus(nextStatus) {
  connectionStatus = nextStatus;
  statusListeners.forEach((fn) => {
    try {
      fn(connectionStatus);
    } catch (e) {
      console.error('[WebSocket] 状态监听器异常:', e);
    }
  });
}

/**
 * 初始化并连接 WebSocket
 */
export function connectWebSocket() {
  if (typeof window === 'undefined') return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  isIntentionallyClosed = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log(`🔌 [WebSocket] 尝试连接到: ${targetWsUrl}`);
  updateStatus(currentRetryDelay > 1000 ? 'reconnecting' : 'disconnected');

  try {
    ws = new WebSocket(targetWsUrl);

    ws.onopen = () => {
      console.log('✅ [WebSocket] 连接已建立');
      currentRetryDelay = 1000;
      updateStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('📩 [WebSocket] 收到服务端消息:', payload);
        messageListeners.forEach((fn) => {
          try {
            fn(payload);
          } catch (e) {
            console.error('[WebSocket] 消息处理异常:', e);
          }
        });
      } catch (err) {
        console.warn('[WebSocket] 解析非 JSON 消息:', event.data);
      }
    };

    ws.onclose = (event) => {
      console.warn(`⚠️ [WebSocket] 连接关闭 code=${event.code}, reason=${event.reason}`);
      ws = null;
      if (!isIntentionallyClosed) {
        scheduleReconnect();
      } else {
        updateStatus('disconnected');
      }
    };

    ws.onerror = (err) => {
      console.error('❌ [WebSocket] 连接错误:', err);
      // 如果 3001 连接失败且当前处于 localhost:3000，尝试自动回退到当前 host
      if (
        targetWsUrl.includes(':3001') &&
        window.location.port === '3000' &&
        currentRetryDelay === 1000
      ) {
        console.log('🔄 [WebSocket] 3001 暂无响应，尝试当前应用 host 连接...');
        const fallbackUrl = `ws://${window.location.host}/ws`;
        targetWsUrl = fallbackUrl;
      }
    };
  } catch (e) {
    console.error('❌ [WebSocket] 创建连接失败:', e);
    scheduleReconnect();
  }
}

/**
 * 安排指数退避重连
 */
function scheduleReconnect() {
  if (isIntentionallyClosed) return;
  updateStatus('reconnecting');

  console.log(`⏱️ [WebSocket] 将在 ${currentRetryDelay / 1000} 秒后重新连接...`);
  if (reconnectTimer) clearTimeout(reconnectTimer);

  reconnectTimer = setTimeout(() => {
    connectWebSocket();
    // 指数递增，上限 10 秒
    currentRetryDelay = Math.min(MAX_RETRY_DELAY, currentRetryDelay * 2);
  }, currentRetryDelay);
}

/**
 * 主动断开连接
 */
export function disconnectWebSocket() {
  isIntentionallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  updateStatus('disconnected');
}

/**
 * 订阅连接状态变化
 * @param {(status: 'connected' | 'reconnecting' | 'disconnected') => void} listener
 * @returns {() => void} 取消订阅函数
 */
export function onStatusChange(listener) {
  statusListeners.add(listener);
  listener(connectionStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * 订阅收到的 WebSocket 消息
 * @param {(data: object) => void} listener
 * @returns {() => void} 取消订阅函数
 */
export function onMessage(listener) {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

/**
 * 获取当前状态
 */
export function getConnectionStatus() {
  return connectionStatus;
}
