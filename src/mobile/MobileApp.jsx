/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import {
  initAudio,
  playRingSound,
  testRingSound,
  stopAllAudio,
} from '@/services/audio.js';
import {
  connectWebSocket,
  disconnectWebSocket,
  onStatusChange,
  onMessage,
  getWsUrl,
  setWsUrl,
} from '@/services/websocket.js';
import { usePomodoro } from '@/hooks/usePomodoro.js';
import { createRingRecord } from '@/utils/history-logic.js';
import { getCurrentUser, subscribeAuth } from '@/services/auth.js';

import MobileHeader from './components/MobileHeader.jsx';
import MobileNav from './components/MobileNav.jsx';
import QuickActions from './components/QuickActions.jsx';
import DevPanel from './components/DevPanel.jsx';
import CurrentClock from '@/components/CurrentClock.jsx';
import PomodoroTimer from '@/components/PomodoroTimer.jsx';
import CustomTimer from '@/components/CustomTimer.jsx';
import TallyCounter from '@/components/TallyCounter.jsx';
import CyclingCalculator from '@/components/CyclingCalculator.jsx';
import RingHistory from '@/components/RingHistory.jsx';
import UserProfile from '@/components/UserProfile.jsx';
import RingBanner from '@/components/RingBanner.jsx';
import AuthModal from '@/components/AuthModal.jsx';

import '@/pages/index/index.scss';

/**
 * 移动端 App 主页面模块（完全解耦、独立运行）
 * @param {object} props
 * @param {() => void} [props.onSwitchToPc] 切换到 PC 控制台的回调
 */
