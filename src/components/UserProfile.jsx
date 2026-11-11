/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Taro from '@tarojs/taro';
import { clearAuthSession, updateProfile } from '@/services/auth.js';
import { AVATAR_PRESETS } from '@/utils/auth-logic.js';
import { playRingSound, playFocusEndSound, playBreakEndSound, testRingSound } from '@/services/audio.js';
import {
  User,
  Mail,
  ShieldCheck,
  KeyRound,
  LogOut,
  Sparkles,
  Flame,
  Bike,
  Bell,
  Clock,
  Copy,
  Check,
  Settings,
  Volume2,
  Lock,
  ChevronRight,
  RefreshCw,
  Award,
} from 'lucide-react';

/**
 * “我的” 个人中心组件（纯 JavaScript）
 * @param {object} props
 * @param {object | null} props.user 当前登录用户对象
 * @param {() => void} props.onOpenAuthModal 打开登录/注册弹窗
 * @param {(mode: string) => void} props.onOpenAuthMode 打开指定模式的登录弹窗
 * @param {number} props.completedPomodoros 今日/当前会话完成番茄数
 * @param {number} props.totalRingsCount 响铃次数
 * @param {number} props.cyclingKm 骑行公里数
 * @param {number} props.caloriesBurned 消耗卡路里
 */
