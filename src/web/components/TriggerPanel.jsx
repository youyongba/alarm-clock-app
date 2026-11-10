/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Send, Volume2, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Taro from '@tarojs/taro';
import { playRingSound } from '@/services/audio.js';

/**
 * Webhook 可视化触发器与测试控制面板
 * @param {object} props
 * @param {object | null} props.currentUser 当前登录用户
 * @param {() => void} [props.onSuccessTrigger] 触发成功回调
 */
export default function TriggerPanel({ currentUser, onSuccessTrigger }) {
  const [triggerForm, setTriggerForm] = useState({
    eventId: `pc-evt-${Date.now().toString().slice(-6)}`,
    source: 'PC 调度控制台',
    message: 'PC 控制台手动推送：服务器运行平稳，注意定时休息！',
    durationMs: 4000,
    sound: 'ring',
    token: currentUser?.webhookToken || 'dev-token',
  });

  const [triggerResult, setTriggerResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser?.webhookToken) {
      setTriggerForm((prev) => ({ ...prev, token: currentUser.webhookToken }));
    }
  }, [currentUser]);

  const handleSendWebhook = async (e) => {
    if (e) e.preventDefault();
    if (!triggerForm.message.trim()) {
      Taro.showToast({ title: '请输入响铃提醒文案', icon: 'none' });
      return;
    }

    setIsSubmitting(true);
    setTriggerResult(null);

    try {
      const res = await fetch('/webhook/ring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': triggerForm.token || 'dev-token',
        },
        body: JSON.stringify({
          eventId: triggerForm.eventId || `evt-${Date.now()}`,
          source: triggerForm.source || 'PC 控制台',
          message: triggerForm.message.trim(),
          durationMs: Number(triggerForm.durationMs) || 4000,
          sound: triggerForm.sound || 'ring',
        }),
      });

      const data = await res.json();
      setTriggerResult({
        status: res.status,
        ok: res.ok,
        data,
      });

      if (res.ok) {
        Taro.showToast({
          title: `成功广播给 ${data.clientsNotified ?? 0} 台设备`,
          icon: 'success',
        });
        setTriggerForm((prev) => ({
          ...prev,
          eventId: `pc-evt-${Date.now().toString().slice(-6)}`,
        }));
        if (onSuccessTrigger) onSuccessTrigger();
      } else {
        Taro.showToast({
          title: data.error || 'Webhook 响应错误',
          icon: 'none',
        });
      }
    } catch (err) {
      setTriggerResult({
        status: 500,
        ok: false,
        data: { error: err.message },
      });
      Taro.showToast({ title: '网络请求失败', icon: 'none' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const testAudio = () => {
    playRingSound({
      soundType: triggerForm.sound || 'default',
      durationMs: Number(triggerForm.durationMs) || 3000,
      volume: 1.0,
    });
    Taro.showToast({ title: '本地扬声器试听发声中', icon: 'none' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 sm:p-8">
      <div className="flex items-center justify-between pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E74C3C]" />
            <span>Webhook 远程推送模拟触发器</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            在线构造 HTTP POST 请求并发送给本服务，模拟外部系统（如 CI/CD、告警系统）触发响铃
          </p>
        </div>
      </div>

      <form onSubmit={handleSendWebhook} className="space-y-5 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              事件唯一 ID (eventId)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={triggerForm.eventId}
                onChange={(e) => setTriggerForm({ ...triggerForm, eventId: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-hidden focus:border-[#E74C3C]"
                placeholder="自动去重键值"
                required
              />
              <button
                type="button"
                onClick={() =>
                  setTriggerForm({
                    ...triggerForm,
                    eventId: `pc-evt-${Date.now().toString().slice(-6)}`,
                  })
                }
                className="px-2.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 cursor-pointer"
                title="重新生成随机事件ID"
              >
                刷新ID
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              触发来源 (source)
            </label>
            <input
              type="text"
              value={triggerForm.source}
              onChange={(e) => setTriggerForm({ ...triggerForm, source: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:border-[#E74C3C]"
              placeholder="例如: GitHub Actions / Jenkins / 监控系统"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            响铃提醒文案 (message) *
          </label>
          <textarea
            value={triggerForm.message}
            onChange={(e) => setTriggerForm({ ...triggerForm, message: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:border-[#E74C3C] leading-relaxed resize-none"
            placeholder="此文案将展示在所有设备的悬浮红光脉冲横幅上，并由系统记录"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              响铃持续时间 (durationMs)
            </label>
            <select
              value={triggerForm.durationMs}
              onChange={(e) =>
                setTriggerForm({ ...triggerForm, durationMs: Number(e.target.value) })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:border-[#E74C3C]"
            >
              <option value={2000}>2 秒 (轻量提醒)</option>
              <option value={3000}>3 秒 (标准)</option>
              <option value={4000}>4 秒 (推荐)</option>
              <option value={6000}>6 秒 (紧急提示)</option>
              <option value={10000}>10 秒 (强力呼叫)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">提示音效 (sound)</label>
            <select
              value={triggerForm.sound}
              onChange={(e) => setTriggerForm({ ...triggerForm, sound: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:border-[#E74C3C]"
            >
              <option value="ring">🚨 经典响铃 (高穿透急促声)</option>
              <option value="focus">🎯 专注完成 (沉稳柔和铃)</option>
              <option value="break">☕ 休息结束 (清脆提示音)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              X-Webhook-Token 凭证
            </label>
            <input
              type="text"
              value={triggerForm.token}
              onChange={(e) => setTriggerForm({ ...triggerForm, token: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-hidden focus:border-[#E74C3C]"
              placeholder="默认: dev-token"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 px-6 rounded-xl bg-[#E74C3C] hover:bg-[#C0392B] active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-red-500/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isSubmitting ? '正在广播给所有设备...' : '立即发送 Webhook 触发响铃'}</span>
          </button>

          <button
            type="button"
            onClick={testAudio}
            className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>本地试听</span>
          </button>
        </div>
      </form>

      {/* 触发结果状态反馈 */}
      {triggerResult && (
        <div
          className={`mt-6 p-4 rounded-xl border text-xs font-mono animate-fade-in ${
            triggerResult.ok
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2 font-bold mb-2">
            {triggerResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>
              HTTP 状态码: {triggerResult.status} {triggerResult.ok ? '(成功)' : '(失败)'}
            </span>
          </div>
          <pre className="p-3 bg-white/80 rounded-lg border border-gray-200 overflow-x-auto text-[11px] leading-relaxed">
            {JSON.stringify(triggerResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
