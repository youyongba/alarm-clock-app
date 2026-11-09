/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import {
  Server,
  Radio,
  Send,
  History,
  FileCode,
  User,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Play,
  Volume2,
  VolumeX,
  Bell,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  KeyRound,
  LogOut,
  Sparkles,
  Info,
  Clock,
  Activity,
  Flame,
  Bike,
  Code2,
  Terminal,
} from 'lucide-react';
import { playRingSound, stopAllAudio } from '@/services/audio.js';
import { updateProfile, clearAuthSession } from '@/services/auth.js';
import { AVATAR_PRESETS } from '@/utils/auth-logic.js';

/**
 * PC 端 Webhook 调度与客户端连接管理控制台组件（纯 JavaScript）
 * @param {object} props
 * @param {() => void} props.onSwitchToApp 切换到移动 APP 视图
 * @param {object | null} props.currentUser 当前登录用户
 * @param {() => void} props.onOpenAuthModal 打开登录/注册弹窗
 * @param {(mode: string) => void} props.onOpenAuthMode 打开指定模式弹窗
 * @param {string} props.wsStatus 当前前端 WebSocket 连接状态
 * @param {Array<object>} props.ringHistory 响铃历史记录
 * @param {number} props.completedPomodoros 番茄完成数
 * @param {number} props.caloriesBurned 骑行卡路里
 */
