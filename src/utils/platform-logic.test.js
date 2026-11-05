import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform, getVibrationPattern } from './platform-logic.js';

test('detectPlatform correctly identifies iOS UA strings', () => {
  const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const res = detectPlatform(iosUA);
  assert.equal(res.os, 'ios');
  assert.equal(res.isIOS, true);
  assert.equal(res.isAndroid, false);
});

test('detectPlatform correctly identifies Android UA strings', () => {
  const androidUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
  const res = detectPlatform(androidUA);
  assert.equal(res.os, 'android');
  assert.equal(res.isAndroid, true);
  assert.equal(res.isIOS, false);
});

test('getVibrationPattern returns valid millisecond arrays', () => {
  const ringPattern = getVibrationPattern('ring');
  assert.ok(Array.isArray(ringPattern));
  assert.ok(ringPattern.length >= 3);

  const clickPattern = getVibrationPattern('click');
  assert.deepEqual(clickPattern, [35]);
});
