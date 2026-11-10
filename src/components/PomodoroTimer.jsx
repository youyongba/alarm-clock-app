/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Coffee, Flame, Square, AlertTriangle } from 'lucide-react';
import { PHASE_CONFIG } from '@/utils/timer-logic.js';

/**
 * 番茄钟核心展示与控制组件
 *
 * @param {object} props
 * @param {'focus' | 'shortBreak' | 'longBreak'} props.phase
 * @param {'idle' | 'running' | 'paused'} props.status
 * @param {string} props.formattedTime
 * @param {number} props.progress (0.0 ~ 1.0)
 * @param {number} props.completedPomodoros
 * @param {string | null} [props.pendingSwitchPhase]
 * @param {() => void} props.onStart
 * @param {() => void} props.onPause
 * @param {() => void} props.onResume
 * @param {() => void} props.onReset
 * @param {() => void} props.onSkip
 * @param {(phase: string) => void} props.onSwitchPhase
 * @param {() => void} [props.onConfirmSwitchPhase]
 * @param {() => void} [props.onCancelSwitchPhase]
 */
export default function PomodoroTimer({
  phase,
  status,
  formattedTime,
  progress,
  completedPomodoros,
  pendingSwitchPhase,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onSwitchPhase,
  onConfirmSwitchPhase,
  onCancelSwitchPhase,
}) {
  // SVG 圆环参数
  const size = 280;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  // 环形进度偏移量
  const strokeDashoffset = circumference - progress * circumference;

  const currentThemeColor = PHASE_CONFIG[phase].color;

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl shadow-red-500/5 border border-red-100 flex flex-col items-center">
      {/* 阶段选择 Tab */}
      <div className="flex items-center gap-1.5 p-1 bg-[#FFF0E6] rounded-2xl mb-6 w-full max-w-xs justify-between">
        <button
          type="button"
          onClick={() => onSwitchPhase('focus')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
            phase === 'focus'
              ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          专注 25m
        </button>
        <button
          type="button"
          onClick={() => onSwitchPhase('shortBreak')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
            phase === 'shortBreak'
              ? 'bg-[#27AE60] text-white shadow-md shadow-emerald-500/20'
              : 'text-gray-600 hover:text-[#27AE60]'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          短休 5m
        </button>
        <button
          type="button"
          onClick={() => onSwitchPhase('longBreak')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
            phase === 'longBreak'
              ? 'bg-[#2980B9] text-white shadow-md shadow-sky-500/20'
              : 'text-gray-600 hover:text-[#2980B9]'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          长休 15m
        </button>
      </div>

      {/* 圆形进度环与计时器核心 */}
      <div className="relative flex items-center justify-center my-2">
        {/* 番茄小绿叶装饰 */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
          <span className="text-2xl drop-shadow-sm select-none">🍃</span>
        </div>

        <svg width={size} height={size} className="transform -rotate-90">
          {/* 背景底环 */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#FDE8E4"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* 动态进度环 */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={currentThemeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* 内部信息展示 */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-1">
            {PHASE_CONFIG[phase].name}
          </span>
          <span className="text-5xl sm:text-6xl font-black tracking-tight text-gray-900 font-mono">
            {formattedTime}
          </span>
          <span className="mt-2 text-xs px-2.5 py-0.5 rounded-full font-medium bg-red-50 text-gray-600 border border-red-100">
            {status === 'running' ? '⏱️ 进行中' : status === 'paused' ? '⏸️ 已暂停' : '✨ 准备就绪'}
          </span>
        </div>
      </div>

      {/* 阶段切换误触确认提示条 */}
      {pendingSwitchPhase && (
        <div className="w-full mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>当前「{PHASE_CONFIG[phase]?.name}」正在进行中 (剩余 {formattedTime})</span>
          </div>
          <p className="text-amber-700 text-[11px] leading-relaxed">
            切换为「{PHASE_CONFIG[pendingSwitchPhase]?.name}」将提前结束当前阶段。是否确认切换？
          </p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onCancelSwitchPhase}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold transition cursor-pointer text-xs"
            >
              继续当前计时
            </button>
            <button
              type="button"
              onClick={onConfirmSwitchPhase}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition cursor-pointer text-xs shadow-sm"
            >
              确认切换
            </button>
          </div>
        </div>
      )}

      {/* 控制按钮区域 */}
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 mt-6 w-full">
        {status === 'idle' && (
          <button
            type="button"
            onClick={onStart}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-[#E74C3C] hover:bg-[#C0392B] active:scale-95 text-white font-bold text-base shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            开始{PHASE_CONFIG[phase].name}
          </button>
        )}

        {status === 'running' && (
          <>
            <button
              type="button"
              onClick={onPause}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-[#E74C3C] hover:bg-[#C0392B] active:scale-95 text-white font-bold text-base shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Pause className="w-5 h-5 fill-current" />
              暂停
            </button>
            <button
              type="button"
              onClick={onReset}
              title="停止当前阶段并重置"
              className="py-3.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current text-gray-600" />
              停止
            </button>
            <button
              type="button"
              onClick={onSkip}
              title="跳过当前阶段"
              className="p-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 transition cursor-pointer"
              aria-label="跳过"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              type="button"
              onClick={onResume}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-[#27AE60] hover:bg-[#219653] active:scale-95 text-white font-bold text-base shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              继续
            </button>
            <button
              type="button"
              onClick={onReset}
              title="停止并重置"
              className="py-3.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              停止
            </button>
            <button
              type="button"
              onClick={onSkip}
              title="跳过当前阶段"
              className="p-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 transition cursor-pointer"
              aria-label="跳过"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* 番茄计数器指示 */}
      <div className="mt-6 pt-4 border-t border-red-50 w-full flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-gray-600">已完成番茄:</span>
        <div className="flex items-center gap-1">
          {completedPomodoros === 0 ? (
            <span className="text-gray-400">尚未完成</span>
          ) : (
            Array.from({ length: Math.min(8, completedPomodoros) }).map((_, i) => (
              <span key={i} className="text-base select-none" title={`番茄 #${i + 1}`}>
                🍅
              </span>
            ))
          )}
          {completedPomodoros > 8 && (
            <span className="font-bold text-[#E74C3C]">+{completedPomodoros - 8}</span>
          )}
          <span className="ml-1 font-bold text-gray-700">({completedPomodoros})</span>
        </div>
      </div>
    </div>
  );
}
