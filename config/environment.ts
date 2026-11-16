import path from 'node:path';
import fs from 'node:fs';

export interface AppConfig {
  readonly host: string;
  readonly port: number;
  readonly databasePath: string;
  readonly allowedOrigins: readonly string[];
  readonly trustedProxyAddresses: readonly string[];
  readonly cookieSecure: boolean;
  readonly sessionHmacKey: Buffer;
  readonly sessionHmacKeyPath: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function loadConfig(env = process.env): AppConfig {
  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  const keyHex = env.LOGIN_HMAC_KEY_HEX?.trim();
  let key: Buffer;
  if (keyHex) {
    if (!/^(?:[0-9a-fA-F]{2}){32}$/.test(keyHex)) throw new Error('LOGIN_HMAC_KEY_HEX must encode exactly 32 bytes');
    key = Buffer.from(keyHex, 'hex');
  } else {
    const keyPath = env.LOGIN_HMAC_KEY_FILE?.trim();
    if (!keyPath) throw new Error('LOGIN_HMAC_KEY_FILE is required; refusing insecure defaults');
    key = fs.readFileSync(path.resolve(keyPath));
    if (key.byteLength !== 32) throw new Error('Login HMAC key file must contain exactly 32 bytes');
  }
  const origins = (env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',').map((x) => x.trim()).filter(Boolean);
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) throw new Error(`Invalid exact Origin: ${origin}`);
  }
  return {
    host: env.HOST ?? '127.0.0.1', port,
    databasePath: path.resolve(env.DATABASE_PATH ?? './data/changeflow.sqlite'),
    allowedOrigins: origins,
    trustedProxyAddresses: (env.TRUSTED_PROXY_ADDRESSES ?? '').split(',').map((x) => x.trim()).filter(Boolean),
    cookieSecure: env.COOKIE_SECURE === 'true',
    sessionHmacKey: key,
    sessionHmacKeyPath: path.resolve(env.LOGIN_HMAC_KEY_FILE ?? '<environment>'),
  };
}
