/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import {
  isValidEmail,
  validatePassword,
  generateVerificationCode,
  verifyCode,
  createDefaultUser,
} from '../src/utils/auth-logic.js';

/**
 * 内存用户数据存储（生产中可替换为数据库，这里提供持久安全的内存 Map）
 */
const usersByEmail = new Map();
// 存储用户的密码哈希：email -> hash
const passwordsByEmail = new Map();
// 存储用户的活跃 Token：token -> email
const tokensMap = new Map();
// 存储发送的验证码：email -> { code, createdAt, type }
const verificationCodes = new Map();

/**
 * 简易安全密码哈希函数（使用 sha256 + 静态盐）
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(`salt_tomato_2026_${password}`).digest('hex');
}

/**
 * 生成随机 Bearer 认证 Token
 * @returns {string}
 */
function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// 预设体验账户：方便用户直接测试登录与找回密码
const defaultEmail = 'qihong1222@gmail.com';
const defaultInitialUser = createDefaultUser({
  email: defaultEmail,
  nickname: '番茄主理人',
  avatar: '🍅',
  webhookToken: 'dev-token',
  stats: {
    totalFocusMinutes: 125,
    totalCompletedPomodoros: 5,
    totalWebhookRings: 12,
    totalCyclingKm: 18.5,
    totalCaloriesKcal: 420,
  },
});
usersByEmail.set(defaultEmail.toLowerCase(), defaultInitialUser);
passwordsByEmail.set(defaultEmail.toLowerCase(), hashPassword('123456'));

/**
 * 创建 Express 认证路由处理器
 */
