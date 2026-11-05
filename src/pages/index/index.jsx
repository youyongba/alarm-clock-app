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
import PomodoroTimer from '@/components/PomodoroTimer.jsx';
import RingBanner from '@/components/RingBanner.jsx';
import CurrentClock from '@/components/CurrentClock.jsx';
import CustomTimer from '@/components/CustomTimer.jsx';
import TallyCounter from '@/components/TallyCounter.jsx';
import CyclingCalculator from '@/components/CyclingCalculator.jsx';
import RingHistory from '@/components/RingHistory.jsx';
import {
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  Check,
  Info,
  Terminal,
  Volume2,
  ChevronDown,
  ChevronUp,
  Flame,
  Timer,
  Hash,
  Smartphone,
  Sun,
  Bike,
  Globe,
  History,
} from 'lucide-react';
import './index.scss';

export default function IndexPage() {
  // 当前主功能 Tab: 'pomodoro' | 'timer' | 'counter' | 'cycling' | 'history'
  const [activeTab, setActiveTab] = useState('pomodoro');

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
    // 初始示例记录，帮助用户一目了然
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

  // curl 复制成功标记
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedCloudCurl, setCopiedCloudCurl] = useState(false);
  // 展开开发者调试控制台
  const [showDevPanel, setShowDevPanel] = useState(false);
  // 自定义 WebSocket 地址
  const [customWsUrl, setCustomWsUrl] = useState(getWsUrl());
  // Toast 消息
  const [toastMessage, setToastMessage] = useState(null);

  // 通用添加响铃历史记录方法
  const addRingRecord = useCallback((params) => {
    const record = createRingRecord(params);
    setRingHistory((prev) => {
      const updated = [record, ...prev].slice(0, 50);
      try {
        localStorage.setItem('pomodoro_ring_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // 番茄钟核心业务 Hook
  const pomodoro = usePomodoro({
    onPhaseChange: (nextPhase, message) => {
      console.log(`[Pomodoro] 阶段变更为 ${nextPhase}: ${message}`);
      addRingRecord({
        category: 'pomodoro',
        message: nextPhase === 'focus' ? '休息结束，开始新专注' : '专注阶段完成，开始休息',
        source: '番茄时钟',
        durationMs: 3000,
      });
    },
  });

  // 1. 初始化音频配置与设备信息检测
  useEffect(() => {
    initAudio();
    const info = Taro.getSystemInfoSync();
    setSysInfo(info);

    if (info.hasWakeLock) {
      Taro.setKeepScreenOn({ keepScreenOn: true });
    }
  }, []);

  // 屏幕常亮开关控制
  const handleToggleWakeLock = async () => {
    const nextState = !keepScreenOn;
    setKeepScreenOn(nextState);
    await Taro.setKeepScreenOn({
      keepScreenOn: nextState,
      success: () => {
        Taro.showToast({
          title: nextState ? '已开启屏幕常亮保持' : '已关闭屏幕常亮',
          icon: 'none',
        });
      },
    });
  };

  // 2. 监听全局 Taro Toast 自定义事件
  useEffect(() => {
    const handleToast = (e) => {
      if (e.detail?.title) {
        setToastMessage(e.detail.title);
        setTimeout(() => setToastMessage(null), e.detail.duration || 3000);
      }
    };
    window.addEventListener('taro-toast', handleToast);
    return () => window.removeEventListener('taro-toast', handleToast);
  }, []);

  // 3. 处理 Webhook 广播到达事件
  const handleRingBroadcast = useCallback((data) => {
    if (data.type === 'ring') {
      console.log('🚨 [Page] 收到 Webhook 响铃广播，立即启动强制播放:', data);

      setRingEvent(data);

      // 记录到 Webhook 触发记录列表
      addRingRecord({
        category: 'webhook',
        eventId: data.eventId,
        source: data.source,
        message: data.message,
        durationMs: data.durationMs || 5000,
        sound: data.sound,
      });

      playRingSound({
        durationMs: data.durationMs || 5000,
        onEnded: () => {
          console.log('🔔 [Page] 响铃播放结束');
        },
      });

      const duration = data.durationMs || 5000;
      setTimeout(() => {
        setRingEvent((prev) => (prev?.eventId === data.eventId ? null : prev));
      }, duration + 500);
    }
  }, [addRingRecord]);

  // 4. 初始化 WebSocket 连接并监听
  useEffect(() => {
    connectWebSocket();

    const unsubStatus = onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubMessage = onMessage((data) => {
      handleRingBroadcast(data);
    });

    return () => {
      unsubStatus();
      unsubMessage();
      disconnectWebSocket();
    };
  }, [handleRingBroadcast]);

  // 手动测试响铃
  const handleTestRing = () => {
    if (isTestingRing) {
      stopAllAudio();
      setIsTestingRing(false);
      return;
    }

    setIsTestingRing(true);
    setToastMessage('正在播放测试响铃（含震动与声音）...');

    addRingRecord({
      category: 'test',
      message: '用户本地主动测试响铃',
      durationMs: 3000,
      source: '本地测试',
    });

    testRingSound(() => {
      setIsTestingRing(false);
    });

    setTimeout(() => {
      setIsTestingRing(false);
    }, 3100);
  };

  // 手动停止 Webhook 响铃
  const handleDismissRing = () => {
    stopAllAudio();
    setRingEvent(null);
  };

  // 清空所有记录
  const handleClearHistory = () => {
    setRingHistory([]);
    try {
      localStorage.removeItem('pomodoro_ring_history');
    } catch {}
    Taro.showToast({ title: '已清空响铃触发记录', icon: 'none' });
  };

  // 删除单条记录
  const handleDeleteRecord = (id) => {
    setRingHistory((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem('pomodoro_ring_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 模拟从外部触发一条 Webhook
  const handleMockWebhook = () => {
    const mockData = {
      type: 'ring',
      eventId: `mock-${Date.now().toString().slice(-4)}`,
      source: '模拟调用',
      message: '测试 Webhook 实时触发记录',
      durationMs: 3000,
      sound: 'ring',
      receivedAt: Date.now(),
    };
    handleRingBroadcast(mockData);
  };

  // 本地 3001 curl 命令
  const localCurlCommand = `curl -X POST http://localhost:3001/webhook/ring \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: dev-token" \\
  -d '{"eventId":"test-${Date.now().toString().slice(-4)}","source":"curl","message":"喝水提醒","durationMs":3000,"sound":"ring","mode":"ring"}'`;

  // 云端公网安全 curl 命令
  const cloudCurlCommand = `curl -X POST https://ais-dev-qg27xsixd57abfoxwf5fav-665504981051.asia-east1.run.app/webhook/ring \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: dev-token" \\
  -d '{"eventId":"cloud-${Date.now().toString().slice(-4)}","source":"外部系统","message":"线上远程响铃测试","durationMs":4000}'`;

  const copyLocalCurl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(localCurlCommand);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const copyCloudCurl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cloudCurlCommand);
      setCopiedCloudCurl(true);
      setTimeout(() => setCopiedCloudCurl(false), 2000);
    }
  };

  const handleUpdateWsUrl = (e) => {
    e.preventDefault();
    setWsUrl(customWsUrl);
    setToastMessage(`正在切换至: ${customWsUrl}`);
  };

  const switchTab = (tab) => {
    Taro.vibrateShort();
    setActiveTab(tab);
  };

  return (
    <div className="pomodoro-app-container flex flex-col items-center">
      {/* 顶部标题与设备/连接状态条 */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between py-3 px-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl select-none" role="img" aria-label="tomato">
            🍅
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              番茄响铃器
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-[#E74C3C]">
                iOS & Android
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span>番茄钟 · 定时闹钟 · 触发记录 · 骑行热量</span>
            </div>
          </div>
        </div>

        {/* 状态徽章组合 */}
        <div className="flex items-center gap-1.5">
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200"
            title={sysInfo.system}
          >
            <Smartphone className="w-3 h-3 text-gray-500" />
            {sysInfo.isIOS ? 'iOS 适配' : sysInfo.isAndroid ? 'Android 适配' : 'Web 全端'}
          </span>

          {wsStatus === 'connected' ? (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs"
              title="WebSocket 服务正常通信中"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              已连接
            </span>
          ) : wsStatus === 'reconnecting' ? (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs"
              title="正在尝试重新连接..."
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              重连中
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-xs"
              title="WebSocket 尚未连接"
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              未连接
            </span>
          )}
        </div>
      </header>

      {/* 顶部实时时钟模块 */}
      <CurrentClock />

      {/* 顶部全局浮动 Toast */}
      {toastMessage && (
        <div className="fixed top-5 z-50 px-4 py-2 rounded-xl bg-gray-900/90 text-white text-xs font-medium shadow-lg backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Webhook 触发响铃高亮横幅 */}
      <RingBanner event={ringEvent} onDismiss={handleDismissRing} />

      {/* 主功能分类切换导航条 (5 大功能平滑切换) */}
      <nav className="w-full max-w-md mx-auto mb-3 bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-red-100 shadow-xs grid grid-cols-5 gap-1">
        <button
          type="button"
          onClick={() => switchTab('pomodoro')}
          className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
            activeTab === 'pomodoro'
              ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">番茄钟</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('timer')}
          className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
            activeTab === 'timer'
              ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <Timer className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">定时闹钟</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('history')}
          className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer relative ${
            activeTab === 'history'
              ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">触发记录</span>
          {ringHistory.length > 0 && (
            <span
              className={`absolute top-1 right-1 sm:static text-[9px] px-1 rounded-full font-mono ${
                activeTab === 'history' ? 'bg-white text-[#E74C3C]' : 'bg-red-100 text-[#E74C3C]'
              }`}
            >
              {ringHistory.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('counter')}
          className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
            activeTab === 'counter'
              ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <Hash className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">打卡计数</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('cycling')}
          className={`py-2 px-0.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
            activeTab === 'cycling'
              ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <Bike className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">骑行热量</span>
        </button>
      </nav>

      {/* 快捷操作栏：测试响铃 + 屏幕常亮保持控制 */}
      <div className="w-full max-w-md mx-auto mb-3 px-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleTestRing}
          className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition btn-tomato-press cursor-pointer ${
            isTestingRing
              ? 'bg-amber-500 text-white shadow-amber-500/25 ring-2 ring-amber-300'
              : 'bg-white text-gray-800 hover:bg-gray-50 border border-red-100'
          }`}
        >
          <Volume2
            className={`w-4 h-4 ${isTestingRing ? 'animate-bounce text-white' : 'text-[#E74C3C]'}`}
          />
          {isTestingRing ? '正在响铃与震动中...' : '测试响铃 (验证静音出声)'}
        </button>

        <button
          type="button"
          onClick={handleToggleWakeLock}
          className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition cursor-pointer ${
            keepScreenOn
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-white text-gray-500 border border-gray-200'
          }`}
          title="保持手机屏幕常亮，防止手机锁屏影响倒计时"
        >
          <Sun className={`w-3.5 h-3.5 ${keepScreenOn ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
          <span>{keepScreenOn ? '常亮已开' : '常亮已关'}</span>
        </button>
      </div>

      {/* 主视图区域根据 Tab 条件渲染 */}
      <main className="w-full flex flex-col items-center justify-center py-1">
        {activeTab === 'pomodoro' && (
          <PomodoroTimer
            phase={pomodoro.phase}
            status={pomodoro.status}
            formattedTime={pomodoro.formattedTime}
            progress={pomodoro.progress}
            completedPomodoros={pomodoro.completedPomodoros}
            onStart={pomodoro.start}
            onPause={pomodoro.pause}
            onResume={pomodoro.resume}
            onReset={pomodoro.reset}
            onSkip={pomodoro.skip}
            onSwitchPhase={pomodoro.switchPhase}
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
      </main>

      {/* 开发者与 iOS / Android / 云端 WSS 地址说明面板 */}
      <footer className="w-full max-w-xl mx-auto mt-6">
        <div className="bg-white/80 backdrop-blur-xs rounded-2xl border border-red-100 p-4 shadow-sm">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowDevPanel((prev) => !prev)}
            onKeyDown={(e) => e.key === 'Enter' && setShowDevPanel((prev) => !prev)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
              <Terminal className="w-4 h-4 text-[#E74C3C]" />
              <span>云端 WSS 地址说明、跨平台测试与 Webhook 命令</span>
            </div>
            <button
              type="button"
              className="p-1 text-gray-500 hover:text-gray-800 transition"
              aria-label="展开或收起调试说明"
            >
              {showDevPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showDevPanel && (
            <div className="mt-4 pt-4 border-t border-red-50 text-xs text-gray-600 space-y-4">
              {/* 关于用户询问的 wss://... 地址详细说明 */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <Globe className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>关于云端 WSS 实时通道地址解析：</span>
                </div>
                <div className="text-[11px] font-mono break-all text-blue-800 bg-blue-100/60 p-2 rounded-lg border border-blue-200">
                  wss://ais-dev-qg27xsixd57abfoxwf5fav-665504981051.asia-east1.run.app/ws
                </div>
                <p className="text-[11px] leading-relaxed text-blue-900/90">
                  <strong>这个地址是当前在线应用的「安全加密 WebSocket 实时广播通道」</strong>。当您在手机或电脑浏览器中打开该页面时，前端会自动向该地址发起持久长连接。外部系统或您的脚本只要调用下面的线上 Webhook 接口，该服务便会通过此 WSS 通道瞬间将响铃指令推送到您的设备，触发页面弹出红光横幅、大声响铃并震动。
                </p>
              </div>

              {/* 云端线上环境远程触发 curl */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-gray-700 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    公网远程触发测试 (直接打通手机 WSS):
                  </span>
                  <button
                    type="button"
                    onClick={copyCloudCurl}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium transition cursor-pointer"
                  >
                    {copiedCloudCurl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        已复制线上
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        复制线上命令
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-gray-900 text-blue-300 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre">
                  {cloudCurlCommand}
                </pre>
              </div>

              {/* 本地环境 3001 curl 测试命令 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-gray-700 flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5 text-[#E74C3C]" />
                    本机开发触发测试 (localhost:3001):
                  </span>
                  <button
                    type="button"
                    onClick={copyLocalCurl}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition cursor-pointer"
                  >
                    {copiedCurl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        已复制本地
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        复制本地命令
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre">
                  {localCurlCommand}
                </pre>
              </div>

              {/* WebSocket 服务端配置 */}
              <form onSubmit={handleUpdateWsUrl} className="flex items-center gap-2 pt-1">
                <label htmlFor="ws-url-input" className="shrink-0 font-medium text-gray-700">
                  当前 WS:
                </label>
                <input
                  id="ws-url-input"
                  type="text"
                  value={customWsUrl}
                  onChange={(e) => setCustomWsUrl(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:outline-hidden focus:border-[#E74C3C]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#E74C3C] text-white rounded-lg text-xs font-semibold hover:bg-[#C0392B] transition cursor-pointer"
                >
                  重连
                </button>
              </form>

              {/* iOS 与 Android 双端支持说明 */}
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-950 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>iOS 与 Android 跨平台专属适配特性：</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-amber-950/90 pl-1">
                  <li>
                    <strong>🍎 iOS (iPhone/iPad)：</strong>配置{' '}
                    <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">
                      obeyMuteSwitch: false
                    </code>
                    ，通过 Web Audio API 媒体通道播放，在 iPhone 开启侧边硬件静音开关时依然强制通过外放扬声器响铃。
                  </li>
                  <li>
                    <strong>🤖 Android (安卓手机/平板)：</strong>配置{' '}
                    <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">
                      speakerOn: true
                    </code>
                    ，优先调用硬件扬声器；响铃时联动 Android 硬件{' '}
                    <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">
                      navigator.vibrate
                    </code>{' '}
                    交替震动提醒；支持 WakeLock 屏幕常亮。
                  </li>
                  <li>
                    <strong>前台活跃约束：</strong>双端系统均受到系统功耗与后台保活限制，
                    <strong>仅在应用处于前台活跃时能可靠响铃</strong>。锁屏或切后台时系统将冻结网页进程；如需离线强提醒建议结合系统日历或系统级 Push 通知。
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
