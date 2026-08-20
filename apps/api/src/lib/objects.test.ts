import assert from 'node:assert/strict';
import { test } from 'node:test';
import { camelize, deepMerge, omit, pick, toBool } from './objects';

test('deepMerge combines nested objects', () => {
  const target = { theme: 'light', notifications: { email: true, sms: false } };
  const result = deepMerge(target, { notifications: { sms: true }, locale: 'en-GB' });

  assert.equal(result.theme, 'light');
  assert.equal((result.notifications as Record<string, unknown>).email, true);
  assert.equal((result.notifications as Record<string, unknown>).sms, true);
  assert.equal((result as Record<string, unknown>).locale, 'en-GB');
});

test('deepMerge leaves undefined values alone', () => {
  const result = deepMerge({ a: 1 }, { a: undefined, b: 2 });
  assert.equal(result.a, 1);
  assert.equal((result as Record<string, unknown>).b, 2);
});

test('pick and omit select the expected keys', () => {
  const source = { id: '1', email: 'a@b.example', secret: 'x' };
  assert.deepEqual(pick(source, ['id', 'email']), { id: '1', email: 'a@b.example' });
  assert.deepEqual(omit(source, ['secret']), { id: '1', email: 'a@b.example' });
});

test('camelize converts snake_case columns', () => {
  const row = { user_id: '7', display_name: 'Ada', created_at: 'now' };
  assert.deepEqual(camelize(row), { userId: '7', displayName: 'Ada', createdAt: 'now' });
});

test('toBool interprets the usual truthy encodings', () => {
  assert.equal(toBool('true'), true);
  assert.equal(toBool('1'), true);
  assert.equal(toBool('no'), false);
  assert.equal(toBool(undefined, true), true);
});
