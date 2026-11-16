import { createHash } from 'node:crypto';
import type { SqliteDatabase } from './database.js';

export interface SessionRow { readonly userId: string; readonly csrfToken: Buffer; readonly createdAt: number; readonly lastSeenAt: number; readonly absoluteExpiresAt: number }
export const IDLE_TTL_MS = 30 * 60_000; export const ABSOLUTE_TTL_MS = 12 * 60 * 60_000;
export const hashSessionToken = (token: string): Buffer => createHash('sha256').update(token).digest();
export class SessionStore {
  constructor(private readonly db: SqliteDatabase, private readonly now: () => number = Date.now) {}
  create(token: string, csrfToken: Buffer, userId: string): void {
    const now = this.now();
    this.db.prepare('INSERT INTO ServerSession(sessionIdHash,userId,csrfToken,createdAt,lastSeenAt,absoluteExpiresAt) VALUES (?,?,?,?,?,?)').run(hashSessionToken(token), userId, csrfToken, now, now, now + ABSOLUTE_TTL_MS);
  }
  findAndTouch(token: string): SessionRow | null {
    const now = this.now(); const hash = hashSessionToken(token);
    const row = this.db.prepare('SELECT userId,csrfToken,createdAt,lastSeenAt,absoluteExpiresAt FROM ServerSession WHERE sessionIdHash=?').get(hash) as SessionRow | undefined;
    if (!row) return null;
    if (now >= row.absoluteExpiresAt || now - row.lastSeenAt >= IDLE_TTL_MS) { this.db.prepare('DELETE FROM ServerSession WHERE sessionIdHash=?').run(hash); return null; }
    this.db.prepare('UPDATE ServerSession SET lastSeenAt=? WHERE sessionIdHash=?').run(now, hash);
    return { ...row, lastSeenAt: now };
  }
  delete(token: string): void { this.db.prepare('DELETE FROM ServerSession WHERE sessionIdHash=?').run(hashSessionToken(token)); }
  pruneExpired(): number { const result = this.db.prepare('DELETE FROM ServerSession WHERE absoluteExpiresAt<=? OR lastSeenAt<=?').run(this.now(), this.now() - IDLE_TTL_MS); return result.changes; }
}