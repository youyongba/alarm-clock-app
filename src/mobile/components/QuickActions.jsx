/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, Sun, RefreshCw } from 'lucide-react';

/**
 * 移动端快捷操作条：静音测试响铃与常亮防熄屏控制
 * @param {object} props
 * @param {boolean} props.isTestingRing 是否正在播放测试音
 * @param {boolean} props.keepScreenOn 是否开启屏幕常亮
 * @param {() => void} props.onTestRing 点击测试响铃
 * @param {() => void} props.onToggleKeepScreen 点击切换屏幕常亮
 */
export default function QuickActions({
  isTestingRing = false,
  keepScreenOn = true,
  onTestRing,
  onToggleKeepScreen,
}) {
  return (
    <div className="w-full max-w-md mx-auto mb-3 flex items-center justify-between gap-2 px-1">
      <button
        type="button"
        onClick={onTestRing}
        disabled={isTestingRing}
        className="flex-1 py-2 px-3 rounded-2xl bg-white hover:bg-red-50 text-gray-700 hover:text-[#E74C3C] border border-red-100 shadow-2xs font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer disabled:opacity-50"
      >
        {isTestingRing ? (
          <RefreshCw className="w-3.5 h-3.5 text-[#E74C3C] animate-spin" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-[#E74C3C]" />
        )}
        <span>测试响铃 (验证静音出声)</span>
      </button>

      <button
        type="button"
        onClick={onToggleKeepScreen}
        className={`py-2 px-3 rounded-2xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer shadow-2xs ${
          keepScreenOn
            ? 'bg-amber-50 text-amber-900 border-amber-200'
            : 'bg-white text-gray-500 border-gray-200'
        }`}
        title="防止手机或浏览器自动锁屏休眠"
      >
        <Sun className={`w-3.5 h-3.5 ${keepScreenOn ? 'text-amber-600' : 'text-gray-400'}`} />
        <span>{keepScreenOn ? '常亮已开' : '常亮已关'}</span>
      </button>
    </div>
  );
}
