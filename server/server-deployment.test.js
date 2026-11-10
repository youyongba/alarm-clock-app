import test from 'node:test';
import assert from 'node:assert/strict';

test('server-mobile exports valid express app and broadcast function', async () => {
  const mobileModule = await import('./server-mobile.js');
  assert.ok(mobileModule.app);
  assert.ok(mobileModule.server);
  assert.ok(mobileModule.wss);
  assert.equal(typeof mobileModule.broadcast, 'function');
});

test('server-web exports valid express app and broadcast function', async () => {
  const webModule = await import('./server-web.js');
  assert.ok(webModule.app);
  assert.ok(webModule.server);
  assert.ok(webModule.wss);
  assert.equal(typeof webModule.broadcast, 'function');
});
