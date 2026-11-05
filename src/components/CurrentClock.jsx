/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { formatCurrentTime, formatCurrentDate } from '@/utils/scheduled-timer-logic.js';
import { Clock, Calendar, Sparkles } from 'lucide-react';

/**
 * 实时当前时间组件
 * 提供精确实时秒级时钟、中文日期与时段问候
 */
export default function CurrentClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = formatCurrentTime(now);
  const dateStr = formatCurrentDate(now);

  // 根据当前小时计算亲切问候语
  const hour = now.getHours();
  let greeting = '你好';
  if (hour >= 5 && hour < 9) greeting = '清晨好，迎接高效一天';
  else if (hour >= 9 && hour < 12) greeting = '上午好，保持专注冲刺';
  else if (hour >= 12 && hour < 14) greeting = '午间好，记得吃好午饭小憩片刻';
  else if (hour >= 14 && hour < 18) greeting = '下午好，来杯水提提神';
  else if (hour >= 18 && hour < 22) greeting = '晚上好，整理今日成果';
  else greeting = '夜深了，注意休息保护身体';

  return (
    <div className="w-full max-w-xl mx-auto mb-4 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFF0E6] flex items-center justify-center text-[#E74C3C] shrink-0 shadow-inner">
          <Clock className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-gray-900">
              {timeStr}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              实时同步
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-600 bg-red-50/60 px-3 py-1.5 rounded-xl border border-red-100/60 self-stretch sm:self-auto justify-center">
        <Sparkles className="w-3.5 h-3.5 text-[#E74C3C] shrink-0" />
        <span className="font-medium truncate">{greeting}</span>
      </div>
    </div>
  );
}
