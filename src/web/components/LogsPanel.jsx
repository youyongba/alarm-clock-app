/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { History, Trash2, Search, Filter, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import Taro from '@tarojs/taro';

/**
 * Webhook 调用与审计日志模块
 * @param {object} props
 * @param {Array<object>} props.logs 日志列表
 * @param {() => void} [props.onRefresh] 刷新日志
 * @param {() => void} [props.onClear] 清空日志回调
 */
export default function LogsPanel({ logs = [], onRefresh, onClear }) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/webhook/logs', { method: 'DELETE' });
      if (res.ok) {
        Taro.showToast({ title: '日志已全部清空', icon: 'success' });
        if (onClear) onClear();
        if (onRefresh) onRefresh();
      } else {
        Taro.showToast({ title: '清空失败', icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '清空请求出错', icon: 'none' });
    } finally {
      setIsClearing(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'broadcasted' && log.status !== 'broadcasted') return false;
    if (filterType === 'deduplicated' && log.status !== 'deduplicated') return false;
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const matchMsg = (log.message || '').toLowerCase().includes(query);
      const matchEvent = (log.eventId || '').toLowerCase().includes(query);
      const matchSource = (log.source || '').toLowerCase().includes(query);
      return matchMsg || matchEvent || matchSource;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-red-100 shadow-xs overflow-hidden space-y-0">
      {/* 头部工具栏 */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-[#E74C3C]" />
            <span>服务端 Webhook 调用审计历史</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            记录外部系统发起的所有响铃请求、去重拦截情况与客户端广播结果
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 筛选标签 */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-[#E74C3C] shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              全部 ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('broadcasted')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterType === 'broadcasted'
                  ? 'bg-white text-emerald-600 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              广播成功
            </button>
            <button
              type="button"
              onClick={() => setFilterType('deduplicated')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterType === 'deduplicated'
                  ? 'bg-white text-amber-600 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              去重拦截
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索事件 / 消息..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#E74C3C] w-40 sm:w-48"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* 清空按钮 */}
          <button
            type="button"
            onClick={handleClearLogs}
            disabled={isClearing || logs.length === 0}
            className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空调用日志</span>
          </button>
        </div>
      </div>

      {/* 日志内容区域 */}
      {filteredLogs.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mb-2">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-700">暂无 Webhook 调用日志</h3>
          <p className="text-xs text-gray-400 mt-0.5">外部触发或在触发器中测试后将自动收录</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-[#FFF8F4] text-gray-500 font-bold border-b border-red-50">
              <tr>
                <th className="px-5 py-3">触发时间</th>
                <th className="px-5 py-3">事件 ID (eventId)</th>
                <th className="px-5 py-3">调用来源</th>
                <th className="px-5 py-3">消息正文</th>
                <th className="px-5 py-3">时长/音效</th>
                <th className="px-5 py-3">广播设备</th>
                <th className="px-5 py-3 text-right">执行状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-red-50/20 transition">
                  <td className="px-5 py-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-3 font-mono font-bold text-gray-800 text-[11px] whitespace-nowrap">
                    {log.eventId}
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                      {log.source || 'external'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">
                    {log.message}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                    {Math.round((log.durationMs || 4000) / 1000)}s · {log.sound || 'ring'}
                  </td>
                  <td className="px-5 py-3 font-bold font-mono text-[#E74C3C]">
                    {log.clientsNotified ?? 0} 台
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {log.status === 'broadcasted' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                        广播成功
                      </span>
                    ) : log.status === 'deduplicated' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                        幂等去重拦截
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                        {log.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
