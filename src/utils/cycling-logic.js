/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 骑行热量与身体指标计算纯逻辑
 */

/**
 * 根据身高 (cm) 与体重 (kg) 计算 BMI 及健康分级
 * @param {number} heightCm 身高（厘米）
 * @param {number} weightKg 体重（公斤）
 * @returns {{ bmi: number, category: string, color: string }}
 */
export function calculateBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return { bmi: 0, category: '未知', color: 'gray' };
  }
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  let category = '正常';
  let color = 'emerald';
  if (bmi < 18.5) {
    category = '偏瘦';
    color = 'amber';
  } else if (bmi < 24) {
    category = '标准健康';
    color = 'emerald';
  } else if (bmi < 28) {
    category = '超重';
    color = 'amber';
  } else {
    category = '肥胖';
    color = 'rose';
  }

  return { bmi, category, color };
}

/**
 * 根据骑行平均时速 (km/h) 评估代谢当量 (MET)
 * 基于国际通用的 Compendium of Physical Activities 标准
 * @param {number} speedKmH 骑行时速
 * @returns {number} MET 值
 */
export function getCyclingMET(speedKmH) {
  if (speedKmH <= 0) return 3.5;
  if (speedKmH < 16) return 4.0;   // 休闲轻松骑（<16 km/h）
  if (speedKmH < 20) return 6.0;   // 普通通勤速度（16~19 km/h）
  if (speedKmH < 23) return 8.0;   // 中速适度运动（20~22 km/h）
  if (speedKmH < 26) return 10.0;  // 快速公路巡航（23~25 km/h）
  if (speedKmH < 30) return 12.0;  // 高强度骑行（26~29 km/h）
  return 15.0;                     // 竞技竞速级（≥30 km/h）
}

/**
 * 计算骑行燃烧热量（大卡 kcal）及食物/脂肪折算
 * 公式: 卡路里 (kcal) = MET × 体重 (kg) × 时间 (小时)
 *
 * @param {object} params
 * @param {number} params.weightKg 体重（kg）
 * @param {number} params.distanceKm 骑行里程（km）
 * @param {number} [params.durationMinutes] 骑行总耗时（分钟）
 * @param {number} [params.speedKmH] 骑行均速（km/h）
 * @returns {{
 *   calories: number,
 *   durationHours: number,
 *   speedKmH: number,
 *   met: number,
 *   equivalents: { riceBowls: number, bubbleTeas: number, fatGrams: number }
 * }}
 */
export function calculateCyclingCalories({ weightKg, distanceKm, durationMinutes, speedKmH }) {
  if (!weightKg || weightKg <= 0 || !distanceKm || distanceKm <= 0) {
    return {
      calories: 0,
      durationHours: 0,
      speedKmH: 0,
      met: 0,
      equivalents: { riceBowls: 0, bubbleTeas: 0, fatGrams: 0 },
    };
  }

  let finalSpeed = 18; // 默认中速通勤 18 km/h
  let finalDurationHours = 0;

  if (durationMinutes && durationMinutes > 0) {
    finalDurationHours = durationMinutes / 60;
    finalSpeed = distanceKm / finalDurationHours;
  } else if (speedKmH && speedKmH > 0) {
    finalSpeed = speedKmH;
    finalDurationHours = distanceKm / finalSpeed;
  } else {
    // 默认以 18 km/h 计算所需时长
    finalDurationHours = distanceKm / finalSpeed;
  }

  const met = getCyclingMET(finalSpeed);
  const rawCalories = met * weightKg * finalDurationHours;
  const calories = Math.round(rawCalories);

  // 折算常见等效食物与减脂克数
  // 一碗米饭约 200 kcal，一杯珍珠奶茶约 360 kcal，减去 1 克纯脂肪约需消耗 7.7 kcal
  const riceBowls = Math.round((calories / 200) * 10) / 10;
  const bubbleTeas = Math.round((calories / 360) * 10) / 10;
  const fatGrams = Math.round(calories / 7.7);

  return {
    calories,
    durationHours: Math.round(finalDurationHours * 100) / 100,
    speedKmH: Math.round(finalSpeed * 10) / 10,
    met,
    equivalents: {
      riceBowls,
      bubbleTeas,
      fatGrams,
    },
  };
}
