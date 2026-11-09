import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encryption, passwordHash, passwordMatches } from '../crypto.js';

test('AES-GCM randomizes encryption and detects tampering and record swaps', () => {
  const cipher = encryption(randomBytes(32).toString('hex'));
  const value = { text: 'Private sample message' };
  const first = cipher.seal(value, 'messages:one');
  assert.notEqual(first, cipher.seal(value, 'messages:one'));
  assert.ok(!first.includes(value.text));
  assert.deepEqual(cipher.open(first, 'messages:one'), value);
  assert.throws(() => cipher.open(first, 'messages:two'));
  const pieces = first.split('.');
  pieces[2] = Buffer.alloc(16).toString('base64');
  assert.throws(() => cipher.open(pieces.join('.'), 'messages:one'));
  assert.throws(() => encryption('bad'));
});

test('Passwords are salted hashes, not reversibly encrypted', async () => {
  const password = 'Long sample password 2026!';
  const first = await passwordHash(password);
  assert.notEqual(first, await passwordHash(password));
  assert.equal(await passwordMatches(password, first), true);
  assert.equal(await passwordMatches('wrong password', first), false);
  await assert.rejects(passwordHash('short'));
});
