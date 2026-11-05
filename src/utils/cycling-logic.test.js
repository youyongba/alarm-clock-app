import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBMI, getCyclingMET, calculateCyclingCalories } from './cycling-logic.js';

test('calculateBMI calculates BMI and healthy categories correctly', () => {
  // Height 175cm, Weight 70kg -> BMI = 70 / (1.75^2) = 22.86 -> 22.9
  const res1 = calculateBMI(175, 70);
  assert.equal(res1.bmi, 22.9);
  assert.equal(res1.category, '标准健康');

  // Height 170cm, Weight 85kg -> BMI = 85 / (1.7^2) = 29.4 -> 肥胖
  const res2 = calculateBMI(170, 85);
  assert.equal(res2.bmi, 29.4);
  assert.equal(res2.category, '肥胖');
});

test('getCyclingMET matches MET standards by speed', () => {
  assert.equal(getCyclingMET(14), 4.0); // 休闲
  assert.equal(getCyclingMET(18), 6.0); // 普通通勤
  assert.equal(getCyclingMET(22), 8.0); // 中速
  assert.equal(getCyclingMET(25), 10.0); // 快速
  assert.equal(getCyclingMET(32), 15.0); // 竞速
});

test('calculateCyclingCalories calculates correct kcal and food equivalents', () => {
  // Weight 70kg, Distance 20km, Duration 60 mins -> Speed 20km/h, MET=8.0, 1hr -> 8.0 * 70 * 1 = 560 kcal
  const res = calculateCyclingCalories({
    weightKg: 70,
    distanceKm: 20,
    durationMinutes: 60,
  });

  assert.equal(res.speedKmH, 20);
  assert.equal(res.durationHours, 1);
  assert.equal(res.met, 8.0);
  assert.equal(res.calories, 560);
  assert.equal(res.equivalents.riceBowls, 2.8);
  assert.ok(res.equivalents.fatGrams > 70);
});
