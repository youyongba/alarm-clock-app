/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert';
import { createAuthRouter } from './auth.js';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test('createAuthRouter handles register and duplicate checking', () => {
  const auth = createAuthRouter();

  const req1 = {
    body: {
      email: 'newuser@tomato.com',
      password: 'mypassword123',
      nickname: '新番茄',
    },
  };
  const res1 = mockRes();
  auth.register(req1, res1);

  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.body.ok, true);
  assert.strictEqual(res1.body.user.email, 'newuser@tomato.com');
  assert.strictEqual(typeof res1.body.token, 'string');

  // Try registering same email again
  const resDuplicate = mockRes();
  auth.register(req1, resDuplicate);
  assert.strictEqual(resDuplicate.statusCode, 409);
  assert.strictEqual(resDuplicate.body.ok, false);
});

test('createAuthRouter handles login with correct and incorrect password', () => {
  const auth = createAuthRouter();

  // Test with pre-seeded account: qihong1222@gmail.com / 123456
  const reqSuccess = {
    body: {
      email: 'qihong1222@gmail.com',
      password: '123456',
    },
  };
  const resSuccess = mockRes();
  auth.login(reqSuccess, resSuccess);
  assert.strictEqual(resSuccess.statusCode, 200);
  assert.strictEqual(resSuccess.body.ok, true);
  assert.strictEqual(typeof resSuccess.body.token, 'string');

  // Wrong password
  const reqFail = {
    body: {
      email: 'qihong1222@gmail.com',
      password: 'wrong_password',
    },
  };
  const resFail = mockRes();
  auth.login(reqFail, resFail);
  assert.strictEqual(resFail.statusCode, 401);
  assert.strictEqual(resFail.body.ok, false);
});

test('createAuthRouter handles forgotPassword and resetPassword flow', () => {
  const auth = createAuthRouter();

  // 1. Request forgot password code
  const reqForgot = {
    body: {
      email: 'qihong1222@gmail.com',
    },
  };
  const resForgot = mockRes();
  auth.forgotPassword(reqForgot, resForgot);
  assert.strictEqual(resForgot.statusCode, 200);
  assert.strictEqual(resForgot.body.ok, true);
  assert.strictEqual(typeof resForgot.body.codeForTesting, 'string');

  const code = resForgot.body.codeForTesting;

  // 2. Submit password reset with invalid code
  const reqInvalidCode = {
    body: {
      email: 'qihong1222@gmail.com',
      code: '999999',
      newPassword: 'newPassword888',
    },
  };
  const resInvalidCode = mockRes();
  auth.resetPassword(reqInvalidCode, resInvalidCode);
  assert.strictEqual(resInvalidCode.statusCode, 400);

  // 3. Submit password reset with correct code
  const reqResetSuccess = {
    body: {
      email: 'qihong1222@gmail.com',
      code,
      newPassword: 'newPassword888',
    },
  };
  const resResetSuccess = mockRes();
  auth.resetPassword(reqResetSuccess, resResetSuccess);
  assert.strictEqual(resResetSuccess.statusCode, 200);
  assert.strictEqual(resResetSuccess.body.ok, true);

  // 4. Verify login with the new password
  const reqNewLogin = {
    body: {
      email: 'qihong1222@gmail.com',
      password: 'newPassword888',
    },
  };
  const resNewLogin = mockRes();
  auth.login(reqNewLogin, resNewLogin);
  assert.strictEqual(resNewLogin.statusCode, 200);
  assert.strictEqual(resNewLogin.body.ok, true);
});
