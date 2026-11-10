/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Smartphone, LogIn, UserPlus } from 'lucide-react';

/**
 * Web / PC 控制台顶部导航栏模块
 * @param {object} props
 * @param {object} props.serverStatus 服务端状态
 * @param {object | null} props.currentUser 当前登录用户
 * @param {() => void} props.onOpenLogin 打开登录
 * @param {() => void} props.onOpenRegister 打开注册
 * @param {() => void} [props.onSwitchToMobile] 切换到移动端
 */
export default function WebHeader({
  serverStatus,
  currentUser,
  onOpenLogin,
  onOpenRegister,
  onSwitchToMobile,
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* 左侧品牌与副标 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E74C3C] to-[#FF7675] flex items-center justify-center text-white shadow-md shadow-red-500/20 text-xl font-bold select-none">
            🍅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-gray-900 tracking-tight">
                番茄 Webhook 控制台
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#E74C3C] border border-red-200">
                PC Console
              </span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">
              多设备 WebSocket 实时管理 · Webhook 广播推送 · 账户与历史同步
            </p>
          </div>
        </div>

        {/* 中间服务状态 */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>服务在线 (Port 3000/3001)</span>
          </div>
          <div className="text-gray-500 font-medium">
            在线客户端:{' '}
            <strong className="text-gray-800 font-bold">
              {serverStatus?.clientsOnline ?? 0} 台
            </strong>
          </div>
        </div>

        {/* 右侧操作与用户状态 */}
        <div className="flex items-center gap-3">
          {onSwitchToMobile && (
            <button
              type="button"
              onClick={onSwitchToMobile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition cursor-pointer"
              title="切换到移动端体验 (手机版页面)"
            >
              <Smartphone className="w-3.5 h-3.5 text-gray-600" />
              <span>
                <span className="hidden sm:inline">切换到 </span>移动 APP
              </span>
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <span className="text-lg">{currentUser.avatar || '🍅'}</span>
              <span className="text-xs font-bold text-gray-800 max-w-[120px] truncate">
                {currentUser.nickname}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>登录</span>
              </button>
              <button
                type="button"
                onClick={onOpenRegister}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#E74C3C] hover:bg-[#C0392B] shadow-sm shadow-red-500/20 active:scale-95 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>注册</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
