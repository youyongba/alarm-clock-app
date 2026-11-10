import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveClientMode } from './routing-logic.js';

test('resolveClientMode prioritizes environment variables when set', () => {
  assert.equal(resolveClientMode({ envMode: 'mobile', pathname: '/pc' }), 'app');
  assert.equal(resolveClientMode({ envMode: 'app', pathname: '/pc' }), 'app');
  assert.equal(resolveClientMode({ envMode: 'web', pathname: '/mobile' }), 'pc');
  assert.equal(resolveClientMode({ envMode: 'pc', pathname: '/mobile' }), 'pc');
});

test('resolveClientMode accurately recognizes dedicated URL paths', () => {
  assert.equal(resolveClientMode({ pathname: '/pc' }), 'pc');
  assert.equal(resolveClientMode({ pathname: '/pc/dashboard' }), 'pc');
  assert.equal(resolveClientMode({ pathname: '/web' }), 'pc');
  assert.equal(resolveClientMode({ pathname: '/web.html' }), 'pc');
  assert.equal(resolveClientMode({ pathname: '/mobile' }), 'app');
  assert.equal(resolveClientMode({ pathname: '/app' }), 'app');
  assert.equal(resolveClientMode({ pathname: '/mobile.html' }), 'app');
});

test('resolveClientMode checks query parameters', () => {
  assert.equal(resolveClientMode({ pathname: '/', search: '?mode=pc' }), 'pc');
  assert.equal(resolveClientMode({ pathname: '/', search: '?view=full&mode=web' }), 'pc');
  assert.equal(resolveClientMode({ pathname: '/', search: '?mode=mobile' }), 'app');
  assert.equal(resolveClientMode({ pathname: '/', search: '?mode=app' }), 'app');
});

test('resolveClientMode respects user saved preference when no explicit route', () => {
  assert.equal(resolveClientMode({ pathname: '/', savedMode: 'pc', windowWidth: 375 }), 'pc');
  assert.equal(resolveClientMode({ pathname: '/', savedMode: 'app', windowWidth: 1440 }), 'app');
});

test('resolveClientMode falls back to screen width heuristics', () => {
  assert.equal(resolveClientMode({ pathname: '/', windowWidth: 1280 }), 'pc');
  assert.equal(resolveClientMode({ pathname: '/', windowWidth: 768 }), 'app');
  assert.equal(resolveClientMode({ pathname: '/', windowWidth: 375 }), 'app');
});
