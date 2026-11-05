/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  getDefaultCounters,
  updateCounter,
  calculateCounterProgress,
} from '@/utils/counter-logic.js';
import { Plus, Minus, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import Taro from '@tarojs/taro';

/**
 * 多功能打卡与计数器组件
 */
export default function TallyCounter() {
  const [counters, setCounters] = useState(getDefaultCounters());
  const [activeId, setActiveId] = useState('pomodoro');

  const activeCounter = counters.find((c) => c.id === activeId) || counters[0];

  const handleUpdate = (delta) => {
    let reachedTarget = false;
    let targetName = '';

    setCounters((prev) =>
      prev.map((item) => {
        if (item.id === activeId) {
          const nextCount = updateCounter(item.count, delta, 0);
          if (nextCount === item.target && delta > 0) {
            reachedTarget = true;
            targetName = item.name;
          }
          return { ...item, count: nextCount };
        }
        return item;
      })
    );

    if (reachedTarget) {
      setTimeout(() => {
        Taro.showToast({
          title: `🎉 恭喜！${targetName} 达成目标！`,
          icon: 'success',
          duration: 3000,
        });
      }, 0);
    }
  };

  const handleReset = () => {
    setCounters((prev) =>
      prev.map((item) => (item.id === activeId ? { ...item, count: 0 } : item))
    );
  };

  const handleSetTarget = (newTarget) => {
    const val = parseInt(newTarget, 10);
    if (!isNaN(val) && val > 0) {
      setCounters((prev) =>
        prev.map((item) => (item.id === activeId ? { ...item, target: val } : item))
      );
    }
  };

  const progress = calculateCounterProgress(activeCounter.count, activeCounter.target);
  const isGoalReached = activeCounter.count >= activeCounter.target && activeCounter.target > 0;

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-xl shadow-red-500/5 border border-red-100 flex flex-col items-center">
      {/* 计数器类别切换 */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#FFF0E6] rounded-2xl mb-6 w-full">
        {counters.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveId(c.id)}
            className={`py-2 px-1 rounded-xl text-xs font-semibold transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              activeId === c.id
                ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
                : 'text-gray-600 hover:text-[#E74C3C]'
            }`}
          >
            <span className="text-base select-none">{c.icon}</span>
            <span className="truncate max-w-full">{c.name}</span>
          </button>
        ))}
      </div>

      {/* 核心计数展示大圆盘 */}
      <div className="relative my-3 flex flex-col items-center justify-center">
        {/* 背景环光晕 */}
        <div className="w-48 h-48 rounded-full bg-gradient-to-b from-[#FFF5F2] to-[#FFEBE6] border-4 border-[#FDE8E4] flex flex-col items-center justify-center shadow-inner relative">
          <span className="text-3xl select-none mb-1">{activeCounter.icon}</span>
          <span className="text-6xl font-black font-mono tracking-tight text-gray-900 leading-none">
            {activeCounter.count}
          </span>
          <span className="text-xs text-gray-500 mt-2 font-medium">
            目标: {activeCounter.target}
          </span>
        </div>

        {isGoalReached && (
          <div className="absolute -top-2 bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-md animate-bounce">
            <Trophy className="w-3.5 h-3.5" />
            今日目标已达成！
          </div>
        )}
      </div>

      {/* 进度条与百分比 */}
      <div className="w-full mt-4 mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1.5">
          <span>完成进度</span>
          <span className={isGoalReached ? 'text-emerald-600 font-bold' : 'text-gray-800'}>
            {activeCounter.count} / {activeCounter.target} ({progress}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-red-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isGoalReached ? 'bg-[#27AE60]' : 'bg-[#E74C3C]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 按钮控制区域 */}
      <div className="w-full flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleUpdate(-1)}
          className="p-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 transition cursor-pointer"
          title="减少 1"
          aria-label="减少 1"
        >
          <Minus className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => handleUpdate(1)}
          className="flex-1 py-4 px-6 rounded-2xl bg-[#E74C3C] hover:bg-[#C0392B] active:scale-95 text-white font-bold text-lg shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
          +1 打卡
        </button>

        <button
          type="button"
          onClick={() => handleUpdate(5)}
          className="py-3.5 px-4 rounded-2xl bg-[#FFF0E6] hover:bg-[#FDE2D6] active:scale-95 text-[#E74C3C] font-bold text-sm transition cursor-pointer"
          title="快速增加 5"
        >
          +5
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 transition cursor-pointer"
          title="重置"
          aria-label="重置"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* 调整目标小弹窗/折叠项 */}
      <div className="mt-6 pt-4 border-t border-red-50 w-full flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1 font-medium text-gray-600">
          <Sparkles className="w-3.5 h-3.5 text-[#E74C3C]" /> 每日目标设定:
        </span>
        <div className="flex items-center gap-1.5">
          {[4, 6, 8, 10, 12].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleSetTarget(num)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                activeCounter.target === num
                  ? 'bg-[#E74C3C] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
