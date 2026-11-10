/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Taro from '@tarojs/taro';
import {
  PHASE_CONFIG,
  formatTime,
  calculateProgress,
  getNextPhase,
  calculateRemainingSeconds,
  restoreSessionState,
  SESSION_STORAGE_KEY,
} from '@/utils/timer-logic.js';
import { playFocusEndSound, playBreakEndSound } from '@/services/audio.js';

/**
 * 番茄钟核心业务 Hook（纯 JavaScript 实现，支持后台绝对时间戳防休眠与持久化）
 * @param {object} [options]
 * @param {(phase: string, message: string) => void} [options.onPhaseChange] 阶段切换时的通知回调
 */
export function usePomodoro(options = {}) {
  // 从本地持久化存储中恢复初始状态
  const [initialSession] = useState(() => {
    let saved = null;
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) saved = JSON.parse(raw);
      }
    } catch {}
    return restoreSessionState(saved);
  });

  // 当前模式: 'focus' | 'shortBreak' | 'longBreak'
  const [phase, setPhase] = useState(initialSession.phase);
  // 运行状态: 'idle' | 'running' | 'paused'
  const [status, setStatus] = useState(
    initialSession.status === 'completed' ? 'idle' : initialSession.status
  );
  // 剩余秒数
  const [timeLeft, setTimeLeft] = useState(initialSession.timeLeft);
  // 绝对目标结束时间戳 (ms)，用于防休眠与后台切换精准倒计时
  const [targetEndTime, setTargetEndTime] = useState(initialSession.targetEndTime);
  // 已完成的专注番茄个数
  const [completedPomodoros, setCompletedPomodoros] = useState(initialSession.completedPomodoros);
  // 正在请求切换到的阶段（当正在运行中点击切换时，触发防误触确认）
  const [pendingSwitchPhase, setPendingSwitchPhase] = useState(null);

  const timerRef = useRef(null);
  const targetEndTimeRef = useRef(targetEndTime);
  targetEndTimeRef.current = targetEndTime;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const currentDuration = PHASE_CONFIG[phase]?.duration || 1500;

  // 会话持久化写入助手
  const persistSession = useCallback((p, s, left, targetEnd, count) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            phase: p,
            status: s,
            timeLeft: left,
            targetEndTime: targetEnd,
            completedPomodoros: count,
            lastUpdated: Date.now(),
          })
        );
      }
    } catch {}
  }, []);

  // 更新页面标题
  const updateDocumentTitle = useCallback((currentStatus, currentPhase, remainingSeconds) => {
    let stateLabel = '番茄钟';
    if (currentStatus === 'running') {
      stateLabel = PHASE_CONFIG[currentPhase]?.titlePrefix || '运行中';
    } else if (currentStatus === 'paused') {
      stateLabel = '已暂停';
    } else {
      stateLabel = '准备就绪';
    }
    const formatted = formatTime(remainingSeconds);
    const newTitle = `🍅 [${formatted}] ${stateLabel} - 番茄响铃器`;
    Taro.setNavigationBarTitle({ title: newTitle });
  }, []);

  // 阶段自动切换处理
  const handlePhaseComplete = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTargetEndTime(null);
    targetEndTimeRef.current = null;

    const { nextPhase, updatedCount } = getNextPhase(phase, completedPomodoros);
    const isFocusEnded = phase === 'focus';
    const nextDuration = PHASE_CONFIG[nextPhase]?.duration || 1500;

    setCompletedPomodoros(updatedCount);
    setPhase(nextPhase);
    setStatus('idle');
    setTimeLeft(nextDuration);
    setPendingSwitchPhase(null);
    persistSession(nextPhase, 'idle', nextDuration, null, updatedCount);

    // 播放对应音效与提示
    if (isFocusEnded) {
      playFocusEndSound();
      const tip =
        nextPhase === 'longBreak'
          ? '太棒了！已连续完成 4 个番茄，享受 15 分钟长休息吧！'
          : '专注完成！休息 5 分钟，喝口水放松一下。';
      Taro.showToast({ title: tip, icon: 'success', duration: 4000 });
      if (optionsRef.current.onPhaseChange) {
        optionsRef.current.onPhaseChange(nextPhase, tip);
      }
    } else {
      playBreakEndSound();
      const tip = '休息结束！开始新的一轮专注吧。';
      Taro.showToast({ title: tip, icon: 'none', duration: 3000 });
      if (optionsRef.current.onPhaseChange) {
        optionsRef.current.onPhaseChange(nextPhase, tip);
      }
    }
  }, [phase, completedPomodoros, persistSession]);

  // 若刚进入页面时检测到上次在后台已到期，自动触发完成
  useEffect(() => {
    if (initialSession.status === 'completed') {
      handlePhaseComplete();
    }
  }, [initialSession.status, handlePhaseComplete]);

  // 倒计时核心时钟：基于绝对时间戳 targetEndTime 计算，切换标签页或手机熄屏唤醒绝不丢失
  useEffect(() => {
    if (status !== 'running') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const syncTick = () => {
      const targetEnd = targetEndTimeRef.current;
      if (!targetEnd) return;

      const remaining = calculateRemainingSeconds(targetEnd);
      if (remaining <= 0) {
        setTimeLeft(0);
        handlePhaseComplete();
      } else {
        setTimeLeft(remaining);
      }
    };

    // 立即校准一次
    syncTick();

    // 500ms 轮询校准，确保界面秒数跳动无缝平滑
    timerRef.current = setInterval(syncTick, 500);

    // 监听切回浏览器标签页或手机亮屏时的即时对齐
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncTick();
      }
    };
    const handleWindowFocus = () => {
      syncTick();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
      }
    };
  }, [status, handlePhaseComplete]);

  // 同步页面标题
  useEffect(() => {
    updateDocumentTitle(status, phase, timeLeft);
  }, [status, phase, timeLeft, updateDocumentTitle]);

  // 操作方法集合

  // 开始计时
  const start = useCallback(() => {
    const duration = timeLeft > 0 ? timeLeft : (PHASE_CONFIG[phase]?.duration || 1500);
    const targetEnd = Date.now() + duration * 1000;
    setTargetEndTime(targetEnd);
    targetEndTimeRef.current = targetEnd;
    setStatus('running');
    setTimeLeft(duration);
    setPendingSwitchPhase(null);
    persistSession(phase, 'running', duration, targetEnd, completedPomodoros);
  }, [timeLeft, phase, completedPomodoros, persistSession]);

  // 暂停计时
  const pause = useCallback(() => {
    setStatus('paused');
    setTargetEndTime(null);
    targetEndTimeRef.current = null;
    persistSession(phase, 'paused', timeLeft, null, completedPomodoros);
  }, [phase, timeLeft, completedPomodoros, persistSession]);

  // 继续计时
  const resume = useCallback(() => {
    const duration = timeLeft > 0 ? timeLeft : (PHASE_CONFIG[phase]?.duration || 1500);
    const targetEnd = Date.now() + duration * 1000;
    setTargetEndTime(targetEnd);
    targetEndTimeRef.current = targetEnd;
    setStatus('running');
    setPendingSwitchPhase(null);
    persistSession(phase, 'running', duration, targetEnd, completedPomodoros);
  }, [timeLeft, phase, completedPomodoros, persistSession]);

  // 停止或重置当前阶段
  const reset = useCallback(() => {
    const duration = PHASE_CONFIG[phase]?.duration || 1500;
    setStatus('idle');
    setTargetEndTime(null);
    targetEndTimeRef.current = null;
    setTimeLeft(duration);
    setPendingSwitchPhase(null);
    persistSession(phase, 'idle', duration, null, completedPomodoros);
  }, [phase, completedPomodoros, persistSession]);

  // 切换阶段：防误触机制，若正在运行中则提醒确认，否则平滑切换
  const switchPhase = useCallback(
    (targetPhase) => {
      if (!PHASE_CONFIG[targetPhase]) return;

      // 若点击的是当前已激活阶段，绝不打断或重置
      if (targetPhase === phase) {
        return;
      }

      // 若当前正在运行，拦截并展示切换确认框，防止误点丢失进度
      if (status === 'running') {
        setPendingSwitchPhase(targetPhase);
        return;
      }

      // 未运行或已暂停状态，可直接切换
      const targetDuration = PHASE_CONFIG[targetPhase].duration;
      setPhase(targetPhase);
      setStatus('idle');
      setTargetEndTime(null);
      targetEndTimeRef.current = null;
      setTimeLeft(targetDuration);
      setPendingSwitchPhase(null);
      persistSession(targetPhase, 'idle', targetDuration, null, completedPomodoros);
    },
    [phase, status, completedPomodoros, persistSession]
  );

  // 确认放弃当前运行阶段并切换
  const confirmSwitchPhase = useCallback(() => {
    if (pendingSwitchPhase && PHASE_CONFIG[pendingSwitchPhase]) {
      const target = pendingSwitchPhase;
      const targetDuration = PHASE_CONFIG[target].duration;
      setPhase(target);
      setStatus('idle');
      setTargetEndTime(null);
      targetEndTimeRef.current = null;
      setTimeLeft(targetDuration);
      setPendingSwitchPhase(null);
      persistSession(target, 'idle', targetDuration, null, completedPomodoros);
    }
  }, [pendingSwitchPhase, completedPomodoros, persistSession]);

  // 取消切换，继续当前倒计时
  const cancelSwitchPhase = useCallback(() => {
    setPendingSwitchPhase(null);
  }, []);

  // 跳过当前阶段
  const skip = useCallback(() => {
    handlePhaseComplete();
  }, [handlePhaseComplete]);

  const progress = calculateProgress(timeLeft, currentDuration);
  const formattedTime = formatTime(timeLeft);

  return {
    phase,
    status,
    timeLeft,
    totalDuration: currentDuration,
    progress,
    formattedTime,
    completedPomodoros,
    phaseConfig: PHASE_CONFIG[phase],
    pendingSwitchPhase,
    start,
    pause,
    resume,
    reset,
    skip,
    switchPhase,
    confirmSwitchPhase,
    cancelSwitchPhase,
  };
}
