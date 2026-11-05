/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '@/utils/timer-logic.js';
import { getRemainingSecondsToTime } from '@/utils/scheduled-timer-logic.js';
import { playRingSound, stopAllAudio } from '@/services/audio.js';
import { Play, Pause, RotateCcw, Bell, Timer, AlarmClock, CheckCircle } from 'lucide-react';
import Taro from '@tarojs/taro';

/**
 * 自定义定时与定时闹钟组件
 */
export default function CustomTimer({ onRingTrigger }) {
  // 选中的模式: 'countdown' (自定义倒计时) | 'alarm' (定点定时闹钟)
  const [mode, setMode] = useState('countdown');

  // ---------- 1. 自定义倒计时状态 ----------
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [countdownLeft, setCountdownLeft] = useState(5 * 60);
  const [countdownStatus, setCountdownStatus] = useState('idle'); // 'idle' | 'running' | 'paused'
  const countdownIntervalRef = useRef(null);

  const presets = [1, 3, 5, 10, 15, 20, 30, 45, 60];

  const handleSelectPreset = (mins) => {
    if (countdownStatus === 'running') return;
    setSelectedMinutes(mins);
    setCountdownLeft(mins * 60);
    setCountdownStatus('idle');
  };

  const startCountdown = () => {
    setCountdownStatus('running');
  };

  const pauseCountdown = () => {
    setCountdownStatus('paused');
  };

  const resetCountdown = () => {
    setCountdownStatus('idle');
    setCountdownLeft(selectedMinutes * 60);
  };

  useEffect(() => {
    if (countdownStatus === 'running') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            setCountdownStatus('idle');
            // 响铃提醒
            playRingSound({ durationMs: 4000 });
            Taro.showToast({ title: '⏱️ 自定义定时已到达！', icon: 'success', duration: 4000 });
            if (onRingTrigger) {
              onRingTrigger({
                category: 'timer',
                message: `自定义 ${selectedMinutes} 分钟倒计时到达`,
                durationMs: 4000,
                source: '快捷倒计时',
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [countdownStatus, selectedMinutes, onRingTrigger]);

  // ---------- 2. 定点定时闹钟状态 ----------
  // 默认设置为 10 分钟后的时间
  const getDefaultTargetTime = () => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const [alarmTime, setAlarmTime] = useState(getDefaultTargetTime());
  const [alarmMessage, setAlarmMessage] = useState('喝水与站立活动提醒');
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmRemainingSec, setAlarmRemainingSec] = useState(0);

  // 检查定点闹钟
  useEffect(() => {
    if (!alarmEnabled) return;

    const checkInterval = setInterval(() => {
      const remaining = getRemainingSecondsToTime(alarmTime);
      setAlarmRemainingSec(remaining);

      // 到达预定时间 (剩余 0 秒)
      if (remaining === 0) {
        setAlarmEnabled(false);
        playRingSound({ durationMs: 5000 });
        Taro.showToast({
          title: `🔔 定时闹钟到啦: ${alarmMessage}`,
          icon: 'success',
          duration: 5000,
        });
        if (onRingTrigger) {
          onRingTrigger({
            category: 'alarm',
            message: `定点闹钟到啦: ${alarmMessage || '定时提醒'} (${alarmTime})`,
            durationMs: 5000,
            source: '定点闹钟',
          });
        }
      }
    }, 1000);

    // 初始化先计算一次
    setAlarmRemainingSec(getRemainingSecondsToTime(alarmTime));

    return () => clearInterval(checkInterval);
  }, [alarmEnabled, alarmTime, alarmMessage, onRingTrigger]);

  const toggleAlarm = () => {
    if (!alarmEnabled) {
      const remaining = getRemainingSecondsToTime(alarmTime);
      setAlarmRemainingSec(remaining);
      setAlarmEnabled(true);
      Taro.showToast({ title: `已设定在 ${alarmTime} 响铃`, icon: 'success' });
    } else {
      setAlarmEnabled(false);
      stopAllAudio();
      Taro.showToast({ title: '已取消定时提醒', icon: 'none' });
    }
  };

  const totalCountdownDuration = selectedMinutes * 60;
  const progressRatio = totalCountdownDuration > 0 ? (totalCountdownDuration - countdownLeft) / totalCountdownDuration : 0;

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-xl shadow-red-500/5 border border-red-100 flex flex-col items-center">
      {/* 顶部子模式选择器 */}
      <div className="flex items-center gap-1.5 p-1 bg-[#FFF0E6] rounded-2xl mb-6 w-full justify-between">
        <button
          type="button"
          onClick={() => setMode('countdown')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'countdown'
              ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <Timer className="w-4 h-4" />
          快捷倒计时
        </button>
        <button
          type="button"
          onClick={() => setMode('alarm')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'alarm'
              ? 'bg-[#E74C3C] text-white shadow-md shadow-red-500/20'
              : 'text-gray-600 hover:text-[#E74C3C]'
          }`}
        >
          <AlarmClock className="w-4 h-4" />
          定点闹钟
        </button>
      </div>

      {/* 视图 1：快捷倒计时 */}
      {mode === 'countdown' && (
        <div className="w-full flex flex-col items-center">
          {/* 预设时长快捷胶囊 */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6 w-full">
            {presets.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleSelectPreset(mins)}
                disabled={countdownStatus === 'running'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedMinutes === mins
                    ? 'bg-[#E74C3C] text-white shadow-xs'
                    : 'bg-red-50/80 text-gray-700 hover:bg-red-100 disabled:opacity-50'
                }`}
              >
                {mins} 分钟
              </button>
            ))}
          </div>

          {/* 数字倒计时 */}
          <div className="flex flex-col items-center justify-center my-3 text-center">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-gray-900">
              {formatTime(countdownLeft)}
            </span>
            <span className="text-xs text-gray-500 mt-2 font-medium">
              目标时长: {selectedMinutes} 分钟 · 到时强制响铃
            </span>
          </div>

          {/* 线性进度条 */}
          <div className="w-full h-2 bg-red-100 rounded-full my-4 overflow-hidden">
            <div
              className="h-full bg-[#E74C3C] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
            />
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-3 mt-4 w-full">
            {countdownStatus === 'idle' && (
              <button
                type="button"
                onClick={startCountdown}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-[#E74C3C] hover:bg-[#C0392B] active:scale-95 text-white font-bold text-sm shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                开始计时
              </button>
            )}

            {countdownStatus === 'running' && (
              <>
                <button
                  type="button"
                  onClick={pauseCountdown}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-[#E74C3C] hover:bg-[#C0392B] active:scale-95 text-white font-bold text-sm shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Pause className="w-5 h-5 fill-current" />
                  暂停
                </button>
                <button
                  type="button"
                  onClick={resetCountdown}
                  className="p-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 transition cursor-pointer"
                  title="重置"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </>
            )}

            {countdownStatus === 'paused' && (
              <>
                <button
                  type="button"
                  onClick={startCountdown}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-[#27AE60] hover:bg-[#219653] active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  继续
                </button>
                <button
                  type="button"
                  onClick={resetCountdown}
                  className="p-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 transition cursor-pointer"
                  title="重置"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 视图 2：定点定时闹钟 */}
      {mode === 'alarm' && (
        <div className="w-full flex flex-col items-center space-y-4">
          <div className="w-full bg-[#FFF0E6]/50 p-4 rounded-2xl border border-red-100">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              预定响铃时间 (24小时制)
            </label>
            <input
              type="time"
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
              disabled={alarmEnabled}
              className="w-full p-2.5 bg-white border border-red-200 rounded-xl text-xl font-bold font-mono text-center text-gray-900 focus:outline-hidden focus:border-[#E74C3C] disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div className="w-full bg-[#FFF0E6]/50 p-4 rounded-2xl border border-red-100">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              响铃提醒文案
            </label>
            <input
              type="text"
              value={alarmMessage}
              onChange={(e) => setAlarmMessage(e.target.value)}
              disabled={alarmEnabled}
              placeholder="例如：站立开会、喝水、运动"
              className="w-full p-2.5 bg-white border border-red-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:border-[#E74C3C] disabled:bg-gray-100"
            />
          </div>

          {alarmEnabled ? (
            <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-bold">定时已开启: {alarmTime}</div>
                  <div className="text-[11px] text-emerald-600">
                    距离响铃还剩: {Math.floor(alarmRemainingSec / 3600)}小时
                    {Math.floor((alarmRemainingSec % 3600) / 60)}分
                    {alarmRemainingSec % 60}秒
                  </div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center">
              设置好目标时间后点击下方按钮开启
            </div>
          )}

          <button
            type="button"
            onClick={toggleAlarm}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
              alarmEnabled
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25'
                : 'bg-[#E74C3C] hover:bg-[#C0392B] text-white shadow-red-500/30'
            }`}
          >
            <Bell className="w-4 h-4" />
            {alarmEnabled ? '取消定时提醒' : '开启定点响铃'}
          </button>
        </div>
      )}
    </div>
  );
}
