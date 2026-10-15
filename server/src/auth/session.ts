import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import type { ObjectId } from 'mongodb';
import type { Database } from '../db.js';
import { env } from '../env.js';
import { forbidden, unauthorized } from '../lib/http.js';
import type { Role, UserDoc } from '../types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export const SESSION_COOKIE = 'hunar_session';

/**
 * Sessions are opaque random tokens. The browser holds the raw token in an
 * httpOnly cookie; the database only stores its sha256, so a leaked database
 * dump cannot be replayed as a login.
 */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
  };
}

export async function startSession(db: Database, res: Response, userId: ObjectId): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const ttlMs = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const now = new Date();
  await db.col.sessions.insertOne({
    _id: hashToken(token),
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttlMs),
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: ttlMs });
}

export async function endSession(db: Database, req: Request, res: Response): Promise<void> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token) {
    await db.col.sessions.deleteOne({ _id: hashToken(token) });
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

/** Attaches req.user when a valid session cookie is present. Never rejects. */
export function loadUser(db: Database): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token) return next();
    const session = await db.col.sessions.findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
    if (session) {
      const user = await db.col.users.findOne({ _id: session.userId });
      if (user) req.user = user;
    }
    next();
  };
}

export const requireUser: RequestHandler = (req, _res, next) => {
  next(req.user ? undefined : unauthorized());
};

export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== role) {
      return next(forbidden(role === 'worker' ? 'Only workers can do this.' : 'Only customers can do this.'));
    }
    next();
  };
}

/** Narrow req.user after requireUser/requireRole ran. */
export function currentUser(req: Request): UserDoc {
  if (!req.user) throw unauthorized();
  return req.user;
}
