import type { NextFunction, Request, Response } from 'express';
export function createOriginGuard(allowedOrigins: readonly string[]) {
  const allowed = new Set(allowedOrigins);
  return function originGuard(request: Request, response: Response, next: NextFunction): void {
    if (!['POST','PUT','PATCH','DELETE'].includes(request.method)) { next(); return; }
    const origin = request.get('origin');
    if (!origin || !allowed.has(origin)) { response.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'Request origin is not allowed' } }); return; }
    next();
  };
}