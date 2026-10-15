import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ObjectId } from 'mongodb';
import { ZodError } from 'zod';

/** An error whose message is safe to show to the client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string) => new HttpError(400, code, message);
export const unauthorized = (message = 'Please sign in to continue.') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You are not allowed to do this.') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);

export function parseObjectId(value: unknown): ObjectId {
  if (typeof value !== 'string' || !ObjectId.isValid(value) || String(new ObjectId(value)) !== value) {
    throw notFound();
  }
  return new ObjectId(value);
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound('No such API route.'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'invalid_input',
        message: 'Some fields are missing or invalid.',
        fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // express.json() parse failures and payload-size errors carry a status.
  const status = typeof err?.status === 'number' ? err.status : 500;
  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong. Please try again.' } });
    return;
  }
  res.status(status).json({ error: { code: 'bad_request', message: 'The request could not be read.' } });
};
