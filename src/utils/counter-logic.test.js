import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultCounters, updateCounter, calculateCounterProgress } from './counter-logic.js';

test('getDefaultCounters returns standard presets', () => {
  const counters = getDefaultCounters();
  assert.equal(counters.length, 4);
  assert.equal(counters[0].id, 'pomodoro');
  assert.equal(counters[1].id, 'water');
});

test('updateCounter increments and decrements correctly without falling below min', () => {
  assert.equal(updateCounter(0, 1), 1);
  assert.equal(updateCounter(5, 5), 10);
  assert.equal(updateCounter(3, -1), 2);
  assert.equal(updateCounter(0, -1, 0), 0);
  assert.equal(updateCounter(2, -5, 0), 0);
});

test('calculateCounterProgress calculates percent accurately', () => {
  assert.equal(calculateCounterProgress(4, 8), 50);
  assert.equal(calculateCounterProgress(8, 8), 100);
  assert.equal(calculateCounterProgress(10, 8), 100);
  assert.equal(calculateCounterProgress(0, 8), 0);
  assert.equal(calculateCounterProgress(5, 0), 0);
});
