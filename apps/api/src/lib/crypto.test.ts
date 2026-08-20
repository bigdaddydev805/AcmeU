import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  constantTimeEqual,
  decryptField,
  encryptField,
  generateApiKey,
  hashApiKey,
  hashPassword,
  randomToken,
  readPersistentSession,
  signPersistentSession,
  verifyPassword,
} from './crypto';

test('password hashes verify against the original secret', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
  assert.equal(await verifyPassword('wrong password', hash), false);
  assert.equal(await verifyPassword('anything', null), false);
});

test('field encryption round-trips', () => {
  const scope = 'tenant-abc';
  const plaintext = JSON.stringify({ employeeId: 'NW-0042' });
  assert.equal(decryptField(scope, encryptField(scope, plaintext)), plaintext);
});

test('api keys carry a stable prefix and matching hash', () => {
  const { key, prefix, hash } = generateApiKey();
  assert.ok(key.startsWith('acu_'));
  assert.equal(prefix, key.slice(0, 12));
  assert.equal(hashApiKey(key), hash);
});

test('persistent session cookies round-trip and reject tampering', () => {
  const userId = 'a1000000-0000-4000-8000-000000000006';
  const cookie = signPersistentSession(userId);
  assert.equal(readPersistentSession(cookie), userId);
  assert.equal(readPersistentSession(`${cookie}00`), null);
  assert.equal(readPersistentSession('not-a-cookie'), null);
});

test('randomToken produces distinct url-safe values', () => {
  const a = randomToken(16);
  const b = randomToken(16);
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});

test('constantTimeEqual compares equal-length strings', () => {
  assert.equal(constantTimeEqual('abcdef', 'abcdef'), true);
  assert.equal(constantTimeEqual('abcdef', 'abcdeg'), false);
  assert.equal(constantTimeEqual('abc', 'abcdef'), false);
});
