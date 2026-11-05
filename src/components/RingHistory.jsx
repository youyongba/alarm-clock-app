/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { filterRecords, formatTriggerTime } from '@/utils/history-logic.js';
import { playRingSound, playFocusEndSound } from '@/services/audio.js';
import Taro from '@tarojs/taro';
import {
  Bell,
  Globe,
  Clock,
  Volume2,
  Trash2,
  Radio,
  Flame,
  CheckCircle2,
  ListFilter,
  Inbox,
} from 'lucide-react';

/**
 * 响铃与 Webhook 触发记录列表组件
 *
 * @param {object} props
 * @param {Array<object>} props.records 触发历史记录数组
 * @param {() => void} props.onClearRecords 清空所有记录
 * @param {(id: string) => void} props.onDeleteRecord 删除指定单条记录
 * @param {() => void} props.onMockWebhook 模拟触发一条 Webhook
 */
export default function RingHistory({
  records = [],
  onClearRecords,
  onDeleteRecord,
  onMockWebhook,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'webhook' | 'timer'

  const filtered = filterRecords(records, filterType);

  const handleReplay = (record) => {
    Taro.vibrateShort();
    if (record.category === 'pomodoro') {
      playFocusEndSound();
    } else {
      playRingSound({ durationMs: record.durationMs || 3000 });
    }
    Taro.showToast({
      title: `🔊 正在重放: ${record.message}`,
      icon: 'none',
      duration: 2500,
    });
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'webhook':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-[#C0392B] border border-rose-200">
            <Radio className="w-2.5 h-2.5 animate-pulse text-[#E74C3C]" />
            Webhook 广播
          </span>
        );
      case 'pomodoro':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
            <Flame className="w-2.5 h-2.5 text-[#E74C3C]" />
            番茄钟达成
          </span>
        );
      case 'timer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-2.5 h-2.5 text-amber-600" />
            倒计时到期
          </span>
        );
      case 'alarm':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            定点闹钟
          </span>
        );
      case 'test':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Volume2 className="w-2.5 h-2.5 text-blue-600" />
            手动测试
          </span>
        );
    }
  };

  const webhookCount = records.filter((r) => r.category === 'webhook').length;
  const timerCount = records.filter((r) => r.category !== 'webhook').length;

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl shadow-red-500/5 border border-red-100 flex flex-col items-center">
      {/* 头部标题与清空操作 */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-red-50 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFF0E6] flex items-center justify-center text-[#E74C3C]">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900">响铃与触发记录</h2>
            <p className="text-[11px] text-gray-500">外部 Webhook 与本地定时响铃明细</p>
          </div>
        </div>

        {records.length > 0 && (
          <button
            type="button"
            onClick={onClearRecords}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            title="清空所有记录"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空
          </button>
        )}
      </div>

      {/* 分类过滤 Tab */}
      <div className="flex items-center gap-1.5 p-1 bg-[#FFF0E6] rounded-2xl mb-4 w-full">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            filterType === 'all'
              ? 'bg-[#E74C3C] text-white shadow-xs'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <ListFilter className="w-3 h-3" />
          全部 ({records.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('webhook')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            filterType === 'webhook'
              ? 'bg-[#E74C3C] text-white shadow-xs'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <Globe className="w-3 h-3" />
          Webhook ({webhookCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('timer')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            filterType === 'timer'
              ? 'bg-[#E74C3C] text-white shadow-xs'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <Clock className="w-3 h-3" />
          定时闹钟 ({timerCount})
        </button>
      </div>

      {/* 列表内容区域 */}
      <div className="w-full space-y-2.5 max-h-[460px] overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <div className="w-full py-10 flex flex-col items-center justify-center text-center text-gray-400">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-300 mb-2">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-gray-500">暂无该类型的响铃触发记录</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              外部调用 Webhook 或本地定时到期后将自动收录
            </p>
            {onMockWebhook && (
              <button
                type="button"
                onClick={onMockWebhook}
                className="mt-3 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#E74C3C] text-xs font-bold transition cursor-pointer"
              >
                模拟触发一条 Webhook
              </button>
            )}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="w-full bg-[#FFFBF8] p-3 rounded-2xl border border-red-100 hover:border-red-200 transition shadow-xs flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getCategoryBadge(item.category)}
                  {item.source && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                      来源: {item.source}
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-mono text-gray-400 shrink-0">
                  {formatTriggerTime(item.timestamp)}
                </span>
              </div>

              {/* 核心消息展示 */}
              <div className="text-xs font-bold text-gray-800 leading-snug">
                {item.message}
              </div>

              {/* 详情与重放栏 */}
              <div className="flex items-center justify-between pt-1 border-t border-red-50/80 text-[10px] text-gray-500">
                <span className="font-mono truncate max-w-[170px]" title={item.eventId}>
                  ID: {item.eventId || item.id}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 bg-red-50 text-[#E74C3C] rounded-md font-mono">
                    {Math.round(item.durationMs / 1000)}s
                  </span>

                  <button
                    type="button"
                    onClick={() => handleReplay(item)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-red-50 text-[#E74C3C] border border-red-100 transition cursor-pointer font-semibold"
                    title="立即重放此音效"
                  >
                    <Volume2 className="w-3 h-3" />
                    重放
                  </button>

                  {onDeleteRecord && (
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(item.id)}
                      className="p-1 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                      title="删除此条"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