export default function MobileApp({ onSwitchToPc }) {
  // 当前主功能 Tab: 'pomodoro' | 'timer' | 'history' | 'counter' | 'cycling' | 'profile'
  const [activeTab, setActiveTab] = useState('pomodoro');

  // 当前登录用户与鉴权模态框
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  // WebSocket 连接状态
  const [wsStatus, setWsStatus] = useState('disconnected');
  // 当前 Webhook 响铃事件
  const [ringEvent, setRingEvent] = useState(null);
  // 是否正在播放测试响铃
  const [isTestingRing, setIsTestingRing] = useState(false);
  // 是否开启屏幕常亮 (Wake Lock)
  const [keepScreenOn, setKeepScreenOn] = useState(true);
  // 系统与设备信息
  const [sysInfo, setSysInfo] = useState({ platform: 'desktop', isIOS: false, isAndroid: false });

  // 响铃触发历史记录
  const [ringHistory, setRingHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pomodoro_ring_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      createRingRecord({
        category: 'webhook',
        eventId: 'init-evt-001',
        source: 'GitHub Actions',
        message: '生产环境构建成功，已同步触发响铃',
        durationMs: 3000,
        timestamp: Date.now() - 1000 * 60 * 5,
      }),
      createRingRecord({
        category: 'alarm',
        message: '定点闹钟：下午站立与补水提醒',
        source: '定点闹钟',
        durationMs: 5000,
        timestamp: Date.now() - 1000 * 60 * 30,
      }),
    ];
  });

  // 自定义 WebSocket 地址与 Toast
  const [customWsUrl, setCustomWsUrl] = useState(getWsUrl());
  const [toastMessage, setToastMessage] = useState(null);

  // 通用添加响铃历史记录方法
  const addRingRecord = useCallback((params) => {
    const record = createRingRecord(params);
    setRingHistory((prev) => {
      const updated = [record, ...prev].slice(0, 100);
      try {
        localStorage.setItem('pomodoro_ring_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    return record;
  }, []);

  // 番茄钟核心业务 Hook
  const pomodoro = usePomodoro({
    onPhaseChange: (nextPhase, message) => {
      addRingRecord({
        category: 'pomodoro',
        source: '番茄时钟',
        message,
        durationMs: 4000,
        timestamp: Date.now(),
      });
    },
  });

  // 监听用户登录状态广播
  useEffect(() => {
    const unsubscribe = subscribeAuth((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // 初始化音频上下文与系统探测
  useEffect(() => {
    initAudio();
    const info = Taro.getSystemInfoSync();
    const isIOS = info.platform === 'ios' || /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = info.platform === 'android' || /android/i.test(navigator.userAgent);
    setSysInfo({
      platform: info.platform || 'web',
      isIOS,
      isAndroid,
      system: info.system || navigator.userAgent,
    });
  }, []);

  // 建立 WebSocket 连接与事件监听
  useEffect(() => {
    const unsubscribeStatus = onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubscribeMessage = onMessage((data) => {
      if (data && data.type === 'ring') {
        setRingEvent(data);
        playRingSound({
          soundType: data.sound || data.soundType || 'ring',
          durationMs: data.durationMs || 3000,
          volume: data.volume ?? 1.0,
        });

        addRingRecord({
          category: 'webhook',
          eventId: data.eventId,
          source: data.source || '外部 Webhook',
          message: data.message || '接收到远程 Webhook 触发响铃',
          durationMs: data.durationMs || 3000,
          timestamp: data.timestamp || Date.now(),
        });

        Taro.vibrateLong();
      }
    });

    connectWebSocket();

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
      disconnectWebSocket();
      stopAllAudio();
    };
  }, [addRingRecord]);

  // 控制屏幕常亮
  useEffect(() => {
    if (keepScreenOn) {
      Taro.setKeepScreenOn({ keepScreenOn: true }).catch(() => {});
    } else {
      Taro.setKeepScreenOn({ keepScreenOn: false }).catch(() => {});
    }
  }, [keepScreenOn]);

  const handleToggleKeepScreen = () => {
    const nextState = !keepScreenOn;
    setKeepScreenOn(nextState);
    setToastMessage(nextState ? '已开启屏幕常亮 (防休眠)' : '已关闭屏幕常亮');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleTestRing = async () => {
    if (isTestingRing) return;
    setIsTestingRing(true);
    setToastMessage('正在模拟发声，验证静音穿透...');
    try {
      testRingSound({ durationMs: 2500 });
      Taro.vibrateShort();
    } catch (e) {
      console.warn('测试发声异常:', e);
    } finally {
      setTimeout(() => {
        setIsTestingRing(false);
        setToastMessage(null);
      }, 2600);
    }
  };

  const handleDismissRing = () => {
    setRingEvent(null);
    stopAllAudio();
  };

  const handleClearHistory = () => {
    setRingHistory([]);
    try {
      localStorage.removeItem('pomodoro_ring_history');
    } catch {}
    Taro.showToast({ title: '已清空响铃历史', icon: 'success' });
  };

  const handleDeleteRecord = (id) => {
    setRingHistory((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem('pomodoro_ring_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleMockWebhook = () => {
    const mockData = {
      eventId: `mock-${Date.now()}`,
      source: '本地模拟触发',
      message: '测试 Webhook：构建已完成，请及时确认上线！',
      durationMs: 3000,
      timestamp: Date.now(),
    };
    setRingEvent(mockData);
    playRingSound({ durationMs: 3000 });
    addRingRecord({
      category: 'webhook',
      ...mockData,
    });
    Taro.vibrateLong();
  };

  const handleUpdateWsUrl = (newUrl) => {
    setCustomWsUrl(newUrl);
    setWsUrl(newUrl);
    setToastMessage(`正在切换至: ${newUrl}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const switchTab = (tab) => {
    Taro.vibrateShort();
    setActiveTab(tab);
  };

  return (
    <div className="pomodoro-app-container flex flex-col items-center">
      {/* 顶部标题与设备/连接状态条 */}
      <MobileHeader
        sysInfo={sysInfo}
        wsStatus={wsStatus}
        currentUser={currentUser}
        activeTab={activeTab}
        onOpenProfile={() => switchTab('profile')}
        onOpenLogin={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onSwitchToPc={onSwitchToPc}
      />

      {/* 顶部实时时钟模块 */}
      <CurrentClock />

      {/* 全局浮动 Toast */}
      {toastMessage && (
        <div className="fixed top-5 z-50 px-4 py-2 rounded-xl bg-gray-900/90 text-white text-xs font-medium shadow-lg backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Webhook 触发响铃高亮横幅 */}
      <RingBanner event={ringEvent} onDismiss={handleDismissRing} />

      {/* 六大功能分类切换导航条 */}
      <MobileNav
        activeTab={activeTab}
        onSwitchTab={switchTab}
        historyCount={ringHistory.length}
        pomodoroStatus={pomodoro.status}
        pomodoroFormattedTime={pomodoro.formattedTime}
      />

      {/* 静音测试发声与常亮控制栏 */}
      <QuickActions
        isTestingRing={isTestingRing}
        keepScreenOn={keepScreenOn}
        onTestRing={handleTestRing}
        onToggleKeepScreen={handleToggleKeepScreen}
      />

      {/* 主视图区域根据 Tab 条件渲染 */}
      <main className="w-full flex flex-col items-center justify-center py-1">
        {activeTab === 'pomodoro' && (
          <PomodoroTimer
            phase={pomodoro.phase}
            status={pomodoro.status}
            formattedTime={pomodoro.formattedTime}
            progress={pomodoro.progress}
            completedPomodoros={pomodoro.completedPomodoros}
            pendingSwitchPhase={pomodoro.pendingSwitchPhase}
            onStart={pomodoro.start}
            onPause={pomodoro.pause}
            onResume={pomodoro.resume}
            onReset={pomodoro.reset}
            onSkip={pomodoro.skip}
            onSwitchPhase={pomodoro.switchPhase}
            onConfirmSwitchPhase={pomodoro.confirmSwitchPhase}
            onCancelSwitchPhase={pomodoro.cancelSwitchPhase}
          />
        )}

        {activeTab === 'timer' && (
          <CustomTimer onRingTrigger={(record) => addRingRecord(record)} />
        )}

        {activeTab === 'history' && (
          <RingHistory
            records={ringHistory}
            onClearRecords={handleClearHistory}
            onDeleteRecord={handleDeleteRecord}
            onMockWebhook={handleMockWebhook}
          />
        )}

        {activeTab === 'counter' && <TallyCounter />}

        {activeTab === 'cycling' && <CyclingCalculator />}

        {activeTab === 'profile' && (
          <UserProfile
            user={currentUser}
            onOpenAuthModal={() => {
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
            }}
            onOpenAuthMode={(mode) => {
              setAuthModalMode(mode || 'login');
              setIsAuthModalOpen(true);
            }}
            onSwitchTab={switchTab}
            completedPomodoros={pomodoro.completedPomodoros || 0}
            caloriesBurned={currentUser?.stats?.totalCaloriesKcal || 0}
          />
        )}
      </main>

      {/* 底部开发者与云端 WSS 说明折叠面板 */}
      <DevPanel customWsUrl={customWsUrl} onUpdateWsUrl={handleUpdateWsUrl} />

      {/* 用户认证模态框 */}
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
