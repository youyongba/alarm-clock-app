/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Laptop,
  User as UserIcon,
} from 'lucide-react';

/**
 * 移动端顶部状态栏与品牌标题模块
 * @param {object} props
 * @param {object} props.sysInfo 系统设备信息
 * @param {'connected' | 'reconnecting' | 'disconnected'} props.wsStatus WebSocket 状态
 * @param {object | null} props.currentUser 当前登录用户
 * @param {string} props.activeTab 当前激活 Tab
 * @param {() => void} props.onOpenProfile 打开个人中心
 * @param {() => void} props.onOpenLogin 打开登录弹窗
 * @param {() => void} [props.onSwitchToPc] 切换到 PC 控制台
 */
export default function MobileHeader({
  sysInfo = { isIOS: false, isAndroid: false, system: '' },
  wsStatus = 'disconnected',
  currentUser = null,
  activeTab = 'pomodoro',
  onOpenProfile,
  onOpenLogin,
  onSwitchToPc,
}) {
  return (
    <header className="w-full max-w-xl mx-auto py-2.5 px-3">
      <div className="flex items-center justify-between gap-2">
        {/* 左侧品牌与副标题 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xl sm:text-3xl select-none shrink-0 leading-none" role="img" aria-label="tomato">
            🍅
          </span>
          <div className="shrink-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <h1 className="text-base sm:text-xl font-black text-gray-900 tracking-tight whitespace-nowrap">
                番茄响铃器
              </h1>
              <span className="hidden sm:inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-[#E74C3C] border border-red-200/60 whitespace-nowrap shrink-0">
                iOS & Android 适配
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
              <span className="sm:hidden font-bold text-[#E74C3C] bg-red-50 px-1 py-0.5 rounded text-[9px] border border-red-100 shrink-0">
                双端适配
              </span>
              <span className="truncate max-w-[140px] sm:max-w-none text-gray-400">
                番茄钟 · 闹钟 · 记录 · 热量
              </span>
            </div>
          </div>
        </div>

        {/* 右侧状态徽章与用户中心按钮 */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 设备提示 (仅中大屏展开) */}
          <span
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap shrink-0"
            title={sysInfo.system}
          >
            <Smartphone className="w-3 h-3 text-gray-500 shrink-0" />
            <span>{sysInfo.isIOS ? 'iOS 适配' : sysInfo.isAndroid ? 'Android 适配' : 'Web 全端'}</span>
          </span>

          {/* WebSocket 状态徽章：移动端紧凑展示图标与点，桌面端展示文字 */}
          {wsStatus === 'connected' ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap shrink-0"
              title="WebSocket 服务正常通信中"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Wifi className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">已连接</span>
            </span>
          ) : wsStatus === 'reconnecting' ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap shrink-0"
              title="正在尝试重新连接..."
            >
              <RefreshCw className="w-3 h-3 text-amber-600 animate-spin shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">重连中</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap shrink-0"
              title="WebSocket 尚未连接"
            >
              <WifiOff className="w-3 h-3 text-rose-600 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">未连接</span>
            </span>
          )}

          {/* 用户中心 / 登录按钮 */}
          {currentUser ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className={`inline-flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-bold shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-[#E74C3C] text-white border border-[#E74C3C]'
                  : 'bg-white text-gray-800 border border-red-200 hover:border-[#E74C3C]'
              }`}
              title={`已登录：${currentUser.nickname}（点击进入个人中心）`}
            >
              <span className="text-sm leading-none shrink-0">{currentUser.avatar || '🍅'}</span>
              <span className="hidden sm:inline max-w-[100px] truncate whitespace-nowrap">
                {currentUser.nickname}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white shadow-2xs hover:brightness-105 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
              title="登录 / 注册"
            >
              <UserIcon className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">登录</span>
            </button>
          )}

          {/* 切换至 PC 端控制台按钮 */}
          {onSwitchToPc && (
            <button
              type="button"
              onClick={onSwitchToPc}
              className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-bold bg-[#FFF0E6] hover:bg-[#FFE6D5] text-[#E74C3C] border border-red-200 shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
              title="切换至 PC 端控制台（管理 Webhook 连接、在线设备与调用日志）"
            >
              <Laptop className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden whitespace-nowrap">PC端</span>
              <span className="hidden sm:inline whitespace-nowrap">PC 控制台</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
