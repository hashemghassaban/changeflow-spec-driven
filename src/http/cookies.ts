import type { CookieOptions, Response } from 'express';
export const SESSION_COOKIE = 'changeflow_session';
export function sessionCookieOptions(secure: boolean): CookieOptions { return { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 12 * 60 * 60 * 1000 }; }
export function setSessionCookie(response: Response, token: string, secure: boolean): void { response.cookie(SESSION_COOKIE, token, sessionCookieOptions(secure)); }
export function clearSessionCookie(response: Response, secure: boolean): void { response.clearCookie(SESSION_COOKIE, sessionCookieOptions(secure)); }