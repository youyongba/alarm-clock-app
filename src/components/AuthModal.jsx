/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import {
  loginWithPassword,
  loginWithCode,
  registerAccount,
  sendVerificationCode,
  resetPassword,
} from '@/services/auth.js';
import { isValidEmail, validatePassword, AVATAR_PRESETS } from '@/utils/auth-logic.js';
import {
  X,
  Mail,
  Lock,
  User,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

/**
 * 登录、注册与找回密码多模态弹窗组件（纯 JavaScript）
 * @param {object} props
 * @param {boolean} props.isOpen 是否展示弹窗
 * @param {() => void} props.onClose 关闭回调
 * @param {'login' | 'register' | 'forgot'} [props.initialMode='login'] 初始模式
 * @param {(user: object) => void} [props.onSuccess] 成功回调
 */
export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) {
  // 当前模式：'login' | 'code-login' | 'register' | 'forgot'
  const [mode, setMode] = useState(initialMode);
  // 表单状态
  const [email, setEmail] = useState('qihong1222@gmail.com');
  const [password, setPassword] = useState('123456');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('番茄大师');
  const [avatar, setAvatar] = useState('🍅');
  const [verificationCode, setVerificationCode] = useState('');

  // 密码显隐
  const [showPassword, setShowPassword] = useState(false);
  // 加载中与错误提示
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 验证码倒计时
  const [countdown, setCountdown] = useState(0);
  // 测试环境下便捷填入验证码
  const [testCodeHint, setTestCodeHint] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'login');
      setErrorMessage('');
      setSuccessMessage('');
      setTestCodeHint('');
    }
  }, [isOpen, initialMode]);

  // 验证码倒计时效果
  useEffect(() => {
    let timer = null;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  if (!isOpen) return null;

  // 发送验证码
  const handleSendCode = async () => {
    if (!isValidEmail(email)) {
      setErrorMessage('请输入正确的邮箱格式');
      return;
    }
    setErrorMessage('');
    setLoading(true);

    const type = mode === 'forgot' ? 'reset-password' : 'login';
    const res = await sendVerificationCode({ email, type });
    setLoading(false);

    if (res.ok) {
      setSuccessMessage(res.message);
      setCountdown(60);
      if (res.codeForTesting) {
        setTestCodeHint(res.codeForTesting);
      }
      Taro.showToast({
        title: '验证码已发送',
        icon: 'success',
      });
    } else {
      setErrorMessage(res.message || '发送失败，请重试');
    }
  };

  // 快速填入测试验证码
  const handleAutoFillCode = () => {
    if (testCodeHint) {
      setVerificationCode(testCodeHint);
      setSuccessMessage('已填入测试验证码');
    }
  };

  // 一键体验快捷登录
  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    const res = await loginWithPassword({
      email: 'qihong1222@gmail.com',
      password: '123456',
    });
    setLoading(false);
    if (res.ok) {
      Taro.showToast({ title: '欢迎回来！登录成功', icon: 'success' });
      if (onSuccess) onSuccess(res.user);
      onClose();
    } else {
      setErrorMessage(res.message || '快捷登录失败');
    }
  };

  // 提交表单处理
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!isValidEmail(email)) {
      setErrorMessage('请输入合法的邮箱地址');
      return;
    }

    // 1. 邮箱密码登录
    if (mode === 'login') {
      if (!password) {
        setErrorMessage('请输入密码');
        return;
      }
      setLoading(true);
      const res = await loginWithPassword({ email, password });
      setLoading(false);
      if (res.ok) {
        Taro.showToast({ title: '登录成功', icon: 'success' });
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
      return;
    }

    // 2. 邮箱验证码登录
    if (mode === 'code-login') {
      if (!verificationCode || verificationCode.length !== 6) {
        setErrorMessage('请输入 6 位有效验证码');
        return;
      }
      setLoading(true);
      const res = await loginWithCode({ email, code: verificationCode });
      setLoading(false);
      if (res.ok) {
        Taro.showToast({ title: '验证码登录成功', icon: 'success' });
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
      return;
    }

    // 3. 注册账号
    if (mode === 'register') {
      const pwdValid = validatePassword(password);
      if (!pwdValid.valid) {
        setErrorMessage(pwdValid.message);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('两次输入的密码不一致');
        return;
      }
      setLoading(true);
      const res = await registerAccount({
        email,
        password,
        nickname: nickname.trim() || email.split('@')[0],
        avatar,
      });
      setLoading(false);
      if (res.ok) {
        Taro.showToast({ title: '注册并登录成功', icon: 'success' });
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
      return;
    }

    // 4. 找回密码 (重置密码)
    if (mode === 'forgot') {
      if (!verificationCode || verificationCode.length !== 6) {
        setErrorMessage('请输入邮箱收到的 6 位重置验证码');
        return;
      }
      const pwdValid = validatePassword(password);
      if (!pwdValid.valid) {
        setErrorMessage(pwdValid.message);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('两次输入的新密码不一致');
        return;
      }
      setLoading(true);
      const res = await resetPassword({
        email,
        code: verificationCode,
        newPassword: password,
      });
      setLoading(false);
      if (res.ok) {
        Taro.showToast({ title: '密码已重置，已为您自动登录', icon: 'success' });
        if (onSuccess) onSuccess(res.user);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题与关闭按钮 */}
        <div className="bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white p-5 pb-6 flex items-start justify-between relative">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🍅</span>
              <h2 className="text-xl font-bold">
                {mode === 'login' && '邮箱账号登录'}
                {mode === 'code-login' && '验证码快捷登录'}
                {mode === 'register' && '注册番茄账号'}
                {mode === 'forgot' && '找回与重置密码'}
              </h2>
            </div>
            <p className="text-xs text-white/80">
              {mode === 'forgot'
                ? '通过邮箱验证码安全重置并重新设置新密码'
                : '同步专注时长、专属 Webhook Token 与个性化设置'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition cursor-pointer shrink-0 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 模式切换导航 Tab */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 p-1 text-xs font-bold text-gray-600">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 text-center rounded-xl transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#E74C3C] shadow-xs'
                : 'hover:text-[#E74C3C]'
            }`}
          >
            密码登录
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('code-login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 text-center rounded-xl transition cursor-pointer ${
              mode === 'code-login'
                ? 'bg-white text-[#E74C3C] shadow-xs'
                : 'hover:text-[#E74C3C]'
            }`}
          >
            免密验证码
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 text-center rounded-xl transition cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#E74C3C] shadow-xs'
                : 'hover:text-[#E74C3C]'
            }`}
          >
            新用户注册
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 text-center rounded-xl transition cursor-pointer ${
              mode === 'forgot'
                ? 'bg-white text-[#E74C3C] shadow-xs'
                : 'hover:text-[#E74C3C]'
            }`}
          >
            找回密码
          </button>
        </div>

        {/* 表单内容区域 */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {/* 错误提示条 */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-1.5 animate-shake">
              <span className="font-bold">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 成功信息条 */}
          {successMessage && (
            <div className="p-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
              {testCodeHint && (
                <button
                  type="button"
                  onClick={handleAutoFillCode}
                  className="font-bold underline text-green-800 hover:text-green-950 cursor-pointer text-[11px]"
                >
                  点击一键填入 [{testCodeHint}]
                </button>
              )}
            </div>
          )}

          {/* 邮箱输入框 */}
          <div className="space-y-1">
            <label className="font-bold text-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#E74C3C]" /> 注册邮箱
              </span>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[#E74C3C] hover:underline font-normal text-[11px] cursor-pointer"
                >
                  忘记密码？
                </button>
              )}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的邮箱，如 example@tomato.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/30 focus:border-[#E74C3C] text-gray-800"
              required
            />
          </div>

          {/* 注册专属字段：昵称与头像选择 */}
          {mode === 'register' && (
            <>
              <div className="space-y-1">
                <label className="font-bold text-gray-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#E74C3C]" /> 用户昵称
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="起一个响亮的自律昵称"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/30 focus:border-[#E74C3C] text-gray-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#E74C3C]" /> 选择头像标志
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setAvatar(p.emoji)}
                      className={`py-1.5 px-2 rounded-xl border text-center transition flex flex-col items-center gap-0.5 cursor-pointer ${
                        avatar === p.emoji
                          ? 'border-[#E74C3C] bg-red-50 ring-2 ring-[#E74C3C]/20'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{p.emoji}</span>
                      <span className="text-[10px] text-gray-600 truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 验证码输入行（验证码登录 & 找回密码） */}
          {(mode === 'code-login' || mode === 'forgot') && (
            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#E74C3C]" /> 6位邮箱验证码
                </span>
                {testCodeHint && (
                  <span className="text-[10px] text-green-600 font-mono">
                    测试码: {testCodeHint}
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="输入 6 位数字验证码"
                  maxLength={6}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/30 focus:border-[#E74C3C] text-gray-800 tracking-widest font-mono text-center text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || countdown > 0}
                  className={`px-3 py-2.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer text-xs ${
                    countdown > 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#E74C3C]/10 text-[#E74C3C] hover:bg-[#E74C3C]/20 border border-[#E74C3C]/30'
                  }`}
                >
                  {countdown > 0 ? `${countdown}s 后重新获取` : '获取验证码'}
                </button>
              </div>
            </div>
          )}

          {/* 密码输入框（非免密登录模式） */}
          {mode !== 'code-login' && (
            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#E74C3C]" />
                  {mode === 'forgot' ? '新密码 (至少 6 位)' : '登录密码'}
                </span>
                <span className="text-[10px] text-gray-400 font-normal">至少 6 位</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'forgot' ? '请设置不少于 6 位的新密码' : '请输入密码'}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/30 focus:border-[#E74C3C] text-gray-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* 确认新密码（注册 & 找回密码） */}
          {(mode === 'register' || mode === 'forgot') && (
            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#E74C3C]" /> 再次确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入相同密码"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/30 focus:border-[#E74C3C] text-gray-800"
                required
              />
            </div>
          )}

          {/* 提交主按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white font-bold text-sm shadow-md shadow-red-500/25 hover:brightness-105 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span>处理中...</span>
            ) : (
              <>
                <span>
                  {mode === 'login' && '立即登录'}
                  {mode === 'code-login' && '验证码登录 / 注册'}
                  {mode === 'register' && '创建并激活番茄账号'}
                  {mode === 'forgot' && '确认重置并登录'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 底部快捷操作与体验账户 */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span>🚀 快速体验:</span>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="text-[#E74C3C] hover:text-[#C0392B] font-bold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              一键登录管理员体验账号
            </button>
          </div>

          <div className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
            <HelpCircle className="w-3 h-3" />
            <span>找回密码将直接验证邮箱所有权，重置后自动维持当前会话</span>
          </div>
        </div>
      </div>
    </div>
  );
}
