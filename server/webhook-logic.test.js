import test from 'node:test';
import assert from 'node:assert/strict';
import { validateToken, validateWebhookPayload, EventDeduplicator } from './webhook-logic.js';

test('validateToken checks token correctly', () => {
  assert.deepEqual(validateToken(undefined, 'dev-token'), {
    valid: false,
    error: '缺少 X-Webhook-Token 请求头',
  });
  assert.deepEqual(validateToken('wrong-token', 'dev-token'), {
    valid: false,
    error: 'X-Webhook-Token 无效或已过期',
  });
  assert.deepEqual(validateToken('dev-token', 'dev-token'), {
    valid: true,
  });
});

test('validateWebhookPayload validates fields properly', () => {
  // Invalid body
  assert.equal(validateWebhookPayload(null).valid, false);
  assert.equal(validateWebhookPayload([]).valid, false);

  // Missing or invalid eventId
  assert.equal(validateWebhookPayload({ message: 'hello' }).valid, false);
  assert.equal(validateWebhookPayload({ eventId: '', message: 'hello' }).valid, false);

  // Missing or invalid message
  assert.equal(validateWebhookPayload({ eventId: 'evt-1', message: 123 }).valid, false);
  assert.equal(validateWebhookPayload({ eventId: 'evt-1', message: '   ' }).valid, false);

  // Invalid durationMs
  assert.equal(
    validateWebhookPayload({ eventId: 'evt-1', message: 'hello', durationMs: -5 }).valid,
    false
  );

  // Valid payload with defaults
  const valid = validateWebhookPayload({
    eventId: 'evt-100',
    message: '喝水提醒',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.sanitized.eventId, 'evt-100');
  assert.equal(valid.sanitized.message, '喝水提醒');
  assert.equal(valid.sanitized.durationMs, 5000);
  assert.equal(valid.sanitized.sound, 'ring');
  assert.equal(valid.sanitized.source, 'webhook');
});

test('EventDeduplicator properly detects duplicates and enforces maxSize FIFO eviction', () => {
  const dedup = new EventDeduplicator(3);

  // First time
  const res1 = dedup.checkAndStore('e1', { message: 'm1' });
  assert.equal(res1.isDuplicate, false);
  assert.equal(dedup.size, 1);

  // Duplicate
  const res2 = dedup.checkAndStore('e1', { message: 'm1-again' });
  assert.equal(res2.isDuplicate, true);
  assert.equal(dedup.size, 1);

  // Add up to max
  dedup.checkAndStore('e2', { message: 'm2' });
  dedup.checkAndStore('e3', { message: 'm3' });
  assert.equal(dedup.size, 3);

  // Add 4th, e1 should be evicted FIFO
  dedup.checkAndStore('e4', { message: 'm4' });
  assert.equal(dedup.size, 3);

  // e1 should now be considered new again
  const resE1 = dedup.checkAndStore('e1', { message: 'm1-new' });
  assert.equal(resE1.isDuplicate, false);
});
