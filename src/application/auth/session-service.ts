import { randomBytes } from 'node:crypto';
import { SessionStore } from '../../persistence/session-store.js';
export interface IssuedSession { readonly token: string; readonly csrfToken: string }
export class SessionService {
  constructor(private readonly store: SessionStore) {}
  rotateAfterLogin(userId: string): IssuedSession {
    const token = randomBytes(32).toString('base64url'); const csrf = randomBytes(32);
    this.store.create(token, csrf, userId);
    return { token, csrfToken: csrf.toString('base64url') };
  }
  authenticate(token: string) { return this.store.findAndTouch(token); }
  logout(token: string): void { this.store.delete(token); }
  prune(): number { return this.store.pruneExpired(); }
}