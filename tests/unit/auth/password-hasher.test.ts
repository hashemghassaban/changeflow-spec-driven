import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from '../../../src/application/auth/password-hasher.js';

test('scrypt hashes use independent salt and verify without storing raw password', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');
  assert.equal(first.scryptN, 2 ** 17); assert.equal(first.scryptR, 8); assert.equal(first.scryptP, 1); assert.equal(first.keyLength, 64);
  assert.equal(first.passwordSalt.length, 16); assert.equal(first.passwordHash.length, 64);
  assert.notDeepEqual(first.passwordSalt, second.passwordSalt);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('incorrect', first), false);
  assert.equal('password' in first, false);
});