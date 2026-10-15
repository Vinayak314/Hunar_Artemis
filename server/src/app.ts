import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express, { type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { loadUser } from './auth/session.js';
import type { Database } from './db.js';
import { env } from './env.js';
import { errorHandler, HttpError, notFoundHandler } from './lib/http.js';
import { authRoutes } from './routes/auth.js';
import { jobRoutes } from './routes/jobs.js';
import { meRoutes } from './routes/me.js';
import { workerRoutes } from './routes/workers.js';

/** Credentialed CORS for an explicit allow-list only (needed when client and API are on different origins). */
function cors(origins: string[]): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '600');
        res.status(204).end();
        return;
      }
    }
    next();
  };
}

/**
 * CSRF guard: every state-changing request must be JSON. Browsers cannot send
 * application/json cross-site without a CORS preflight, which the allow-list rejects.
 */
const requireJson: RequestHandler = (req, _res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && !req.is('application/json')) {
    next(new HttpError(415, 'json_required', 'Requests must be sent as JSON.'));
    return;
  }
  next();
};

export function createApp(db: Database) {
  const app = express();
  app.disable('x-powered-by');
  if (env.isProd) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        // Browsers would rewrite http://localhost asset URLs to https and break local runs.
        directives: { 'upgrade-insecure-requests': env.isProd ? [] : null },
      },
    }),
  );
  app.use(cors(env.clientOrigins));
  app.use(cookieParser());
  app.use('/api', requireJson);
  // Photos for the job helper need a larger body than everything else.
  app.use('/api/jobs/draft', express.json({ limit: '4mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(loadUser(db));

  app.get('/api/health', async (_req, res) => {
    try {
      await db.db.command({ ping: 1 });
      res.json({ ok: true, db: 'up' });
    } catch (err) {
      console.error('[health] database ping failed:', err);
      res.status(503).json({ ok: false, db: 'down' });
    }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 1000 : 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new HttpError(429, 'rate_limited', 'Too many sign-in attempts. Please wait a few minutes.')),
  });

  app.use('/api/auth', authLimiter, authRoutes(db));
  app.use('/api/me', meRoutes(db));
  app.use('/api/jobs', jobRoutes(db));
  app.use('/api/workers', workerRoutes(db));
  app.use('/api', notFoundHandler);
  serveClient(app);
  app.use(errorHandler);
  return app;
}

/**
 * When the client has been built (client/dist), serve it from the same origin as the API.
 * That keeps the session cookie first-party and makes one process enough to deploy.
 */
function serveClient(app: express.Express): void {
  const dist = env.CLIENT_DIST ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
  const indexHtml = path.join(dist, 'index.html');
  if (!existsSync(indexHtml)) return;

  // Hashed build assets never change, so they can be cached for a year.
  app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }));
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}
