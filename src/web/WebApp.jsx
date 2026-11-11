/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Send,
  History,
  Code2,
  User,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import Taro from '@tarojs/taro';
import WebHeader from './components/WebHeader.jsx';
import ClientsPanel from './components/ClientsPanel.jsx';
import TriggerPanel from './components/TriggerPanel.jsx';
import LogsPanel from './components/LogsPanel.jsx';
import CodeGenPanel from './components/CodeGenPanel.jsx';
import WebProfilePanel from './components/WebProfilePanel.jsx';
import AuthModal from '@/components/AuthModal.jsx';
import RingBanner from '@/components/RingBanner.jsx';
import { playRingSound, stopAllAudio, initAudio } from '@/services/audio.js';
import { getCurrentUser, subscribeAuth } from '@/services/auth.js';
import {
  connectWebSocket,
  disconnectWebSocket,
  onStatusChange,
  onMessage,
} from '@/services/websocket.js';
import { createRingRecord } from '@/utils/history-logic.js';
import { SESSION_STORAGE_KEY } from '@/utils/timer-logic.js';

/**
 * 解耦后的完整 Web / PC 端控制台应用主页面
 * @param {object} props
 * @param {() => void} [props.onSwitchToApp] 切换到移动 APP 视图
 * @param {object | null} [props.currentUser] 当前登录用户 (若未传则自动订阅本地会话)
 * @param {() => void} [props.onOpenAuthModal]
 * @param {(mode: string) => void} [props.onOpenAuthMode]
 * @param {number} [props.completedPomodoros]
 * @param {number} [props.caloriesBurned]
 */
export default function WebApp({
  onSwitchToApp,
  currentUser: initialUser,
  onOpenAuthModal,
  onOpenAuthMode,
  completedPomodoros: propCompletedPomodoros,
  caloriesBurned: propCaloriesBurned,
}) {
  const [currentUser, setCurrentUser] = useState(() => initialUser || getCurrentUser());
  const [currentTab, setCurrentTab] = useState('clients');
  const [serverStatus, setServerStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [ringEvent, setRingEvent] = useState(null);

  // 本地专注统计数据
  const [completedPomodoros, setCompletedPomodoros] = useState(() => {
    if (typeof propCompletedPomodoros === 'number') return propCompletedPomodoros;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) return JSON.parse(raw).completedPomodoros || 0;
    } catch {}
    return 0;
  });

  const caloriesBurned = propCaloriesBurned ?? currentUser?.stats?.totalCaloriesKcal ?? 0;

  // 监听登录态
  useEffect(() => {
    const unsub = subscribeAuth((user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  // 获取服务端实时状态（客户端列表、去重记录、日志等）
  const fetchServerStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/webhook/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch {
      // 保持静默重试
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchServerStatus();
    const timer = setInterval(fetchServerStatus, 3500);
    return () => clearInterval(timer);
  }, [fetchServerStatus]);

  // 初始化 WebSocket 与音频
  useEffect(() => {
    initAudio();

    const unsubWs = onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubMsg = onMessage((data) => {
      if (data && data.type === 'ring') {
        setRingEvent(data);
        playRingSound({
          soundType: data.sound || data.soundType || 'ring',
          durationMs: data.durationMs || 3000,
          volume: data.volume ?? 1.0,
        });
        fetchServerStatus();
      }
    });

    connectWebSocket();

    return () => {
      unsubWs();
      unsubMsg();
      disconnectWebSocket();
      stopAllAudio();
    };
  }, [fetchServerStatus]);

  // 打开认证弹窗
  const handleOpenAuth = (mode = 'login') => {
    if (onOpenAuthMode) {
      onOpenAuthMode(mode);
    } else {
      setAuthModalMode(mode);
      setIsAuthModalOpen(true);
    }
  };

  // 本地音频试听
  const handlePlayLocalSound = (sound = 'ring') => {
    playRingSound({ soundType: sound, durationMs: 3000, volume: 1.0 });
    Taro.showToast({ title: '已播放试听音频 (3秒)', icon: 'none' });
  };

  const handleSwitchToMobile = () => {
    try {
      localStorage.setItem('pomodoro_view_mode', 'app');
    } catch {}
    if (onSwitchToApp) {
      onSwitchToApp();
    } else {
      window.location.href = '/mobile';
    }
  };

  const activeClients = serverStatus?.clients || serverStatus?.activeClients || [];
  const recentLogs = serverStatus?.recentLogs || [];

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-gray-800 flex flex-col font-sans selection:bg-red-200">
      {/* 实时响铃横幅 */}
      {ringEvent && (
        <RingBanner
          event={ringEvent}
          onClose={() => {
            setRingEvent(null);
            stopAllAudio();
          }}
        />
      )}

      {/* 页面模块 1: Web 顶部导航栏 */}
      <WebHeader
        serverStatus={serverStatus}
        currentUser={currentUser}
        onOpenLogin={() => handleOpenAuth('login')}
        onOpenRegister={() => handleOpenAuth('register')}
        onSwitchToMobile={handleSwitchToMobile}
      />

      {/* 主工作区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col">
        {/* 顶部标签页切换条与全局快捷操作 */}
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

        {/* 页面模块 2: 各业务选项卡面板 */}
        {currentTab === 'clients' && (
          <ClientsPanel
            serverStatus={serverStatus}
            onRefresh={fetchServerStatus}
            onOpenApp={handleSwitchToMobile}
          />
        )}

        {currentTab === 'simulator' && (
          <TriggerPanel
            currentUser={currentUser}
            onSuccessTrigger={fetchServerStatus}
          />
        )}

        {currentTab === 'logs' && (
          <LogsPanel
            logs={recentLogs}
            onRefresh={fetchServerStatus}
            onClear={fetchServerStatus}
          />
        )}

        {currentTab === 'docs' && (
          <CodeGenPanel
            currentUser={currentUser}
          />
        )}

        {currentTab === 'profile' && (
          <WebProfilePanel
            currentUser={currentUser}
            onOpenAuthMode={handleOpenAuth}
            completedPomodoros={completedPomodoros}
            caloriesBurned={caloriesBurned}
          />
        )}
      </div>

      {/* 认证弹窗 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
