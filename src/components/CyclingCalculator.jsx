/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  calculateBMI,
  calculateCyclingCalories,
  getCyclingMET,
} from '@/utils/cycling-logic.js';
import { playFocusEndSound } from '@/services/audio.js';
import Taro from '@tarojs/taro';
import {
  Bike,
  Flame,
  Gauge,
  Timer,
  Play,
  Pause,
  Square,
  Sparkles,
  History,
  Info,
  Scale,
  Ruler,
} from 'lucide-react';

const CYCLING_PARAMS_STORAGE_KEY = 'pomodoro_cycling_user_params';

const loadSavedCyclingParams = () => {
  try {
    const raw = localStorage.getItem(CYCLING_PARAMS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * 骑行热量与身体健康指标计算器组件
 */
export default function CyclingCalculator() {
  // 读取已保存的个人身体与骑行偏好数据（持久化记忆）
  const [savedParams] = useState(loadSavedCyclingParams);

  // 基础身体数据（持久化记忆）
  const [heightCm, setHeightCm] = useState(() => (savedParams?.heightCm ? savedParams.heightCm : 175));
  const [weightKg, setWeightKg] = useState(() => (savedParams?.weightKg ? savedParams.weightKg : 68));

  // 骑行数据（持久化记忆）
  const [distanceKm, setDistanceKm] = useState(() => (savedParams?.distanceKm !== undefined ? savedParams.distanceKm : 15));
  const [durationMinutes, setDurationMinutes] = useState(() => (savedParams?.durationMinutes !== undefined ? savedParams.durationMinutes : 45));
  const [speedMode, setSpeedMode] = useState(() => savedParams?.speedMode || 'duration'); // 'duration' (按耗时计算) | 'preset' (按强度/均速计算)
  const [presetSpeed, setPresetSpeed] = useState(() => savedParams?.presetSpeed ?? 20); // km/h

  // 自动将用户填写的数据持久化保存，避免切走页面或刷新后变回默认值
  useEffect(() => {
    try {
      localStorage.setItem(
        CYCLING_PARAMS_STORAGE_KEY,
        JSON.stringify({
          heightCm: heightCm === '' ? 175 : Number(heightCm),
          weightKg: weightKg === '' ? 68 : Number(weightKg),
          distanceKm: distanceKm === '' ? 15 : Number(distanceKm),
          durationMinutes: durationMinutes === '' ? 45 : Number(durationMinutes),
          speedMode,
          presetSpeed,
        })
      );
    } catch {}
  }, [heightCm, weightKg, distanceKm, durationMinutes, speedMode, presetSpeed]);

  // 实时骑行模式状态
  const [isLiveRiding, setIsLiveRiding] = useState(false);
  const [liveElapsedSec, setLiveElapsedSec] = useState(0);
  const [liveDistance, setLiveDistance] = useState(0);
  const liveTimerRef = useRef(null);

  // 历史记录
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pomodoro_cycling_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // BMI 计算
  const bmiInfo = calculateBMI(Number(heightCm) || 175, Number(weightKg) || 68);

  // 卡路里计算
  const calorieResult = calculateCyclingCalories({
    weightKg: Number(weightKg) || 68,
    distanceKm: parseFloat(distanceKm) || 0,
    durationMinutes: speedMode === 'duration' ? (parseInt(durationMinutes, 10) || 0) : undefined,
    speedKmH: speedMode === 'preset' ? presetSpeed : undefined,
  });

  // 快捷里程预设
  const distancePresets = [5, 10, 15, 20, 30, 50];

  // 强度预设
  const intensityLevels = [
    { name: '休闲慢骑', speed: 14, desc: '<16 km/h 轻松漫游' },
    { name: '中速通勤', speed: 18, desc: '16~20 km/h 正常通勤' },
    { name: '快速巡航', speed: 24, desc: '21~26 km/h 有氧锻炼' },
    { name: '高强竞速', speed: 30, desc: '>28 km/h 强力冲刺' },
  ];

  // 实时骑行倒计时/正计时
  useEffect(() => {
    if (isLiveRiding) {
      liveTimerRef.current = setInterval(() => {
        setLiveElapsedSec((prev) => {
          const nextSec = prev + 1;
          // 根据设定均速实时累积骑行里程
          const currentSpeed = speedMode === 'preset' ? presetSpeed : calorieResult.speedKmH || 18;
          const currentDist = (currentSpeed * (nextSec / 3600)).toFixed(2);
          setLiveDistance(parseFloat(currentDist));
          return nextSec;
        });
      }, 1000);
    } else {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
    }
    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
  }, [isLiveRiding, speedMode, presetSpeed, calorieResult.speedKmH]);

  // 实时卡路里消耗估算
  const liveCalories = Math.round(
    getCyclingMET(presetSpeed) * weightKg * (liveElapsedSec / 3600)
  );

  const startLiveRide = () => {
    Taro.vibrateShort();
    setIsLiveRiding(true);
    Taro.showToast({ title: '🚴 开始骑行记录！保持常亮中...', icon: 'none' });
  };

  const pauseLiveRide = () => {
    Taro.vibrateShort();
    setIsLiveRiding(false);
  };

  const finishLiveRide = () => {
    Taro.vibrateShort();
    setIsLiveRiding(false);
    playFocusEndSound();

    if (liveDistance > 0 && liveCalories > 0) {
      const newRecord = {
        id: Date.now(),
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        distance: liveDistance,
        calories: liveCalories,
        duration: Math.round(liveElapsedSec / 60),
      };
      const updated = [newRecord, ...history].slice(0, 5);
      setHistory(updated);
      try {
        localStorage.setItem('pomodoro_cycling_history', JSON.stringify(updated));
      } catch {}

      Taro.showToast({
        title: `🎉 骑行完成！消耗 ${liveCalories} kcal`,
        icon: 'success',
        duration: 3500,
      });
    }

    setLiveElapsedSec(0);
    setLiveDistance(0);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-xl shadow-red-500/5 border border-red-100 flex flex-col items-center">
      {/* 标题与简介 */}
      <div className="w-full flex items-center justify-between pb-3.5 border-b border-red-50 mb-5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#FFF0E6] flex items-center justify-center text-[#E74C3C] shrink-0">
            <Bike className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">骑行卡路里计算器</h2>
            <p className="text-[11px] text-gray-500 whitespace-nowrap">MET 代谢标准 · 减脂热量换算</p>
          </div>
        </div>

        {/* 身体 BMI 徽章 */}
        <div className="text-right shrink-0">
          <div className="text-[10px] text-gray-400 font-medium whitespace-nowrap mb-0.5">身体 BMI</div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap shrink-0">
            <span className="font-mono">{bmiInfo.bmi}</span>
            <span className="text-[10px] font-medium px-1 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
              {bmiInfo.category}
            </span>
          </span>
        </div>
      </div>

      {/* 身体参数输入：身高与体重 */}
      <div className="w-full mb-4">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
            <span>个人身体参数</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 font-medium">
              自动保存记忆
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setHeightCm(175);
              setWeightKg(68);
              setDistanceKm(15);
              setDurationMinutes(45);
              setSpeedMode('duration');
              setPresetSpeed(20);
              Taro.showToast({ title: '已恢复默认参数', icon: 'none' });
            }}
            className="text-[10px] text-gray-400 hover:text-[#E74C3C] cursor-pointer transition"
          >
            重置默认
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="bg-[#FFF8F4] p-3 rounded-2xl border border-red-100/80">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1 mb-1">
              <Ruler className="w-3.5 h-3.5 text-[#E74C3C]" />
              身高 (cm)
            </label>
            <input
              type="number"
              min="100"
              max="230"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="175"
              className="w-full p-2 bg-white rounded-xl border border-red-200 text-sm font-bold text-gray-900 font-mono text-center focus:outline-hidden focus:border-[#E74C3C]"
            />
          </div>

          <div className="bg-[#FFF8F4] p-3 rounded-2xl border border-red-100/80">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1 mb-1">
              <Scale className="w-3.5 h-3.5 text-[#E74C3C]" />
              体重 (kg)
            </label>
            <input
              type="number"
              min="30"
              max="200"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="68"
              className="w-full p-2 bg-white rounded-xl border border-red-200 text-sm font-bold text-gray-900 font-mono text-center focus:outline-hidden focus:border-[#E74C3C]"
            />
          </div>
        </div>
      </div>

      {/* 骑行里程输入与快捷胶囊 */}
      <div className="w-full bg-[#FFF8F4] p-3.5 rounded-2xl border border-red-100/80 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-[#E74C3C]" />
            骑行里程 (公里 / km)
          </label>
          <span className="text-xs font-bold text-[#E74C3C] font-mono">{distanceKm || 0} km</span>
        </div>

        <input
          type="number"
          step="0.5"
          min="0.1"
          max="300"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value === '' ? '' : parseFloat(e.target.value))}
          placeholder="15"
          className="w-full p-2.5 bg-white rounded-xl border border-red-200 text-base font-bold text-gray-900 font-mono text-center mb-2 focus:outline-hidden focus:border-[#E74C3C]"
        />

        <div className="flex items-center justify-between gap-1">
          {distancePresets.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDistanceKm(d)}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                distanceKm === d
                  ? 'bg-[#E74C3C] text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-red-50 border border-red-100'
              }`}
            >
              {d}k
            </button>
          ))}
        </div>
      </div>

      {/* 骑行强度与耗时选择 */}
      <div className="w-full bg-[#FFF8F4] p-3.5 rounded-2xl border border-red-100/80 mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-[#E74C3C]" />
            骑行强度与均速
          </label>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setSpeedMode('duration')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                speedMode === 'duration' ? 'bg-[#E74C3C] text-white' : 'text-gray-500'
              }`}
            >
              按耗时
            </button>
            <button
              type="button"
              onClick={() => setSpeedMode('preset')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                speedMode === 'preset' ? 'bg-[#E74C3C] text-white' : 'text-gray-500'
              }`}
            >
              按均速
            </button>
          </div>
        </div>

        {speedMode === 'duration' ? (
          <div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="600"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="45"
                className="w-full p-2 bg-white rounded-xl border border-red-200 text-sm font-bold text-gray-900 font-mono text-center focus:outline-hidden focus:border-[#E74C3C]"
              />
              <span className="text-xs font-semibold text-gray-500 shrink-0">分钟</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-1.5 flex items-center justify-between">
              <span>折算平均时速:</span>
              <span className="font-bold font-mono text-[#E74C3C]">
                {calorieResult.speedKmH} km/h
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {intensityLevels.map((lvl) => (
              <button
                key={lvl.speed}
                type="button"
                onClick={() => setPresetSpeed(lvl.speed)}
                className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                  presetSpeed === lvl.speed
                    ? 'bg-white border-[#E74C3C] shadow-xs'
                    : 'bg-white/60 border-red-50 text-gray-600'
                }`}
              >
                <div className="text-xs font-bold text-gray-900">{lvl.name}</div>
                <div className="text-[10px] text-gray-500">{lvl.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 核心卡路里计算大结果卡片 */}
      <div className="w-full rounded-2xl bg-gradient-to-br from-[#FFF5F2] via-[#FFEBE6] to-[#FEDFD9] border-2 border-red-200 p-5 flex flex-col items-center shadow-md relative overflow-hidden mb-5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#E74C3C] mb-1">
          <Flame className="w-4 h-4 fill-current animate-bounce" />
          <span>预计燃烧热量</span>
        </div>

        <div className="flex items-baseline gap-1 my-1">
          <span className="text-5xl font-black font-mono text-gray-900 tracking-tight">
            {calorieResult.calories}
          </span>
          <span className="text-base font-bold text-gray-600">千卡 (kcal)</span>
        </div>

        {/* 趣味等效消耗换算 */}
        <div className="grid grid-cols-3 gap-2 w-full mt-3 pt-3 border-t border-red-200/60 text-center">
          <div className="bg-white/80 rounded-xl p-2 shadow-xs">
            <span className="text-base select-none">🍚</span>
            <div className="text-xs font-extrabold text-gray-900 font-mono">
              {calorieResult.equivalents.riceBowls} 碗
            </div>
            <div className="text-[10px] text-gray-500">等效米饭</div>
          </div>

          <div className="bg-white/80 rounded-xl p-2 shadow-xs">
            <span className="text-base select-none">🧋</span>
            <div className="text-xs font-extrabold text-gray-900 font-mono">
              {calorieResult.equivalents.bubbleTeas} 杯
            </div>
            <div className="text-[10px] text-gray-500">等效奶茶</div>
          </div>

          <div className="bg-white/80 rounded-xl p-2 shadow-xs">
            <span className="text-base select-none">🔥</span>
            <div className="text-xs font-extrabold text-[#E74C3C] font-mono">
              {calorieResult.equivalents.fatGrams} 克
            </div>
            <div className="text-[10px] text-gray-500">减脂纯脂肪</div>
          </div>
        </div>
      </div>

      {/* 实时骑行记录模式操作 */}
      <div className="w-full bg-[#FFF8F4] p-3.5 rounded-2xl border border-red-100/80 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            实地实时骑行计时模式
          </span>
          {isLiveRiding && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">
              骑行中
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600 mb-3 bg-white p-2.5 rounded-xl border border-red-100 font-mono">
          <div>
            已用时: <span className="font-bold text-gray-900">{Math.floor(liveElapsedSec / 60)}分{liveElapsedSec % 60}秒</span>
          </div>
          <div>
            实时累积: <span className="font-bold text-[#E74C3C]">{liveCalories} kcal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isLiveRiding ? (
            <button
              type="button"
              onClick={startLiveRide}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#27AE60] hover:bg-[#219653] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {liveElapsedSec > 0 ? '继续骑行' : '开始实时骑行'}
            </button>
          ) : (
            <button
              type="button"
              onClick={pauseLiveRide}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              暂停
            </button>
          )}

          {liveElapsedSec > 0 && (
            <button
              type="button"
              onClick={finishLiveRide}
              className="py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              结束并保存
            </button>
          )}
        </div>
      </div>

      {/* 历史打卡记录 */}
      {history.length > 0 && (
        <div className="w-full pt-3 border-t border-red-50 text-xs">
          <div className="flex items-center gap-1 text-gray-600 font-bold mb-2">
            <History className="w-3.5 h-3.5 text-[#E74C3C]" />
            今日骑行记录
          </div>
          <div className="space-y-1.5">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-red-50 text-[11px]"
              >
                <span className="text-gray-500 font-mono">{item.date}</span>
                <span className="font-bold text-gray-800">{item.distance} km ({item.duration}分钟)</span>
                <span className="font-extrabold text-[#E74C3C] font-mono">+{item.calories} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
