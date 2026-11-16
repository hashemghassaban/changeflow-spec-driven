import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
export interface AuthenticatedSession { readonly csrfToken: Buffer; readonly userId?: string }
declare global { namespace Express { interface Request { changeflowSession?: AuthenticatedSession } } }
export function csrfGuard(request: Request, response: Response, next: NextFunction): void {
  if (!['POST','PUT','PATCH','DELETE'].includes(request.method) || request.path === '/auth/login') { next(); return; }
  const expected = request.changeflowSession?.csrfToken;
  const supplied = request.get('x-csrf-token');
  if (!expected || !supplied) { response.status(403).json({ error: { code: 'CSRF_REJECTED', message: 'CSRF validation failed' } }); return; }
  const actual = Buffer.from(supplied, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) { response.status(403).json({ error: { code: 'CSRF_REJECTED', message: 'CSRF validation failed' } }); return; }
  next();
}