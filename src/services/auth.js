/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 前端用户认证与个人中心服务（纯 JavaScript）
 */

const STORAGE_KEY_USER = 'pomodoro_current_user';
const STORAGE_KEY_TOKEN = 'pomodoro_auth_token';

let currentUser = null;
let currentToken = null;
const authListeners = new Set();

// 初始化时从 localStorage 恢复用户态
try {
  if (typeof window !== 'undefined') {
    const savedUser = localStorage.getItem(STORAGE_KEY_USER);
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (savedUser && savedToken) {
      currentUser = JSON.parse(savedUser);
      currentToken = savedToken;
    }
  }
} catch (e) {
  console.warn('[Auth Service] 恢复本地登录态异常:', e);
}

/**
 * 触发认证状态变更通知
 */
function notifyListeners() {
  authListeners.forEach((fn) => {
    try {
      fn(currentUser, currentToken);
    } catch (e) {
      console.error('[Auth Listener Error]:', e);
    }
  });
}

/**
 * 保存登录态
 * @param {object} user
 * @param {string} token
 */
export function setAuthSession(user, token) {
  currentUser = user;
  currentToken = token;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    }
  } catch {}
  notifyListeners();
}

/**
 * 清除登录态（退出登录）
 */
export function clearAuthSession() {
  const token = currentToken;
  currentUser = null;
  currentToken = null;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  } catch {}

  // 异步通知服务端清理会话
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {});
  }

  notifyListeners();
}

/**
 * 获取当前登录用户信息
 * @returns {object | null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * 获取当前认证 Token
 * @returns {string | null}
 */
export function getAuthToken() {
  return currentToken;
}

/**
 * 判断是否已登录
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!(currentUser && currentToken);
}

/**
 * 订阅用户登录态变化
 * @param {(user: object|null, token: string|null) => void} listener
 * @returns {() => void} 取消订阅函数
 */
export function subscribeAuth(listener) {
  authListeners.add(listener);
  listener(currentUser, currentToken);
  return () => {
    authListeners.delete(listener);
  };
}

/**
 * 邮箱密码登录
 * @param {{ email: string, password: string }}
 * @returns {Promise<{ ok: boolean, user?: object, message?: string }>}
 */
export async function loginWithPassword({ email, password }) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAuthSession(data.user, data.token);
      return { ok: true, user: data.user, message: data.message };
    }
    return { ok: false, message: data.message || '登录失败' };
  } catch (err) {
    return { ok: false, message: `网络请求异常: ${err.message}` };
  }
}

/**
 * 邮箱验证码登录
 * @param {{ email: string, code: string }}
 * @returns {Promise<{ ok: boolean, user?: object, message?: string }>}
 */
export async function loginWithCode({ email, code }) {
  try {
    const res = await fetch('/api/auth/login-with-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAuthSession(data.user, data.token);
      return { ok: true, user: data.user, message: data.message };
    }
    return { ok: false, message: data.message || '验证码登录失败' };
  } catch (err) {
    return { ok: false, message: `网络请求异常: ${err.message}` };
  }
}

/**
 * 邮箱注册新账号
 * @param {{ email: string, password: string, nickname?: string, avatar?: string }}
 * @returns {Promise<{ ok: boolean, user?: object, message?: string }>}
 */
export async function registerAccount({ email, password, nickname, avatar }) {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname, avatar }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAuthSession(data.user, data.token);
      return { ok: true, user: data.user, message: data.message };
    }
    return { ok: false, message: data.message || '注册失败' };
  } catch (err) {
    return { ok: false, message: `网络请求异常: ${err.message}` };
  }
}

/**
 * 发送验证码（登录或找回密码）
 * @param {{ email: string, type?: 'login' | 'reset-password' }}
 * @returns {Promise<{ ok: boolean, message: string, codeForTesting?: string }>}
 */
export async function sendVerificationCode({ email, type = 'login' }) {
  try {
    const endpoint = type === 'reset-password' ? '/api/auth/forgot-password' : '/api/auth/send-code';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      return {
        ok: true,
        message: data.message,
        codeForTesting: data.codeForTesting,
      };
    }
    return { ok: false, message: data.message || '发送验证码失败' };
  } catch (err) {
    return { ok: false, message: `网络请求异常: ${err.message}` };
  }
}

/**
 * 找回密码（重置密码）
 * @param {{ email: string, code: string, newPassword: string }}
 * @returns {Promise<{ ok: boolean, user?: object, message?: string }>}
 */
export async function resetPassword({ email, code, newPassword }) {
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAuthSession(data.user, data.token);
      return { ok: true, user: data.user, message: data.message };
    }
    return { ok: false, message: data.message || '重置密码失败' };
  } catch (err) {
    return { ok: false, message: `网络请求异常: ${err.message}` };
  }
}

/**
 * 更新用户个人资料
 * @param {object} updates
 * @returns {Promise<{ ok: boolean, user?: object, message?: string }>}
 */
export async function updateProfile(updates) {
  if (!currentToken) {
    return { ok: false, message: '请先登录' };
  }
  try {
    const res = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAuthSession(data.user, currentToken);
      return { ok: true, user: data.user, message: data.message };
    }
    return { ok: false, message: data.message || '更新资料失败' };
  } catch (err) {
    return { ok: false, message: `网络请求异常: ${err.message}` };
  }
}
