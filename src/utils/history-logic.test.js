import test from 'node:test';
import assert from 'node:assert/strict';
import { createRingRecord, filterRecords, formatTriggerTime } from './history-logic.js';

test('createRingRecord initializes complete record with default fallbacks', () => {
  const rec = createRingRecord({
    category: 'webhook',
    eventId: 'evt-test-1',
    message: 'CI 部署完成',
    source: 'GitHub',
    durationMs: 3000,
  });

  assert.equal(rec.id, 'evt-test-1');
  assert.equal(rec.category, 'webhook');
  assert.equal(rec.source, 'GitHub');
  assert.equal(rec.message, 'CI 部署完成');
  assert.equal(rec.durationMs, 3000);
  assert.equal(rec.isDuplicate, false);
});

test('filterRecords accurately separates webhook and timer records', () => {
  const records = [
    { id: '1', category: 'webhook' },
    { id: '2', category: 'pomodoro' },
    { id: '3', category: 'timer' },
    { id: '4', category: 'webhook' },
    { id: '5', category: 'alarm' },
  ];

  assert.equal(filterRecords(records, 'all').length, 5);
  assert.equal(filterRecords(records, 'webhook').length, 2);
  assert.equal(filterRecords(records, 'timer').length, 3);
});

test('formatTriggerTime calculates human-friendly relative time', () => {
  const baseNow = 1700000000000;
  assert.equal(formatTriggerTime(baseNow - 5000, baseNow), '刚刚');
  assert.equal(formatTriggerTime(baseNow - 30000, baseNow), '30秒前');
  assert.equal(formatTriggerTime(baseNow - 120000, baseNow), '2分钟前');
});