export function createAuthRouter() {
  return {
    /**
     * POST /api/auth/register
     * 邮箱密码注册
     */
    register(req, res) {
      try {
        const { email, password, nickname, avatar } = req.body || {};

        if (!isValidEmail(email)) {
          return res.status(400).json({ ok: false, message: '请输入有效的邮箱地址' });
        }
        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) {
          return res.status(400).json({ ok: false, message: pwdCheck.message });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (usersByEmail.has(normalizedEmail)) {
          return res.status(409).json({ ok: false, message: '该邮箱已被注册，请直接登录' });
        }

        const newUser = createDefaultUser({
          email: normalizedEmail,
          nickname: nickname || normalizedEmail.split('@')[0],
          avatar: avatar || '🍅',
        });

        usersByEmail.set(normalizedEmail, newUser);
        passwordsByEmail.set(normalizedEmail, hashPassword(password));

        const token = generateToken();
        tokensMap.set(token, normalizedEmail);

        return res.json({
          ok: true,
          message: '注册成功并已自动登录',
          user: newUser,
          token,
        });
      } catch (err) {
        console.error('[Auth Register Error]:', err);
        return res.status(500).json({ ok: false, message: '注册失败，服务器异常' });
      }
    },

    /**
     * POST /api/auth/login
     * 邮箱密码登录
     */
    login(req, res) {
      try {
        const { email, password } = req.body || {};

        if (!isValidEmail(email)) {
          return res.status(400).json({ ok: false, message: '请输入有效的邮箱地址' });
        }
        if (!password) {
          return res.status(400).json({ ok: false, message: '请输入密码' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = usersByEmail.get(normalizedEmail);
        const storedHash = passwordsByEmail.get(normalizedEmail);

        if (!user || !storedHash || storedHash !== hashPassword(password)) {
          return res.status(401).json({ ok: false, message: '邮箱或密码不正确' });
        }

        user.lastLoginAt = Date.now();
        const token = generateToken();
        tokensMap.set(token, normalizedEmail);

        return res.json({
          ok: true,
          message: '登录成功',
          user,
          token,
        });
      } catch (err) {
        console.error('[Auth Login Error]:', err);
        return res.status(500).json({ ok: false, message: '登录失败，服务器异常' });
      }
    },

    /**
     * POST /api/auth/send-code
     * 发送登录或重置验证码
     */
    sendCode(req, res) {
      try {
        const { email, type = 'login' } = req.body || {};

        if (!isValidEmail(email)) {
          return res.status(400).json({ ok: false, message: '请输入有效的邮箱地址' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 检查防刷频（60秒内不可重发）
        const existing = verificationCodes.get(normalizedEmail);
        const now = Date.now();
        if (existing && now - existing.createdAt < 60 * 1000) {
          const waitSec = Math.ceil((60 * 1000 - (now - existing.createdAt)) / 1000);
          return res.status(429).json({
            ok: false,
            message: `请求过于频繁，请等待 ${waitSec} 秒后再试`,
          });
        }

        const code = generateVerificationCode();
        verificationCodes.set(normalizedEmail, {
          code,
          createdAt: now,
          type,
        });

        console.log(`📧 [Email Service] 发送验证码给 [${normalizedEmail}]: ${code} (类型: ${type})`);

        return res.json({
          ok: true,
          message: `验证码已发送至 ${normalizedEmail}，10 分钟内有效`,
          // 提供开发环境直接填入的验证码字段，便于即时体验
          codeForTesting: code,
        });
      } catch (err) {
        console.error('[Auth SendCode Error]:', err);
        return res.status(500).json({ ok: false, message: '发送验证码失败' });
      }
    },

    /**
     * POST /api/auth/login-with-code
     * 邮箱验证码快捷登录（未注册则自动无感注册）
     */
    loginWithCode(req, res) {
      try {
        const { email, code } = req.body || {};

        if (!isValidEmail(email)) {
          return res.status(400).json({ ok: false, message: '请输入有效的邮箱地址' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const stored = verificationCodes.get(normalizedEmail);

        const check = verifyCode(code, stored?.code, stored?.createdAt);
        if (!check.valid) {
          return res.status(400).json({ ok: false, message: check.message });
        }

        // 验证通过，消耗该验证码
        verificationCodes.delete(normalizedEmail);

        let user = usersByEmail.get(normalizedEmail);
        if (!user) {
          // 首次使用验证码登录，自动初始化账户
          user = createDefaultUser({
            email: normalizedEmail,
            nickname: normalizedEmail.split('@')[0],
          });
          usersByEmail.set(normalizedEmail, user);
          passwordsByEmail.set(normalizedEmail, hashPassword('123456')); // 初始密码
        }

        user.lastLoginAt = Date.now();
        const token = generateToken();
        tokensMap.set(token, normalizedEmail);

        return res.json({
          ok: true,
          message: '验证码登录成功',
          user,
          token,
        });
      } catch (err) {
        console.error('[Auth LoginWithCode Error]:', err);
        return res.status(500).json({ ok: false, message: '验证码登录失败' });
      }
    },

    /**
     * POST /api/auth/forgot-password
     * 请求找回密码验证码
     */
    forgotPassword(req, res) {
      try {
        const { email } = req.body || {};

        if (!isValidEmail(email)) {
          return res.status(400).json({ ok: false, message: '请输入有效的邮箱地址' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = usersByEmail.get(normalizedEmail);

        if (!user) {
          return res.status(404).json({
            ok: false,
            message: '未找到该邮箱对应的账号，请先注册',
          });
        }

        const now = Date.now();
        const existing = verificationCodes.get(normalizedEmail);
        if (existing && now - existing.createdAt < 60 * 1000) {
          const waitSec = Math.ceil((60 * 1000 - (now - existing.createdAt)) / 1000);
          return res.status(429).json({
            ok: false,
            message: `请求过于频繁，请等待 ${waitSec} 秒后再试`,
          });
        }

        const code = generateVerificationCode();
        verificationCodes.set(normalizedEmail, {
          code,
          createdAt: now,
          type: 'reset-password',
        });

        console.log(`🔐 [Password Reset] 邮箱 [${normalizedEmail}] 重置验证码: ${code}`);

        return res.json({
          ok: true,
          message: `重置验证码已发送至 ${normalizedEmail}`,
          codeForTesting: code,
        });
      } catch (err) {
        console.error('[Auth ForgotPassword Error]:', err);
        return res.status(500).json({ ok: false, message: '发送重置验证码失败' });
      }
    },

    /**
     * POST /api/auth/reset-password
     * 提交新密码重置
     */
    resetPassword(req, res) {
      try {
        const { email, code, newPassword } = req.body || {};

        if (!isValidEmail(email)) {
          return res.status(400).json({ ok: false, message: '请输入有效的邮箱地址' });
        }

        const pwdCheck = validatePassword(newPassword);
        if (!pwdCheck.valid) {
          return res.status(400).json({ ok: false, message: pwdCheck.message });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = usersByEmail.get(normalizedEmail);

        if (!user) {
          return res.status(404).json({ ok: false, message: '账号不存在' });
        }

        const stored = verificationCodes.get(normalizedEmail);
        const check = verifyCode(code, stored?.code, stored?.createdAt);
        if (!check.valid) {
          return res.status(400).json({ ok: false, message: check.message });
        }

        // 更新新密码哈希并清除验证码
        passwordsByEmail.set(normalizedEmail, hashPassword(newPassword));
        verificationCodes.delete(normalizedEmail);

        // 生成新登录 Token 便于重置后直接登录
        const token = generateToken();
        tokensMap.set(token, normalizedEmail);

        console.log(`✅ [Password Reset Success] 用户 [${normalizedEmail}] 密码已成功重置`);

        return res.json({
          ok: true,
          message: '密码重置成功，已自动登录',
          user,
          token,
        });
      } catch (err) {
        console.error('[Auth ResetPassword Error]:', err);
        return res.status(500).json({ ok: false, message: '密码重置失败' });
      }
    },

    /**
     * GET /api/auth/me
     * 获取当前登录用户信息
     */
    getMe(req, res) {
      try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!token || !tokensMap.has(token)) {
          return res.status(401).json({ ok: false, message: '未登录或登录已失效' });
        }

        const email = tokensMap.get(token);
        const user = usersByEmail.get(email);

        if (!user) {
          return res.status(404).json({ ok: false, message: '用户不存在' });
        }

        return res.json({ ok: true, user });
      } catch (err) {
        return res.status(500).json({ ok: false, message: '获取用户信息失败' });
      }
    },

    /**
     * POST /api/auth/update-profile
     * 更新当前用户资料与统计数据
     */
    updateProfile(req, res) {
      try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!token || !tokensMap.has(token)) {
          return res.status(401).json({ ok: false, message: '未登录或登录已失效' });
        }

        const email = tokensMap.get(token);
        const user = usersByEmail.get(email);

        if (!user) {
          return res.status(404).json({ ok: false, message: '用户不存在' });
        }

        const { nickname, avatar, avatarId, webhookToken, settings, stats } = req.body || {};

        if (typeof nickname === 'string' && nickname.trim()) {
          user.nickname = nickname.trim().slice(0, 30);
        }
        if (typeof avatar === 'string' && avatar.trim()) {
          user.avatar = avatar.trim();
        }
        if (typeof avatarId === 'string') {
          user.avatarId = avatarId;
        }
        if (typeof webhookToken === 'string' && webhookToken.trim()) {
          user.webhookToken = webhookToken.trim().slice(0, 60);
        }
        if (settings && typeof settings === 'object') {
          user.settings = { ...user.settings, ...settings };
        }
        if (stats && typeof stats === 'object') {
          user.stats = { ...user.stats, ...stats };
        }

        return res.json({
          ok: true,
          message: '用户资料更新成功',
          user,
        });
      } catch (err) {
        console.error('[Auth UpdateProfile Error]:', err);
        return res.status(500).json({ ok: false, message: '更新资料失败' });
      }
    },

    /**
     * POST /api/auth/logout
     */
    logout(req, res) {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        tokensMap.delete(token);
      }
      return res.json({ ok: true, message: '已安全登出' });
    },
  };
}
