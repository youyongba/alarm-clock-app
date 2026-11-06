/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 用户鉴权、邮箱校验与密码重置核心算法（纯 JavaScript）
 */

/**
 * 校验邮箱格式合法性
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 100) return false;
  // 标准邮箱正则
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * 校验密码强度（至少 6 位，最多 64 位）
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '密码不能为空' };
  }
  if (password.length < 6) {
    return { valid: false, message: '密码长度不能少于 6 位' };
  }
  if (password.length > 64) {
    return { valid: false, message: '密码长度不能超过 64 位' };
  }
  return { valid: true };
}

/**
 * 生成 6 位纯数字验证码
 * @returns {string}
 */
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 校验验证码有效性与过期时间
 * @param {string} inputCode 用户输入的验证码
 * @param {string} storedCode 服务端存储的真实验证码
 * @param {number} codeCreatedAt 验证码生成时间戳
 * @param {number} ttlMs 有效期毫秒数（默认 10 分钟）
 * @returns {{ valid: boolean, message?: string }}
 */
export function verifyCode(inputCode, storedCode, codeCreatedAt, ttlMs = 10 * 60 * 1000) {
  if (!inputCode || typeof inputCode !== 'string') {
    return { valid: false, message: '请输入验证码' };
  }
  if (!storedCode || typeof storedCode !== 'string') {
    return { valid: false, message: '尚未发送验证码或验证码已失效' };
  }
  const now = Date.now();
  if (now - codeCreatedAt > ttlMs) {
    return { valid: false, message: '验证码已过期，请重新获取' };
  }
  if (inputCode.trim() !== storedCode.trim()) {
    return { valid: false, message: '验证码不正确，请重新核对' };
  }
  return { valid: true };
}

/**
 * 生成安全简短的用户 UID
 * @returns {string}
 */
export function generateUserId() {
  const rand = Math.random().toString(36).substring(2, 8);
  return `user_${Date.now().toString(36)}_${rand}`;
}

/**
 * 默认头像列表预设
 */
export const AVATAR_PRESETS = [
  { id: 'tomato_1', emoji: '🍅', name: '经典番茄' },
  { id: 'tomato_chef', emoji: '👨‍🍳', name: '专注大厨' },
  { id: 'tomato_rider', emoji: '🚴', name: '破风骑手' },
  { id: 'tomato_cat', emoji: '🐱', name: '咕噜猫咪' },
  { id: 'tomato_bot', emoji: '🤖', name: '自律助手' },
  { id: 'tomato_fire', emoji: '🔥', name: '超能先锋' },
  { id: 'tomato_leaf', emoji: '🍃', name: '清新慢活' },
  { id: 'tomato_star', emoji: '⭐', name: '效率之星' },
];

/**
 * 获取默认用户资料对象
 * @param {object} params
 * @returns {object}
 */
export function createDefaultUser(params = {}) {
  const email = params.email || 'user@tomato.com';
  const nickname = params.nickname || email.split('@')[0] || '番茄客';
  const now = Date.now();

  return {
    uid: params.uid || generateUserId(),
    email: email.trim().toLowerCase(),
    nickname: nickname.trim(),
    avatar: params.avatar || '🍅',
    avatarId: params.avatarId || 'tomato_1',
    webhookToken: params.webhookToken || 'dev-token',
    createdAt: params.createdAt || now,
    lastLoginAt: now,
    settings: {
      defaultRingDurationMs: 3000,
      soundType: 'ring',
      obeyMuteSwitch: false,
      keepScreenOn: true,
      ...(params.settings || {}),
    },
    stats: {
      totalFocusMinutes: params.stats?.totalFocusMinutes || 0,
      totalCompletedPomodoros: params.stats?.totalCompletedPomodoros || 0,
      totalWebhookRings: params.stats?.totalWebhookRings || 0,
      totalCyclingKm: params.stats?.totalCyclingKm || 0,
      totalCaloriesKcal: params.stats?.totalCaloriesKcal || 0,
      ...(params.stats || {}),
    },
  };
}
