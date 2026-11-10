import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTime,
  calculateProgress,
  getNextPhase,
  PHASE_CONFIG,
  calculateRemainingSeconds,
  restoreSessionState,
} from './timer-logic.js';

test('PHASE_CONFIG has correct standard durations', () => {
  assert.equal(PHASE_CONFIG.focus.duration, 1500); // 25 min
  assert.equal(PHASE_CONFIG.shortBreak.duration, 300); // 5 min
  assert.equal(PHASE_CONFIG.longBreak.duration, 900); // 15 min
});

test('formatTime formats seconds into mm:ss correctly', () => {
  assert.equal(formatTime(1500), '25:00');
  assert.equal(formatTime(300), '05:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(-10), '00:00');
});

test('calculateProgress returns correct ratio between 0 and 1', () => {
  assert.equal(calculateProgress(1500, 1500), 0);
  assert.equal(calculateProgress(750, 1500), 0.5);
  assert.equal(calculateProgress(0, 1500), 1);
});

test('getNextPhase cycles through shortBreak and triggers longBreak every 4 focus sessions', () => {
  const p1 = getNextPhase('focus', 0);
  assert.equal(p1.nextPhase, 'shortBreak');
  assert.equal(p1.updatedCount, 1);

  const p2 = getNextPhase('shortBreak', 1);
  assert.equal(p2.nextPhase, 'focus');
  assert.equal(p2.updatedCount, 1);

  const p3 = getNextPhase('focus', 3);
  assert.equal(p3.nextPhase, 'longBreak');
  assert.equal(p3.updatedCount, 4);

  const p4 = getNextPhase('longBreak', 4);
  assert.equal(p4.nextPhase, 'focus');
  assert.equal(p4.updatedCount, 4);
});

test('calculateRemainingSeconds handles timestamps correctly', () => {
  const now = 1000000;
  assert.equal(calculateRemainingSeconds(now + 300000, now), 300); // 5 min
  assert.equal(calculateRemainingSeconds(now + 1000, now), 1);
  assert.equal(calculateRemainingSeconds(now - 5000, now), 0);
  assert.equal(calculateRemainingSeconds(null, now), 0);
});

test('restoreSessionState restores running, paused, and expired states accurately', () => {
  const now = 1000000;

  // 1. Null or empty state -> default focus idle
  const s1 = restoreSessionState(null, now);
  assert.equal(s1.phase, 'focus');
  assert.equal(s1.status, 'idle');
  assert.equal(s1.timeLeft, 1500);

  // 2. Active running state with remaining time
  const s2 = restoreSessionState(
    {
      phase: 'shortBreak',
      status: 'running',
      targetEndTime: now + 180000, // 3 min left
      completedPomodoros: 2,
    },
    now
  );
  assert.equal(s2.phase, 'shortBreak');
  assert.equal(s2.status, 'running');
  assert.equal(s2.timeLeft, 180);
  assert.equal(s2.completedPomodoros, 2);

  // 3. Expired running state (time elapsed while away)
  const s3 = restoreSessionState(
    {
      phase: 'focus',
      status: 'running',
      targetEndTime: now - 10000, // passed 10s ago
      completedPomodoros: 1,
    },
    now
  );
  assert.equal(s3.phase, 'focus');
  assert.equal(s3.status, 'completed');
  assert.equal(s3.timeLeft, 0);

  // 4. Paused state
  const s4 = restoreSessionState(
    {
      phase: 'longBreak',
      status: 'paused',
      timeLeft: 450,
      completedPomodoros: 4,
    },
    now
  );
  assert.equal(s4.phase, 'longBreak');
  assert.equal(s4.status, 'paused');
  assert.equal(s4.timeLeft, 450);
});

