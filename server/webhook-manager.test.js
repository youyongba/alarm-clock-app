/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerClient,
  unregisterClient,
  getActiveClientsList,
  recordWebhookLog,
  getWebhookLogs,
  clearWebhookLogs,
  createWebhookManagerRouter,
} from './webhook-manager.js';

test('registerClient and unregisterClient track active WebSocket clients correctly', () => {
  const mockWs = {
    on: () => {},
  };
  const mockReq = {
    socket: { remoteAddress: '::ffff:192.168.1.100' },
    headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
  };

  const clientId = registerClient(mockWs, mockReq, 'Port-3000');
  assert.ok(clientId.startsWith('client_'));

  const list = getActiveClientsList();
  assert.ok(list.some((c) => c.id === clientId));
  const found = list.find((c) => c.id === clientId);
  assert.equal(found.ip, '192.168.1.100');
  assert.ok(found.platform.includes('iOS'));

  unregisterClient(mockWs);
  const afterList = getActiveClientsList();
  assert.ok(!afterList.some((c) => c.id === clientId));
});

test('recordWebhookLog and clearWebhookLogs maintain bounded history', () => {
  clearWebhookLogs();
  assert.equal(getWebhookLogs().length, 0);

  recordWebhookLog({
    eventId: 'test-evt-001',
    source: 'CI',
    message: 'Test build',
    durationMs: 3000,
    sound: 'ring',
    clientsNotified: 2,
    status: 'broadcasted',
  });

  const logs = getWebhookLogs();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].eventId, 'test-evt-001');
  assert.equal(logs[0].clientsNotified, 2);

  clearWebhookLogs();
  assert.equal(getWebhookLogs().length, 0);
});

test('createWebhookManagerRouter handles status and trigger endpoints', () => {
  let broadcastCount = 0;
  const mockBroadcast = (data) => {
    broadcastCount += 1;
    return 3;
  };

  const router = createWebhookManagerRouter(mockBroadcast);

  // Test getStatus
  let statusResult = null;
  router.getStatus(
    {},
    {
      json: (data) => {
        statusResult = data;
      },
    }
  );
  assert.equal(statusResult.ok, true);
  assert.equal(typeof statusResult.clientsCount, 'number');

  // Test testTrigger
  let triggerResult = null;
  router.testTrigger(
    {
      body: {
        eventId: `test-trigger-${Date.now()}`,
        source: 'UnitTest',
        message: 'Hello PC Console',
        durationMs: 4000,
      },
    },
    {
      json: (data) => {
        triggerResult = data;
      },
      status: () => ({ json: (d) => (triggerResult = d) }),
    }
  );

  assert.equal(triggerResult.ok, true);
  assert.equal(triggerResult.clientsNotified, 3);
  assert.equal(broadcastCount, 1);
});
