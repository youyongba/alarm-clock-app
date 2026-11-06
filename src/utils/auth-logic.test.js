/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  isValidEmail,
  validatePassword,
  generateVerificationCode,
  verifyCode,
  createDefaultUser,
} from './auth-logic.js';

test('isValidEmail validates normal and edge case email addresses', () => {
  assert.strictEqual(isValidEmail('test@example.com'), true);
  assert.strictEqual(isValidEmail('qihong1222@gmail.com'), true);
  assert.strictEqual(isValidEmail('user.name+tag@sub.domain.org'), true);

  assert.strictEqual(isValidEmail(''), false);
  assert.strictEqual(isValidEmail('not-an-email'), false);
  assert.strictEqual(isValidEmail('@example.com'), false);
  assert.strictEqual(isValidEmail('test@'), false);
  assert.strictEqual(isValidEmail(null), false);
  assert.strictEqual(isValidEmail(undefined), false);
});

test('validatePassword enforces length bounds', () => {
  assert.strictEqual(validatePassword('123456').valid, true);
  assert.strictEqual(validatePassword('StrongPassword!123').valid, true);

  const tooShort = validatePassword('12345');
  assert.strictEqual(tooShort.valid, false);
  assert.match(tooShort.message, /不能少于 6 位/);

  const empty = validatePassword('');
  assert.strictEqual(empty.valid, false);
});

test('generateVerificationCode produces 6 digits', () => {
  for (let i = 0; i < 10; i++) {
    const code = generateVerificationCode();
    assert.strictEqual(typeof code, 'string');
    assert.strictEqual(code.length, 6);
    assert.strictEqual(/^\d{6}$/.test(code), true);
  }
});

test('verifyCode correctly validates input, matches, and expiration', () => {
  const code = '123456';
  const now = Date.now();

  // Valid match
  const validResult = verifyCode('123456', code, now, 60000);
  assert.strictEqual(validResult.valid, true);

  // Mismatched code
  const mismatchResult = verifyCode('654321', code, now, 60000);
  assert.strictEqual(mismatchResult.valid, false);
  assert.match(mismatchResult.message, /不正确/);

  // Expired code
  const expiredResult = verifyCode('123456', code, now - 70000, 60000);
  assert.strictEqual(expiredResult.valid, false);
  assert.match(expiredResult.message, /已过期/);
});

test('createDefaultUser creates consistent user object with fallback values', () => {
  const user = createDefaultUser({
    email: 'test@domain.com',
    nickname: 'TomatoMaster',
  });

  assert.strictEqual(user.email, 'test@domain.com');
  assert.strictEqual(user.nickname, 'TomatoMaster');
  assert.strictEqual(user.avatar, '🍅');
  assert.strictEqual(typeof user.uid, 'string');
  assert.strictEqual(user.webhookToken, 'dev-token');
  assert.strictEqual(user.stats.totalCompletedPomodoros, 0);
});
