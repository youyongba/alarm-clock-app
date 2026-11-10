/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame, Timer, History, Hash, Bike, User as UserIcon } from 'lucide-react';

/**
 * 移动端六大核心功能 Tab 切换导航条
 * @param {object} props
 * @param {'pomodoro' | 'timer' | 'history' | 'counter' | 'cycling' | 'profile'} props.activeTab
 * @param {(tab: string) => void} props.onSwitchTab
 * @param {number} props.historyCount 触发记录数
 * @param {'idle' | 'running' | 'paused'} props.pomodoroStatus 番茄钟运行状态
 * @param {string} props.pomodoroFormattedTime 番茄钟倒计时文本
 */
export default function MobileNav({
  activeTab,
  onSwitchTab,
  historyCount = 0,
  pomodoroStatus = 'idle',
  pomodoroFormattedTime = '',
}) {
  return (
    <nav className="w-full max-w-md mx-auto mb-3 bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-red-100 shadow-xs grid grid-cols-6 gap-1">
      <button
        type="button"
        onClick={() => onSwitchTab('pomodoro')}
        className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer relative ${
          activeTab === 'pomodoro'
            ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
            : 'text-gray-600 hover:text-[#E74C3C]'
        }`}
      >
        <Flame className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">番茄钟</span>
        {activeTab !== 'pomodoro' && pomodoroStatus === 'running' && (
          <span
            className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-white shadow-xs animate-pulse leading-tight shrink-0 whitespace-nowrap"
            title={`番茄钟进行中: ${pomodoroFormattedTime}`}
          >
            {pomodoroFormattedTime}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSwitchTab('timer')}
        className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
          activeTab === 'timer'
            ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
            : 'text-gray-600 hover:text-[#E74C3C]'
        }`}
      >
        <Timer className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">定时闹钟</span>
      </button>

      <button
        type="button"
        onClick={() => onSwitchTab('history')}
        className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer relative ${
          activeTab === 'history'
            ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
            : 'text-gray-600 hover:text-[#E74C3C]'
        }`}
      >
        <History className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">触发记录</span>
        {historyCount > 0 && (
          <span
            className={`absolute -top-1 -right-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${
              activeTab === 'history' ? 'bg-white text-[#E74C3C]' : 'bg-red-100 text-[#E74C3C]'
            }`}
          >
            {historyCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSwitchTab('counter')}
        className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
          activeTab === 'counter'
            ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
            : 'text-gray-600 hover:text-[#E74C3C]'
        }`}
      >
        <Hash className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">打卡计数</span>
      </button>

      <button
        type="button"
        onClick={() => onSwitchTab('cycling')}
        className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
          activeTab === 'cycling'
            ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
            : 'text-gray-600 hover:text-[#E74C3C]'
        }`}
      >
        <Bike className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">骑行热量</span>
      </button>

      <button
        type="button"
        onClick={() => onSwitchTab('profile')}
        className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer relative ${
          activeTab === 'profile'
            ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
            : 'text-gray-600 hover:text-[#E74C3C]'
        }`}
      >
        <UserIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">我的</span>
      </button>
    </nav>
  );
}
