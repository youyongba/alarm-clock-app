/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Sparkles, KeyRound, Copy, LogOut, Check, ShieldCheck } from 'lucide-react';
import Taro from '@tarojs/taro';
import { updateProfile, clearAuthSession } from '@/services/auth.js';
import { AVATAR_PRESETS } from '@/utils/auth-logic.js';

/**
 * Web / PC 我的账户与专属 Webhook 凭证面板
 * @param {object} props
 * @param {object | null} props.currentUser 当前登录用户
 * @param {(mode: string) => void} props.onOpenAuthMode 打开登录/注册/找密弹窗
 * @param {number} [props.completedPomodoros=0] 本地累计完成番茄
 * @param {number} [props.caloriesBurned=0] 本地累计消耗卡路里
 */
export default function WebProfilePanel({
  currentUser,
  onOpenAuthMode,
  completedPomodoros = 0,
  caloriesBurned = 0,
}) {
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSelectAvatar = async (preset) => {
    if (!currentUser) return;
    setIsSavingProfile(true);
    const res = await updateProfile({ avatar: preset.emoji });
    setIsSavingProfile(false);
    if (res.ok) {
      setIsEditingAvatar(false);
      Taro.showToast({ title: `已换上 [${preset.name}] 头像`, icon: 'success' });
    } else {
      Taro.showToast({ title: res.error || '更换头像失败', icon: 'none' });
    }
  };

  const handleCopyToken = () => {
    const token = currentUser?.webhookToken || 'dev-token';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(token);
    }
    Taro.showToast({ title: '已复制专属 Token', icon: 'success' });
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-3xl border border-red-100 shadow-xs p-10 flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-100 to-amber-100 flex items-center justify-center text-4xl mb-4 shadow-inner">
          🍅
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">登录 PC 端控制台</h2>
        <p className="text-xs text-gray-500 mb-6">
          PC 端与移动 APP 共用同一个账号密码，登录后即可管理专属 Webhook 凭证、同步专注时长与查看多端连接
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => onOpenAuthMode('login')}
            className="flex-1 py-3 rounded-2xl bg-[#E74C3C] hover:bg-[#C0392B] text-white text-xs font-bold shadow-md shadow-red-500/20 transition cursor-pointer"
          >
            立即登录
          </button>
          <button
            type="button"
            onClick={() => onOpenAuthMode('register')}
            className="flex-1 py-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 transition cursor-pointer"
          >
            注册新账号
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="bg-white rounded-3xl border border-red-100 shadow-xs p-6 space-y-6">
        <div className="border-b border-gray-100 pb-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsEditingAvatar(!isEditingAvatar)}
              className="w-16 h-16 rounded-2xl bg-red-50 border-2 border-red-200 flex items-center justify-center text-4xl shadow-xs hover:scale-105 active:scale-95 transition cursor-pointer relative"
              title="点击更换头像"
            >
              <span>{currentUser.avatar || '🍅'}</span>
              <span className="absolute bottom-0 right-0 bg-[#E74C3C] text-white text-[9px] px-1 rounded-full font-bold">
                换
              </span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{currentUser.nickname}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                  自律达人
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <span>邮箱: {currentUser.email}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  已验证
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                用户 ID: {currentUser.uid}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuthMode('forgot')}
              className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 transition cursor-pointer"
            >
              修改登录密码
            </button>
            <button
              type="button"
              onClick={() => {
                clearAuthSession();
                Taro.showToast({ title: '已安全退出登录', icon: 'none' });
              }}
              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#E74C3C] text-xs font-bold transition cursor-pointer flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>退出登录</span>
            </button>
          </div>
        </div>

        {/* 头像更换面板 */}
        {isEditingAvatar && (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 animate-fade-in">
            <div className="text-xs font-bold text-gray-700 mb-2">选择新头像:</div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {AVATAR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectAvatar(p)}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                    currentUser.avatar === p.emoji
                      ? 'border-[#E74C3C] bg-red-50 ring-2 ring-[#E74C3C]/20'
                      : 'border-gray-200 hover:bg-white'
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-[10px] text-gray-600">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 与 APP 实时共享数据看板 */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>PC 与 APP 实时同步数据</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-red-50/60 border border-red-100">
              <div className="text-xs text-gray-500">完成番茄</div>
              <div className="text-xl font-black text-[#E74C3C] font-mono mt-1">
                {(currentUser.stats?.totalCompletedPomodoros || 0) + completedPomodoros}
                <span className="text-xs font-normal text-gray-500 ml-0.5">个</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
              <div className="text-xs text-gray-500">累计专注</div>
              <div className="text-xl font-black text-amber-600 font-mono mt-1">
                {(currentUser.stats?.totalFocusMinutes || 0) + completedPomodoros * 25}
                <span className="text-xs font-normal text-gray-500 ml-0.5">分钟</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
              <div className="text-xs text-gray-500">响铃触发</div>
              <div className="text-xl font-black text-purple-600 font-mono mt-1">
                {currentUser.stats?.totalWebhookRings || 0}
                <span className="text-xs font-normal text-gray-500 ml-0.5">次</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="text-xs text-gray-500">骑行燃脂</div>
              <div className="text-xl font-black text-emerald-600 font-mono mt-1">
                {(currentUser.stats?.totalCaloriesKcal || 0) + caloriesBurned}
                <span className="text-xs font-normal text-gray-500 ml-0.5">卡</span>
              </div>
            </div>
          </div>
        </div>

        {/* 专属 Token 管理 */}
        <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-red-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#E74C3C]" />
              <span>当前用户的专属 Webhook Token</span>
            </span>
            <span className="text-[11px] text-gray-400">APP 与 PC 共用同一个</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-red-200 flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-[#E74C3C]">{currentUser.webhookToken || 'dev-token'}</span>
            <button
              type="button"
              onClick={handleCopyToken}
              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#E74C3C] font-sans font-bold text-xs transition cursor-pointer flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>复制 Token</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
