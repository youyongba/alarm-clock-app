/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BellRing, VolumeX, Radio } from 'lucide-react';

/**
 * Webhook 响铃高亮横幅组件
 * 带有红色脉冲动画、倒计时进度与手动静音控制
 *
 * @param {object} props
 * @param {object | null} props.event 响铃事件数据
 * @param {() => void} props.onDismiss 关闭横幅回调
 */
export default function RingBanner({ event, onDismiss }) {
  const [percentLeft, setPercentLeft] = useState(100);

  useEffect(() => {
    if (!event) return;

    const duration = event.durationMs || 5000;
    const startTime = Date.now();
    const interval = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setPercentLeft((remaining / duration) * 100);

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [event]);

  if (!event) return null;

  return (
    <div
      role="alert"
      className="relative overflow-hidden w-full max-w-xl mx-auto my-3 rounded-2xl bg-gradient-to-r from-[#E74C3C] via-[#C0392B] to-[#962D22] text-white shadow-xl shadow-red-500/25 border-2 border-red-300/40 animate-pulse transition-all"
    >
      <div className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 animate-bounce">
            <BellRing className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-[#C0392B] shadow-xs">
                <Radio className="w-3 h-3 animate-pulse" /> Webhook 实时响铃
              </span>
              {event.source && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-black/20 text-white/90">
                  来源: {event.source}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold mt-1 text-white leading-tight">
              {event.message || '外部系统触发响铃！'}
            </h3>
            <p className="text-xs text-red-100/90 mt-0.5">
              iPhone 静音模式强制发声已激活 · 事件 ID: {event.eventId}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs font-medium backdrop-blur-xs transition cursor-pointer"
          aria-label="停止响铃并关闭"
        >
          <VolumeX className="w-4 h-4" />
          <span className="hidden sm:inline">停止响铃</span>
        </button>
      </div>

      {/* 倒计时进度条 */}
      <div className="w-full h-1.5 bg-black/20">
        <div
          className="h-full bg-white/90 transition-all duration-75 ease-linear"
          style={{ width: `${percentLeft}%` }}
        />
      </div>
    </div>
  );
}
