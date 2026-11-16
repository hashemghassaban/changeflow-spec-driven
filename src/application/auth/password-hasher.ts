import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import type { PasswordCredential } from '../../domain/account.js';
function scrypt(password: string, salt: Buffer, keyLength: number, options: { N: number; r: number; p: number; maxmem: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, keyLength, options, (error, derived) => error ? reject(error) : resolve(derived)));
}
const N = 2 ** 17; const r = 8; const p = 1; const keyLength = 64; const maxmem = 256 * 1024 * 1024;

export async function hashPassword(password: string): Promise<PasswordCredential> {
  if (typeof password !== 'string' || password.length < 1 || Buffer.byteLength(password, 'utf8') > 1024) throw new Error('Password input is invalid');
  const passwordSalt = randomBytes(16);
  const passwordHash = Buffer.from(await scrypt(password, passwordSalt, keyLength, { N, r, p, maxmem }) as Buffer);
  return { passwordHash, passwordSalt, scryptN: N, scryptR: r, scryptP: p, keyLength };
}

export async function verifyPassword(password: string, credential: PasswordCredential): Promise<boolean> {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 1024) return false;
  const actual = Buffer.from(await scrypt(password, credential.passwordSalt, credential.keyLength, { N: credential.scryptN, r: credential.scryptR, p: credential.scryptP, maxmem } ) as Buffer);
  return actual.length === credential.passwordHash.length && timingSafeEqual(actual, credential.passwordHash);
}

export const dummyPasswordCredential: PasswordCredential = Object.freeze({
  passwordHash: Buffer.from('e66f9d9f872cd05b381ae76fdfcd963ebc73b82068a0f0e386a3f421c3b85f4f10eb6fc4ce72b190f4d310fd55b3d397e2e843c3a06572259d7f30d276efcc8e', 'hex'),
  passwordSalt: Buffer.from('0123456789abcdef', 'hex'), scryptN: N, scryptR: r, scryptP: p, keyLength,
});