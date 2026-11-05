import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrentDate,
  formatCurrentTime,
  getRemainingSecondsToTime,
} from './scheduled-timer-logic.js';

test('formatCurrentTime and formatCurrentDate produce formatted strings', () => {
  const fixed = new Date('2026-11-05T14:30:45');
  assert.equal(formatCurrentTime(fixed), '14:30:45');
  const dateStr = formatCurrentDate(fixed);
  assert.ok(dateStr.includes('2026年11月05日'));
});

test('getRemainingSecondsToTime calculates remaining seconds correctly', () => {
  const now = new Date('2026-11-05T14:00:00');
  // 30 minutes later = 1800s
  const diff1 = getRemainingSecondsToTime('14:30', now);
  assert.equal(diff1, 1800);

  // Past time rolls over to next day
  const diffPast = getRemainingSecondsToTime('13:00', now);
  // 23 hours later = 23 * 3600 = 82800s
  assert.equal(diffPast, 82800);
});
