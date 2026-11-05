/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { PHASE_CONFIG, formatTime, calculateProgress, getNextPhase } from '@/utils/timer-logic.js';
import { playFocusEndSound, playBreakEndSound } from '@/services/audio.js';

/**
 * 番茄钟核心业务 Hook（纯 JavaScript 实现）
 * @param {object} [options]
 * @param {(phase: string, message: string) => void} [options.onPhaseChange] 阶段切换时的通知回调
 */
export function usePomodoro(options = {}) {
  // 当前模式: 'focus' | 'shortBreak' | 'longBreak'
  const [phase, setPhase] = useState('focus');
  // 运行状态: 'idle' | 'running' | 'paused'
  const [status, setStatus] = useState('idle');
  // 剩余秒数
  const [timeLeft, setTimeLeft] = useState(PHASE_CONFIG.focus.duration);
  // 已完成的专注番茄个数
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  const timerRef = useRef(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const currentDuration = PHASE_CONFIG[phase].duration;

  // 更新页面标题
  const updateDocumentTitle = useCallback((currentStatus, currentPhase, remainingSeconds) => {
    let stateLabel = '番茄钟';
    if (currentStatus === 'running') {
      stateLabel = PHASE_CONFIG[currentPhase].titlePrefix;
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

    const { nextPhase, updatedCount } = getNextPhase(phase, completedPomodoros);
    const isFocusEnded = phase === 'focus';

    setCompletedPomodoros(updatedCount);
    setPhase(nextPhase);
    setStatus('idle');
    setTimeLeft(PHASE_CONFIG[nextPhase].duration);

    // 播放对应音效
    if (isFocusEnded) {
      playFocusEndSound();
      const tip = nextPhase === 'longBreak' ? '太棒了！已连续完成 4 个番茄，享受 15 分钟长休息吧！' : '专注完成！休息 5 分钟，喝口水放松一下。';
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
  }, [phase, completedPomodoros]);

  // 倒计时核心时钟
  useEffect(() => {
    if (status === 'running') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, handlePhaseComplete]);

  // 同步页面标题
  useEffect(() => {
    updateDocumentTitle(status, phase, timeLeft);
  }, [status, phase, timeLeft, updateDocumentTitle]);

  // 操作方法集合
  const start = useCallback(() => {
    setStatus('running');
  }, []);

  const pause = useCallback(() => {
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    setStatus('running');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setTimeLeft(PHASE_CONFIG[phase].duration);
  }, [phase]);

  const switchPhase = useCallback((targetPhase) => {
    if (PHASE_CONFIG[targetPhase]) {
      setPhase(targetPhase);
      setStatus('idle');
      setTimeLeft(PHASE_CONFIG[targetPhase].duration);
    }
  }, []);

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
    start,
    pause,
    resume,
    reset,
    skip,
    switchPhase,
  };
}
