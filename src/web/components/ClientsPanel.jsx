/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Taro from '@tarojs/taro';

/**
 * 实时在线 WebSocket 客户端监控与心跳测试面板
 * @param {object} props
 * @param {object} props.serverStatus 服务端状态信息
 * @param {() => void} props.onRefresh 刷新列表
 * @param {() => void} [props.onOpenApp] 打开移动端建立连接
 */
export default function ClientsPanel({ serverStatus, onRefresh, onOpenApp }) {
  const [isPinging, setIsPinging] = useState(false);
  const clients = serverStatus?.clients || [];

  const handlePingClients = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/webhook/ping-clients', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        Taro.showToast({
          title: `已向 ${data.pingedClients} 台设备广播心跳检测`,
          icon: 'success',
        });
        if (onRefresh) onRefresh();
      }
    } catch {
      Taro.showToast({ title: '广播心跳请求失败', icon: 'none' });
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 状态统计横幅卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              在线 WebSocket 客户端
            </p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {serverStatus?.clientsOnline ?? 0} 台设备
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              历史 Webhook 广播
            </p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {serverStatus?.historyCount ?? 0} 次处理
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E74C3C] flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              幂等去重防重复缓存
            </p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {serverStatus?.dedupCacheCount ?? 0} 条记录
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              当前生效 Token
            </p>
            <h3 className="text-sm font-mono font-bold text-gray-800 mt-1.5 truncate max-w-[150px]">
              {serverStatus?.serverToken || 'dev-token'}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 在线客户端列表卡片 */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span>实时已连接的客户端设备</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {clients.length} 在线
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              外部系统调用 Webhook 时，服务端将即时广播响铃给以下所有活跃连接
            </p>
          </div>

          <button
            type="button"
            onClick={handlePingClients}
            disabled={isPinging || clients.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPinging ? '正在 Ping...' : '广播 Ping 心跳测试'}</span>
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-3">
              <Radio className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-gray-700">暂无活跃 WebSocket 客户端连接</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              请打开本页面的 APP 移动端视图或在手机浏览器中访问，页面将自动建立 WebSocket 响铃连接
            </p>
            {onOpenApp && (
              <button
                type="button"
                onClick={onOpenApp}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E74C3C] hover:bg-[#C0392B] shadow-sm shadow-red-500/20 active:scale-95 transition cursor-pointer"
              >
                <span>进入 APP 端建立连接</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/75 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">设备类型 / 平台</th>
                  <th className="px-5 py-3.5">客户端 ID</th>
                  <th className="px-5 py-3.5">连接来源 IP</th>
                  <th className="px-5 py-3.5">心跳状态</th>
                  <th className="px-5 py-3.5">已连接时长</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client) => {
                  const isMobile =
                    /iphone|ipad|android/i.test(client.userAgent || '') ||
                    client.platform === 'ios' ||
                    client.platform === 'android';
                  return (
                    <tr key={client.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isMobile
                                ? 'bg-orange-50 text-orange-600'
                                : 'bg-blue-50 text-blue-600'
                            }`}
                          >
                            {isMobile ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Laptop className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">
                              {isMobile ? '移动手机端' : '桌面网页端'}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono truncate max-w-[200px] block">
                              {client.userAgent || 'Web 浏览器'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-gray-800">
                        {client.id}
                      </td>
                      <td className="px-5 py-4 font-mono text-gray-600">
                        {client.remoteIp || '127.0.0.1'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>正常在线 (Alive)</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 font-mono">
                        {Math.round((Date.now() - (client.connectedAt || Date.now())) / 1000)} 秒前
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