export default function UserProfile({
  user,
  onOpenAuthModal,
  onOpenAuthMode,
  completedPomodoros = 0,
  totalRingsCount = 0,
  cyclingKm = 0,
  caloriesBurned = 0,
}) {
  // 编辑昵称弹窗/状态
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState(user?.nickname || '');
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [playingSound, setPlayingSound] = useState(null);

  // 本地更新昵称
  const handleSaveNickname = async () => {
    if (!tempNickname.trim()) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    setIsSaving(true);
    const res = await updateProfile({ nickname: tempNickname.trim() });
    setIsSaving(false);
    if (res.ok) {
      setIsEditingNickname(false);
      Taro.showToast({ title: '昵称更新成功', icon: 'success' });
    } else {
      Taro.showToast({ title: res.message || '更新失败', icon: 'none' });
    }
  };

  // 选择头像
  const handleSelectAvatar = async (preset) => {
    setIsSaving(true);
    const res = await updateProfile({
      avatar: preset.emoji,
      avatarId: preset.id,
    });
    setIsSaving(false);
    if (res.ok) {
      setIsEditingAvatar(false);
      Taro.showToast({ title: `已换上 [${preset.name}] 头像`, icon: 'success' });
    }
  };

  // 复制专属 Token
  const handleCopyToken = () => {
    const token = user?.webhookToken || 'dev-token';
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(true);
      Taro.showToast({ title: '已复制专属 Webhook Token', icon: 'success' });
      setTimeout(() => setCopiedToken(false), 2000);
    });
  };

  // 复制专属 cURL 命令
  const handleCopyUserCurl = () => {
    const host = window.location.host || 'localhost:3000';
    const protocol = window.location.protocol;
    const token = user?.webhookToken || 'dev-token';
    const curlCommand = `curl -X POST ${protocol}//${host}/webhook/ring \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: ${token}" \\
  -d '{"eventId":"usr-${Date.now().toString().slice(-4)}","source":"我的系统","message":"用户专属响铃","durationMs":3000}'`;

    navigator.clipboard.writeText(curlCommand).then(() => {
      setCopiedCurl(true);
      Taro.showToast({ title: '已复制专属 cURL 测试命令', icon: 'success' });
      setTimeout(() => setCopiedCurl(false), 2000);
    });
  };

  // 登出处理
  const handleLogout = () => {
    clearAuthSession();
    Taro.showToast({ title: '已安全退出登录', icon: 'none' });
  };

  // 试听音效
  const handlePreviewSound = (soundType) => {
    setPlayingSound(soundType);
    const soundLabels = {
      ring: '标准响铃 (ring.mp3)',
      'focus-end': '专注结束 (focus-end.mp3)',
      'break-end': '休息结束 (break-end.mp3)',
    };
    Taro.showToast({
      title: `正在试听: ${soundLabels[soundType] || soundType}`,
      icon: 'none',
      duration: 1500,
    });

    if (soundType === 'focus-end') {
      playFocusEndSound(() => {
        setPlayingSound((curr) => (curr === 'focus-end' ? null : curr));
      });
    } else if (soundType === 'break-end') {
      playBreakEndSound(() => {
        setPlayingSound((curr) => (curr === 'break-end' ? null : curr));
      });
    } else {
      playRingSound({
        sound: 'ring',
        durationMs: 2500,
        loop: false,
        onEnded: () => {
          setPlayingSound((curr) => (curr === 'ring' ? null : curr));
        },
      });
    }

    // 安全超时恢复状态
    setTimeout(() => {
      setPlayingSound((curr) => (curr === soundType ? null : curr));
    }, 2600);
  };

  const handleOpenAuth = (mode = 'login') => {
    if (typeof onOpenAuthMode === 'function') {
      onOpenAuthMode(mode);
    } else if (typeof onOpenAuthModal === 'function') {
      onOpenAuthModal();
    }
  };

  // 渲染试听音效卡片
  const renderSoundPreviewCard = () => (
    <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 space-y-2.5">
      <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
        <Volume2 className="w-3.5 h-3.5 text-[#E74C3C]" />
        <span>响铃音效与试听偏好</span>
      </h3>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handlePreviewSound('ring')}
          className={`py-2 px-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer relative ${
            playingSound === 'ring'
              ? 'border-[#E74C3C] bg-red-50 text-[#E74C3C] ring-2 ring-[#E74C3C]/30 shadow-xs'
              : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'
          }`}
        >
          <span className="font-bold text-[11px] flex items-center gap-1">
            <span>标准响铃</span>
            {playingSound === 'ring' && <span className="text-[10px] animate-pulse">🔊</span>}
          </span>
          <span className={`text-[10px] ${playingSound === 'ring' ? 'text-[#E74C3C] font-semibold' : 'text-gray-400'}`}>
            ring.mp3
          </span>
        </button>

        <button
          type="button"
          onClick={() => handlePreviewSound('focus-end')}
          className={`py-2 px-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer relative ${
            playingSound === 'focus-end'
              ? 'border-[#E74C3C] bg-red-50 text-[#E74C3C] ring-2 ring-[#E74C3C]/30 shadow-xs'
              : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'
          }`}
        >
          <span className="font-bold text-[11px] flex items-center gap-1">
            <span>专注结束</span>
            {playingSound === 'focus-end' && <span className="text-[10px] animate-pulse">🔊</span>}
          </span>
          <span className={`text-[10px] ${playingSound === 'focus-end' ? 'text-[#E74C3C] font-semibold' : 'text-gray-400'}`}>
            focus-end.mp3
          </span>
        </button>

        <button
          type="button"
          onClick={() => handlePreviewSound('break-end')}
          className={`py-2 px-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer relative ${
            playingSound === 'break-end'
              ? 'border-[#E74C3C] bg-red-50 text-[#E74C3C] ring-2 ring-[#E74C3C]/30 shadow-xs'
              : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'
          }`}
        >
          <span className="font-bold text-[11px] flex items-center gap-1">
            <span>休息结束</span>
            {playingSound === 'break-end' && <span className="text-[10px] animate-pulse">🔊</span>}
          </span>
          <span className={`text-[10px] ${playingSound === 'break-end' ? 'text-[#E74C3C] font-semibold' : 'text-gray-400'}`}>
            break-end.mp3
          </span>
        </button>
      </div>
    </div>
  );

  // 未登录状态展示卡片
  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4 px-3 pb-8 animate-fade-in">
        {/* 未登录大卡片 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10" />

          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-amber-100 flex items-center justify-center text-4xl shadow-inner mb-3 border-2 border-white">
            🍅
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-1">欢迎来到番茄响铃器</h2>
          <p className="text-xs text-gray-500 max-w-xs mb-5">
            登录后可同步番茄专注时长、享受专属 Webhook Token、云端记录与个性化音效
          </p>

          <div className="w-full flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenAuth('login')}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white font-bold text-xs shadow-md shadow-red-500/20 hover:brightness-105 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>登录 / 注册番茄账号</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAuth('forgot')}
              className="py-3 px-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-gray-500" />
              <span>找回密码</span>
            </button>
          </div>
        </div>

        {/* 响铃音效与试听偏好卡片 (免登录也可试听) */}
        {renderSoundPreviewCard()}

        {/* 账户优势介绍 */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-3">
          <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>登录番茄账号的专属特权</span>
          </h3>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-red-50/50 border border-red-100 flex flex-col gap-1">
              <span className="text-xl">🔔</span>
              <span className="font-bold text-gray-800">专属 Webhook</span>
              <span className="text-[11px] text-gray-500">
                独立鉴权 Token，便于与 GitHub / 钉钉 / 监控脚本联动
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col gap-1">
              <span className="text-xl">📊</span>
              <span className="font-bold text-gray-800">数据看板</span>
              <span className="text-[11px] text-gray-500">
                统计专注总时长、骑行公里数与燃脂大卡
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col gap-1">
              <span className="text-xl">🔊</span>
              <span className="font-bold text-gray-800">静音穿透保护</span>
              <span className="text-[11px] text-gray-500">
                iOS 硬件静音拨片音频强开与 Android 双重震动
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-sky-50/50 border border-sky-100 flex flex-col gap-1">
              <span className="text-xl">🛡️</span>
              <span className="font-bold text-gray-800">安全邮箱找回</span>
              <span className="text-[11px] text-gray-500">
                6位验证码极速重置密码，保障账号安全
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 已登录状态
  return (
    <div className="w-full max-w-md mx-auto space-y-3 px-3 pb-8 animate-fade-in text-xs">
      {/* 用户主要资料卡 */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-red-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-500/10 to-amber-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* 可点击更换的头像 */}
            <button
              type="button"
              onClick={() => setIsEditingAvatar(!isEditingAvatar)}
              className="relative group w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-red-50 border-2 border-red-200 flex items-center justify-center text-3xl shadow-xs transition hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              title="点击更换头像"
            >
              <span>{user.avatar || '🍅'}</span>
              <span className="absolute bottom-0 right-0 bg-[#E74C3C] text-white text-[9px] px-1 rounded-full font-bold">
                换
              </span>
            </button>

            <div className="min-w-0 flex-1">
              {/* 昵称编辑 */}
              {isEditingNickname ? (
                <div className="flex items-center gap-1.5 my-0.5">
                  <input
                    type="text"
                    value={tempNickname}
                    onChange={(e) => setTempNickname(e.target.value)}
                    maxLength={20}
                    className="px-2 py-1 rounded-lg border border-[#E74C3C] text-xs font-bold text-gray-800 w-28 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveNickname}
                    disabled={isSaving}
                    className="px-2 py-1 rounded-lg bg-[#E74C3C] text-white text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingNickname(false)}
                    className="px-1.5 py-1 text-gray-400 hover:text-gray-600 text-[11px] cursor-pointer shrink-0"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm sm:text-base font-bold text-gray-800 truncate">{user.nickname}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setTempNickname(user.nickname);
                      setIsEditingNickname(true);
                    }}
                    className="text-gray-400 hover:text-[#E74C3C] transition cursor-pointer shrink-0"
                    title="修改昵称"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 邮箱与验证标志 */}
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0 truncate">
                  <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="truncate" title={user.email}>{user.email}</span>
                </div>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 shrink-0 whitespace-nowrap">
                  <ShieldCheck className="w-2.5 h-2.5 shrink-0" /> 已验证
                </span>
              </div>

              <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                ID: {user.uid?.slice(0, 16)}...
              </div>
            </div>
          </div>

          {/* 状态徽章 */}
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200 flex items-center gap-1 shrink-0 whitespace-nowrap self-start mt-0.5">
            <Award className="w-3 h-3 text-amber-600 shrink-0" />
            <span>自律达人</span>
          </span>
        </div>

        {/* 头像更换面板 */}
        {isEditingAvatar && (
          <div className="mb-4 p-3 rounded-2xl bg-gray-50 border border-gray-200 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-700 text-[11px]">选择新头像标志:</span>
              <button
                type="button"
                onClick={() => setIsEditingAvatar(false)}
                className="text-gray-400 hover:text-gray-600 text-[11px] cursor-pointer"
              >
                收起
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleSelectAvatar(p)}
                  className={`p-1.5 rounded-xl border text-center transition flex flex-col items-center gap-0.5 cursor-pointer ${
                    user.avatar === p.emoji
                      ? 'border-[#E74C3C] bg-red-50 ring-2 ring-[#E74C3C]/20'
                      : 'border-gray-200 hover:bg-white'
                  }`}
                >
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-[9px] text-gray-600 truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 核心数据看板 */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-center">
          <div className="p-2 rounded-xl bg-red-50/60">
            <div className="text-gray-400 text-[10px]">专注完成</div>
            <div className="text-sm font-bold text-[#E74C3C] font-mono mt-0.5">
              {(user.stats?.totalCompletedPomodoros || 0) + completedPomodoros}
              <span className="text-[10px] font-normal text-gray-500 ml-0.5">个</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-amber-50/60">
            <div className="text-gray-400 text-[10px]">总专注</div>
            <div className="text-sm font-bold text-amber-600 font-mono mt-0.5">
              {(user.stats?.totalFocusMinutes || 0) + completedPomodoros * 25}
              <span className="text-[10px] font-normal text-gray-500 ml-0.5">分</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-purple-50/60">
            <div className="text-gray-400 text-[10px]">响铃触发</div>
            <div className="text-sm font-bold text-purple-600 font-mono mt-0.5">
              {(user.stats?.totalWebhookRings || 0) + totalRingsCount}
              <span className="text-[10px] font-normal text-gray-500 ml-0.5">次</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50/60">
            <div className="text-gray-400 text-[10px]">骑行燃脂</div>
            <div className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
              {(user.stats?.totalCaloriesKcal || 0) + caloriesBurned}
              <span className="text-[10px] font-normal text-gray-500 ml-0.5">卡</span>
            </div>
          </div>
        </div>
      </div>

      {/* 专属 Webhook 配置卡片 */}
      <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-800 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#E74C3C]" />
            <span>我的专属 Webhook 凭证</span>
          </span>
          <span className="text-[10px] text-gray-400">调用时带上请求头</span>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between font-mono text-[11px] text-gray-700">
          <div className="truncate mr-2">
            <span className="text-gray-400 select-none">X-Webhook-Token: </span>
            <span className="font-bold text-[#E74C3C]">{user.webhookToken || 'dev-token'}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyToken}
            className="px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-sans font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
          >
            {copiedToken ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedToken ? '已复制' : '复制Token'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopyUserCurl}
          className="w-full py-2 px-3 rounded-xl bg-red-50/70 hover:bg-red-50 text-[#E74C3C] font-bold text-[11px] border border-red-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          {copiedCurl ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>复制当前用户的专属 cURL 外部调用命令</span>
        </button>
      </div>

      {/* 音频与静音偏好设置 */}
      {renderSoundPreviewCard()}

      {/* 账户安全与操作 */}
      <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 space-y-1">
        <button
          type="button"
          onClick={() => handleOpenAuth('forgot')}
          className="w-full py-2.5 px-3 rounded-xl hover:bg-gray-50 flex items-center justify-between text-gray-700 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-bold">修改/重置登录密码</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {confirmLogout ? (
          <div className="w-full py-2 px-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between animate-fade-in">
            <span className="text-red-700 font-bold text-xs">确定要退出登录吗？</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmLogout(false);
                  handleLogout();
                }}
                className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 transition cursor-pointer"
              >
                确认退出
              </button>
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="px-2 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-[11px] transition cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="w-full py-2.5 px-3 rounded-xl hover:bg-red-50 text-red-600 flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" />
              <span className="font-bold">退出登录</span>
            </div>
            <span className="text-[11px] text-red-400">登出</span>
          </button>
        )}
      </div>
    </div>
  );
}