export default function PcDashboard({
  onSwitchToApp,
  currentUser,
  onOpenAuthModal,
  onOpenAuthMode,
  wsStatus,
  ringHistory = [],
  completedPomodoros = 0,
  caloriesBurned = 0,
}) {
  // 当前子模块: 'clients' (连接管理) | 'simulator' (Webhook 触发) | 'logs' (审计日志) | 'docs' (代码对接) | 'profile' (我的)
  const [currentTab, setCurrentTab] = useState('clients');

  // 服务端实时状态数据
  const [serverStatus, setServerStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());

  // Webhook 触发器表单状态
  const [triggerForm, setTriggerForm] = useState({
    eventId: `pc-evt-${Date.now().toString().slice(-6)}`,
    source: 'PC 调度控制台',
    message: 'PC 控制台手动推送：服务器运行平稳，注意定时休息！',
    durationMs: 4000,
    sound: 'ring',
    token: currentUser?.webhookToken || 'dev-token',
  });
  const [triggerResult, setTriggerResult] = useState(null);
  const [isSubmittingTrigger, setIsSubmittingTrigger] = useState(false);

  // 代码语言选择
  const [codeLang, setCodeLang] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // 我的 Profile 编辑
  const [tempNickname, setTempNickname] = useState(currentUser?.nickname || '');
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 拉取服务端状态与连接数据
  const fetchServerStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/webhook/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
        setLastRefreshedAt(Date.now());
      }
    } catch (err) {
      console.warn('[PC Console] 拉取状态失败:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // 定时自动轮询状态 (每 5 秒刷新一次)
  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchServerStatus]);

  // 更新当前用户的 Token 到表单
  useEffect(() => {
    if (currentUser?.webhookToken) {
      setTriggerForm((prev) => ({ ...prev, token: currentUser.webhookToken }));
    }
  }, [currentUser]);

  // 触发 Webhook 响铃
  const handleSendWebhook = async (e) => {
    if (e) e.preventDefault();
    if (!triggerForm.message.trim()) {
      Taro.showToast({ title: '请输入响铃提醒文案', icon: 'none' });
      return;
    }

    setIsSubmittingTrigger(true);
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
          mode: 'ring',
        }),
      });

      const data = await res.json();
      setTriggerResult({
        statusCode: res.status,
        ok: res.ok,
        data,
        timestamp: Date.now(),
      });

      if (res.ok) {
        if (data.duplicate) {
          Taro.showToast({ title: '⚠️ 事件被幂等去重过滤 (不重复响铃)', icon: 'none' });
        } else {
          Taro.showToast({ title: `🔔 响铃已广播至 ${data.clientsNotified || 0} 台设备`, icon: 'success' });
          // 自动刷新下一个 eventId，方便连续测试
          setTriggerForm((prev) => ({
            ...prev,
            eventId: `pc-evt-${Date.now().toString().slice(-6)}`,
          }));
        }
        fetchServerStatus();
      } else {
        Taro.showToast({ title: data.error || '触发失败', icon: 'none' });
      }
    } catch (err) {
      setTriggerResult({
        statusCode: 500,
        ok: false,
        error: err?.message || '网络请求错误',
        timestamp: Date.now(),
      });
      Taro.showToast({ title: '网络请求异常', icon: 'none' });
    } finally {
      setIsSubmittingTrigger(false);
    }
  };

  // Ping 所有客户端
  const handlePingClients = async () => {
    try {
      const res = await fetch('/api/webhook/ping-clients', { method: 'POST' });
      const data = await res.json();
      Taro.showToast({ title: data.message || '已发送心跳测试', icon: 'success' });
      fetchServerStatus();
    } catch {
      Taro.showToast({ title: '发送心跳失败', icon: 'none' });
    }
  };

  // 清空调用日志
  const handleClearLogs = async () => {
    try {
      await fetch('/api/webhook/clear-logs', { method: 'POST' });
      Taro.showToast({ title: '审计日志已清空', icon: 'success' });
      fetchServerStatus();
    } catch {
      Taro.showToast({ title: '清空失败', icon: 'none' });
    }
  };

  // 本地试听
  const handlePlayLocalSound = (soundName) => {
    playRingSound({
      sound: soundName || 'ring',
      durationMs: 3000,
      obeyMuteSwitch: false,
      message: 'PC 本地试听',
    });
  };

  // 复制代码
  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(true);
      Taro.showToast({ title: '代码已复制到剪贴板', icon: 'success' });
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  // 保存昵称
  const handleSaveNickname = async () => {
    if (!tempNickname.trim()) return;
    setIsSavingProfile(true);
    const res = await updateProfile({ nickname: tempNickname.trim() });
    setIsSavingProfile(false);
    if (res.ok) {
      Taro.showToast({ title: '昵称修改成功', icon: 'success' });
    } else {
      Taro.showToast({ title: res.message || '修改失败', icon: 'none' });
    }
  };

  // 更换头像
  const handleSelectAvatar = async (preset) => {
    setIsSavingProfile(true);
    const res = await updateProfile({ avatar: preset.emoji, avatarId: preset.id });
    setIsSavingProfile(false);
    if (res.ok) {
      setIsEditingAvatar(false);
      Taro.showToast({ title: `已换上 [${preset.name}] 头像`, icon: 'success' });
    }
  };

  // 生成外部系统对接代码
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const token = currentUser?.webhookToken || 'dev-token';

  const codeSnippets = {
    curl: `curl -X POST ${protocol}//${host}/webhook/ring \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: ${token}" \\
  -d '{
    "eventId": "evt-${Date.now().toString().slice(-6)}",
    "source": "外部系统监控",
    "message": "构建已完成，准备上线！",
    "durationMs": 4000,
    "sound": "ring"
  }'`,
    javascript: `// Node.js 或前端浏览器直接调用
async function triggerTomatoRing() {
  const response = await fetch('${protocol}//${host}/webhook/ring', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Token': '${token}'
    },
    body: JSON.stringify({
      eventId: 'evt-' + Date.now(),
      source: 'Node.js 自动化脚本',
      message: '测试环境部署完毕，请验收！',
      durationMs: 4000,
      sound: 'ring'
    })
  });
  const result = await response.json();
  console.log('响铃广播结果:', result);
}

triggerTomatoRing();`,
    python: `import requests
import time

url = "${protocol}//${host}/webhook/ring"
headers = {
    "Content-Type": "application/json",
    "X-Webhook-Token": "${token}"
}
payload = {
    "eventId": f"py-evt-{int(time.time())}",
    "source": "Python 监控守护进程",
    "message": "GPU 训练完成，热量消耗达标！",
    "durationMs": 5000,
    "sound": "focus-end"
}

response = requests.post(url, json=payload, headers=headers)
print("响铃响应:", response.status_code, response.json())`,
  };

  const activeClients = serverStatus?.activeClients || [];
  const recentLogs = serverStatus?.recentLogs || [];

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-gray-800 flex flex-col font-sans selection:bg-red-200">
      {/* 顶部 PC 专属导航栏 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-red-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo 与主标题 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E74C3C] to-[#C0392B] flex items-center justify-center text-white text-xl shadow-md shadow-red-500/20">
              🍅
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                  番茄 Webhook 控制台
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#E74C3C] text-[10px] font-bold border border-red-200 font-mono">
                  PC Console
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                多设备 WebSocket 实时管理 · Webhook 广播推送 · 账户与历史同步
              </p>
            </div>
          </div>

          {/* 状态徽标与服务健康指标 */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>服务在线 (Port 3000/3001)</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 font-semibold">
              <Radio className="w-3.5 h-3.5 text-orange-600" />
              <span>在线客户端: {activeClients.length} 台</span>
            </div>
          </div>

          {/* 右侧动作区：APP视图切换 & 用户信息 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 切换到 APP 移动端按钮 */}
            <button
              type="button"
              onClick={onSwitchToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF0E6] hover:bg-[#FFE4D5] text-[#E74C3C] text-xs font-bold border border-red-200 transition cursor-pointer shadow-2xs active:scale-95"
              title="切换到移动端番茄钟视图"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">切换到</span>
              <span>移动 APP</span>
            </button>

            {/* 用户账号区域 */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentTab('profile')}
                  className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-gray-100 transition cursor-pointer text-left"
                  title="点击查看个人中心"
                >
                  <span className="text-xl">{currentUser.avatar || '🍅'}</span>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-gray-800 leading-tight">
                      {currentUser.nickname}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono leading-tight">
                      {currentUser.email}
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenAuthMode('login')}
                  className="px-3 py-1.5 rounded-xl bg-[#E74C3C] hover:bg-[#C0392B] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthMode('register')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 transition cursor-pointer hidden sm:block"
                >
                  注册
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主工作区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col">
        {/* 顶部标签页切换条 */}
        <div className="flex items-center justify-between border-b border-red-100/80 pb-3 mb-6 flex-wrap gap-3">
          <nav className="flex items-center gap-1 sm:gap-2 p-1 bg-white rounded-2xl shadow-xs border border-red-100 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setCurrentTab('clients')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'clients'
                  ? 'bg-[#E74C3C] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#E74C3C]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>WebSocket 客户端</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  currentTab === 'clients' ? 'bg-white/25 text-white' : 'bg-red-50 text-[#E74C3C]'
                }`}
              >
                {activeClients.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('simulator')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'simulator'
                  ? 'bg-[#E74C3C] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#E74C3C]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Webhook 触发器</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('logs')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'logs'
                  ? 'bg-[#E74C3C] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#E74C3C]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>调用与审计日志</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  currentTab === 'logs' ? 'bg-white/25 text-white' : 'bg-red-50 text-[#E74C3C]'
                }`}
              >
                {recentLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('docs')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'docs'
                  ? 'bg-[#E74C3C] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#E74C3C]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>对接代码生成器</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('profile')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'profile'
                  ? 'bg-[#E74C3C] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#E74C3C]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>我的账户与凭证</span>
            </button>
          </nav>

          {/* 快捷操作：本地音频试听与状态刷新 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePlayLocalSound('ring')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-gray-700 hover:text-[#E74C3C] border border-red-100 text-xs font-bold transition cursor-pointer shadow-2xs"
              title="本地扬声器试听 ring.mp3"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#E74C3C]" />
              <span>PC 本地试听</span>
            </button>

            <button
              type="button"
              onClick={fetchServerStatus}
              disabled={isLoadingStatus}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-50"
              title="刷新实时状态"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-[#E74C3C]' : ''}`} />
              <span className="hidden sm:inline">刷新</span>
            </button>
          </div>
        </div>

        {/* 选项卡内容区 */}

        {/* TAB 1: 客户端连接管理 */}
        {currentTab === 'clients' && (
          <div className="space-y-6">
            {/* 核心指标统计卡片组 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold">在线 WebSocket 客户端</div>
                  <div className="text-2xl font-black text-gray-900 font-mono mt-0.5">
                    {activeClients.length} <span className="text-xs font-normal text-gray-500">台设备</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E74C3C] flex items-center justify-center text-xl shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold">历史 Webhook 广播</div>
                  <div className="text-2xl font-black text-gray-900 font-mono mt-0.5">
                    {recentLogs.length} <span className="text-xs font-normal text-gray-500">次处理</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold">幂等去重防重复缓存</div>
                  <div className="text-2xl font-black text-gray-900 font-mono mt-0.5">
                    {serverStatus?.dedupSize || 0} <span className="text-xs font-normal text-gray-500">条记录</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-400 font-semibold">当前生效 Token</div>
                  <div className="text-sm font-bold text-[#E74C3C] font-mono mt-1 truncate">
                    {currentUser?.webhookToken || serverStatus?.defaultToken || 'dev-token'}
                  </div>
                </div>
              </div>
            </div>

            {/* 客户端列表表格 */}
            <div className="bg-white rounded-3xl border border-red-100 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[#E74C3C]" />
                    <span>实时已连接的客户端设备</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    外部系统调用 Webhook 时，服务端将即时广播响铃给以下所有活跃连接
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePingClients}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#E74C3C] text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>广播 Ping 心跳测试</span>
                  </button>
                </div>
              </div>

              {activeClients.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300 mb-3">
                    <Radio className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-700">暂无活跃 WebSocket 客户端连接</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    请打开本页面的 APP 移动端视图或在手机浏览器中访问，页面将自动建立 WebSocket 响铃连接
                  </p>
                  <button
                    type="button"
                    onClick={onSwitchToApp}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#E74C3C] text-white text-xs font-bold shadow-xs hover:bg-[#C0392B] transition cursor-pointer"
                  >
                    进入 APP 端建立连接
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-[#FFF8F4] text-gray-500 font-bold border-b border-red-50">
                      <tr>
                        <th className="px-5 py-3">设备与客户端类型</th>
                        <th className="px-5 py-3">客户端 ID</th>
                        <th className="px-5 py-3">IP 地址</th>
                        <th className="px-5 py-3">绑定服务端</th>
                        <th className="px-5 py-3">在线时长</th>
                        <th className="px-5 py-3 text-right">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeClients.map((client) => (
                        <tr key={client.id} className="hover:bg-red-50/30 transition">
                          <td className="px-5 py-3.5 font-bold text-gray-800 flex items-center gap-2">
                            {client.platform.includes('iOS') ? (
                              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">📱</span>
                            ) : client.platform.includes('Android') ? (
                              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">🤖</span>
                            ) : (
                              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">💻</span>
                            )}
                            <span>{client.platform}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-gray-500 text-[11px]">
                            {client.id}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-gray-700">
                            {client.ip || '127.0.0.1'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono text-[11px]">
                              {client.server || 'Port-3000'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-gray-500">
                            {client.onlineDurationSec} 秒前上线
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              在线就绪
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Webhook 模拟与广播触发器 */}
        {currentTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 左侧：表单配置 */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-red-100 shadow-xs space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#E74C3C]" />
                    <span>Webhook 响铃模拟与广播推送</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    从控制台直接向服务端发送 POST /webhook/ring 请求，验证广播与防静音响铃
                  </p>
                </div>
              </div>

              {/* 常用模板胶囊 */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  快捷预设测试文案:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '🔔 服务器 CPU 超过 90% 警戒线！',
                    '🚀 GitHub Actions 构建部署成功！',
                    '💧 喝水与站立活动提醒 (久坐已超过 45 分钟)',
                    '🍅 番茄专注结束，请进行 5 分钟深呼吸放松',
                    '📦 外部系统收到新订单提醒',
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setTriggerForm((prev) => ({ ...prev, message: tpl }))}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-[#E74C3C] border border-gray-200 transition cursor-pointer font-medium text-left"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSendWebhook} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    提醒消息 (message) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={triggerForm.message}
                    onChange={(e) => setTriggerForm({ ...triggerForm, message: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#E74C3C] focus:bg-white transition"
                    placeholder="请输入响铃时前端页面需要弹出显示的 Banner 文案..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      调用来源 (source)
                    </label>
                    <input
                      type="text"
                      value={triggerForm.source}
                      onChange={(e) => setTriggerForm({ ...triggerForm, source: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#E74C3C]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      响铃时长 (毫秒 durationMs)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1000"
                        max="30000"
                        step="500"
                        value={triggerForm.durationMs}
                        onChange={(e) => setTriggerForm({ ...triggerForm, durationMs: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 font-mono text-center focus:outline-none focus:border-[#E74C3C]"
                      />
                      <span className="text-xs text-gray-400 shrink-0 font-mono">
                        {(Number(triggerForm.durationMs) / 1000).toFixed(1)} 秒
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      响铃音效 (sound)
                    </label>
                    <select
                      value={triggerForm.sound}
                      onChange={(e) => setTriggerForm({ ...triggerForm, sound: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#E74C3C]"
                    >
                      <option value="ring">🔔 标准响铃 (ring.mp3)</option>
                      <option value="focus-end">✨ 专注结束 (focus-end.mp3)</option>
                      <option value="break-end">🍃 休息结束 (break-end.mp3)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      X-Webhook-Token 鉴权凭证
                    </label>
                    <input
                      type="text"
                      value={triggerForm.token}
                      onChange={(e) => setTriggerForm({ ...triggerForm, token: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-[#E74C3C] focus:outline-none focus:border-[#E74C3C]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">
                      事件唯一 ID (eventId - 用于幂等去重测试)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setTriggerForm((prev) => ({
                          ...prev,
                          eventId: `pc-evt-${Date.now().toString().slice(-6)}`,
                        }))
                      }
                      className="text-[11px] text-[#E74C3C] hover:underline cursor-pointer"
                    >
                      重新生成新 ID
                    </button>
                  </div>
                  <input
                    type="text"
                    value={triggerForm.eventId}
                    onChange={(e) => setTriggerForm({ ...triggerForm, eventId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono text-gray-700 focus:outline-none focus:border-[#E74C3C]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    💡 提示：使用同一个 eventId 再次点击，可测试服务端幂等去重逻辑（返回 200 duplicate: true 且不重复响铃）
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTrigger}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#E74C3C] to-[#C0392B] hover:brightness-105 active:scale-98 text-white font-bold text-xs shadow-md shadow-red-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${isSubmittingTrigger ? 'animate-bounce' : ''}`} />
                  <span>{isSubmittingTrigger ? '正在广播...' : '🚀 立即触发 Webhook 响铃 (推送至所有在线设备)'}</span>
                </button>
              </form>
            </div>

            {/* 右侧：实时调用响应面板 */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-xs flex flex-col h-full">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>调用结果实时反馈</span>
                  </h3>
                  {triggerResult && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        triggerResult.ok
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      HTTP {triggerResult.statusCode}
                    </span>
                  )}
                </div>

                {triggerResult ? (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div
                      className={`p-3.5 rounded-2xl border ${
                        triggerResult.ok
                          ? triggerResult.data?.duplicate
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        {triggerResult.ok ? (
                          triggerResult.data?.duplicate ? (
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{triggerResult.data?.message || triggerResult.error}</span>
                      </div>
                      <div className="text-[11px] mt-1 font-mono">
                        已通知设备: {triggerResult.data?.clientsNotified ?? 0} 台 | 耗时: 约 12ms
                      </div>
                    </div>

                    <div className="flex-1 bg-gray-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] overflow-auto max-h-[360px]">
                      <div className="text-gray-500 mb-1">// Server Response Payload</div>
                      <pre>{JSON.stringify(triggerResult.data || triggerResult, null, 2)}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-gray-400 flex-1">
                    <Terminal className="w-10 h-10 mb-2 text-gray-300" />
                    <p className="text-xs">点击左侧“立即触发”后，此处将实时展示服务端返回的 JSON 数据与接收设备数量</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 调用与审计日志 */}
        {currentTab === 'logs' && (
          <div className="bg-white rounded-3xl border border-red-100 shadow-xs overflow-hidden space-y-0">
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空调用日志</span>
                </button>
              </div>
            </div>

            {recentLogs.length === 0 ? (
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
                    {recentLogs.map((log) => (
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
                          {Math.round(log.durationMs / 1000)}s · {log.sound}
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
        )}

        {/* TAB 4: 对接代码生成器 */}
        {currentTab === 'docs' && (
          <div className="bg-white rounded-3xl border border-red-100 shadow-xs p-6 space-y-6">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#E74C3C]" />
                  <span>外部系统 Webhook 对接代码生成器</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  已自动填入当前登录用户的专属 Token 与当前服务地址，复制后即可直接运行
                </p>
              </div>

              {/* 语言切换标签 */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                {['curl', 'javascript', 'python'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCodeLang(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer capitalize ${
                      codeLang === lang
                        ? 'bg-white text-[#E74C3C] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {lang === 'javascript' ? 'JavaScript / Node' : lang}
                  </button>
                ))}
              </div>
            </div>

            {/* 代码展示与复制区 */}
            <div className="relative group">
              <pre className="bg-gray-950 text-gray-100 p-5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border border-gray-800">
                {codeSnippets[codeLang]}
              </pre>

              <button
                type="button"
                onClick={() => handleCopyCode(codeSnippets[codeLang])}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-md cursor-pointer border border-white/10"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '已复制' : '复制完整代码'}</span>
              </button>
            </div>

            {/* 接口文档速查卡 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-red-100 space-y-1">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E74C3C]" />
                  <span>接口 URL</span>
                </div>
                <div className="text-xs font-mono font-bold text-[#E74C3C]">
                  POST /webhook/ring
                </div>
                <div className="text-[11px] text-gray-500">
                  支持端口 3000 (主服务) 与 3001 (独立服务) 均可调用
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-red-100 space-y-1">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>请求头鉴权</span>
                </div>
                <div className="text-xs font-mono font-bold text-gray-800">
                  X-Webhook-Token: {token}
                </div>
                <div className="text-[11px] text-gray-500">
                  与 APP 账号密码同步绑定，独立隔离
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-red-100 space-y-1">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>内置特性</span>
                </div>
                <div className="text-xs font-bold text-gray-800">
                  幂等去重 · 静音穿透 · 多端广播
                </div>
                <div className="text-[11px] text-gray-500">
                  重复 eventId 自动过滤，iPhone 静音拨片音频强开
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: 我的账户与凭证 (和 APP 用户名密码完全共用) */}
        {currentTab === 'profile' && (
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {currentUser ? (
              <div className="bg-white rounded-3xl border border-red-100 shadow-xs p-6 space-y-6">
                <div className="border-b border-gray-100 pb-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                      className="w-16 h-16 rounded-2xl bg-red-50 border-2 border-red-200 flex items-center justify-center text-4xl shadow-xs hover:scale-105 active:scale-95 transition cursor-pointer relative"
                      title="点击更换头像"
                    >
                      <span>{currentUser.avatar || '🍅'}</span>
                      <span className="absolute bottom-0 right-0 bg-[#E74C3C] text-white text-[9px] px-1 rounded-full font-bold">
                        换
                      </span>
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">{currentUser.nickname}</h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                          自律达人
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                        <span>邮箱: {currentUser.email}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                          已验证
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        用户 ID: {currentUser.uid}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenAuthMode('forgot')}
                      className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 transition cursor-pointer"
                    >
                      修改登录密码
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthSession();
                        Taro.showToast({ title: '已安全退出登录', icon: 'none' });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#E74C3C] text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>

                {/* 头像更换面板 */}
                {isEditingAvatar && (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 animate-fade-in">
                    <div className="text-xs font-bold text-gray-700 mb-2">选择新头像:</div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {AVATAR_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectAvatar(p)}
                          className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                            currentUser.avatar === p.emoji
                              ? 'border-[#E74C3C] bg-red-50 ring-2 ring-[#E74C3C]/20'
                              : 'border-gray-200 hover:bg-white'
                          }`}
                        >
                          <span className="text-2xl">{p.emoji}</span>
                          <span className="text-[10px] text-gray-600">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 与 APP 实时共享数据看板 */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>PC 与 APP 实时同步数据</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3.5 rounded-2xl bg-red-50/60 border border-red-100">
                      <div className="text-xs text-gray-500">完成番茄</div>
                      <div className="text-xl font-black text-[#E74C3C] font-mono mt-1">
                        {(currentUser.stats?.totalCompletedPomodoros || 0) + completedPomodoros}
                        <span className="text-xs font-normal text-gray-500 ml-0.5">个</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
                      <div className="text-xs text-gray-500">累计专注</div>
                      <div className="text-xl font-black text-amber-600 font-mono mt-1">
                        {(currentUser.stats?.totalFocusMinutes || 0) + completedPomodoros * 25}
                        <span className="text-xs font-normal text-gray-500 ml-0.5">分钟</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
                      <div className="text-xs text-gray-500">响铃触发</div>
                      <div className="text-xl font-black text-purple-600 font-mono mt-1">
                        {currentUser.stats?.totalWebhookRings || 0}
                        <span className="text-xs font-normal text-gray-500 ml-0.5">次</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                      <div className="text-xs text-gray-500">骑行燃脂</div>
                      <div className="text-xl font-black text-emerald-600 font-mono mt-1">
                        {(currentUser.stats?.totalCaloriesKcal || 0) + caloriesBurned}
                        <span className="text-xs font-normal text-gray-500 ml-0.5">卡</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 专属 Token 管理 */}
                <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-red-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#E74C3C]" />
                      <span>当前用户的专属 Webhook Token</span>
                    </span>
                    <span className="text-[11px] text-gray-400">APP 与 PC 共用同一个</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-red-200 flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-[#E74C3C]">{currentUser.webhookToken || 'dev-token'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.webhookToken || 'dev-token');
                        Taro.showToast({ title: '已复制 Token', icon: 'success' });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#E74C3C] font-sans font-bold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制 Token</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* 未登录引导卡片 */
              <div className="bg-white rounded-3xl border border-red-100 shadow-xs p-10 flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-100 to-amber-100 flex items-center justify-center text-4xl mb-4 shadow-inner">
                  🍅
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">登录 PC 端控制台</h2>
                <p className="text-xs text-gray-500 mb-6">
                  PC 端与移动 APP 共用同一个账号密码，登录后即可管理专属 Webhook 凭证、同步专注时长与查看多端连接
                </p>

                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenAuthMode('login')}
                    className="flex-1 py-3 rounded-2xl bg-[#E74C3C] hover:bg-[#C0392B] text-white text-xs font-bold shadow-md shadow-red-500/20 transition cursor-pointer"
                  >
                    立即登录
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuthMode('register')}
                    className="flex-1 py-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 transition cursor-pointer"
                  >
                    注册新账号
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
