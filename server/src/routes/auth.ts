import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { MongoServerError, ObjectId } from 'mongodb';
import { z } from 'zod';
import { endSession, startSession } from '../auth/session.js';
import type { Database } from '../db.js';
import { conflict, HttpError } from '../lib/http.js';
import { normalizeIndianMobile } from '../lib/phone.js';
import { emptyCustomerStats, toMe } from '../lib/serialize.js';
import { EXPERIENCE, LANGS, ROLES, TRADES, type UserDoc } from '../types.js';

export const dayRateInput = z
  .object({ min: z.number().int().min(100).max(20000), max: z.number().int().min(100).max(20000) })
  .refine((r) => r.min <= r.max, { message: 'Minimum day rate must not exceed the maximum', path: ['min'] });

export const workerProfileInput = z.object({
  trade: z.enum(TRADES),
  experience: z.enum(EXPERIENCE),
  naka: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  dayRate: dayRateInput.optional(),
});

const phoneInput = z.string().transform((value, ctx) => {
  const phone = normalizeIndianMobile(value);
  if (!phone) {
    ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit Indian mobile number' });
    return z.NEVER;
  }
  return phone;
});

const registerBody = z
  .object({
    phone: phoneInput,
    name: z.string().trim().min(2).max(60),
    role: z.enum(ROLES),
    lang: z.enum(LANGS).default('en'),
    worker: workerProfileInput.optional(),
  })
  .superRefine((b, ctx) => {
    if (b.role === 'worker' && !b.worker) {
      ctx.addIssue({ code: 'custom', path: ['worker'], message: 'Trade, experience, naka and city are required' });
    }
  });

const loginBody = z.object({ phone: phoneInput });

// No 0/O/1/l/i so the id survives being read aloud or typed from a printed card.
const PUBLIC_ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const newPublicId = () =>
  Array.from({ length: 8 }, () => PUBLIC_ID_ALPHABET[randomInt(PUBLIC_ID_ALPHABET.length)]).join('');

const isDuplicateKey = (err: unknown) => err instanceof MongoServerError && err.code === 11000;

export function authRoutes(db: Database): Router {
  const r = Router();

  r.post('/register', async (req, res) => {
    const body = registerBody.parse(req.body);
    const now = new Date();

    for (let attempt = 0; attempt < 3; attempt++) {
      const user: UserDoc = {
        _id: new ObjectId(),
        phone: body.phone,
        name: body.name,
        role: body.role,
        lang: body.lang,
        createdAt: now,
        updatedAt: now,
      };
      if (body.role === 'worker' && body.worker) {
        user.worker = {
          publicId: newPublicId(),
          ...body.worker,
          available: true,
          availableUpdatedAt: now,
          stats: { jobsDone: 0, reviewCount: 0, score: null, breakdown: null, recommendRate: null },
        };
      } else {
        user.customerStats = emptyCustomerStats();
      }

      try {
        await db.col.users.insertOne(user);
        await startSession(db, res, user._id);
        res.status(201).json({ user: toMe(user) });
        return;
      } catch (err) {
        if (!isDuplicateKey(err)) throw err;
        const taken = await db.col.users.countDocuments({ phone: body.phone }, { limit: 1 });
        if (taken) throw conflict('phone_taken', 'This number already has an account. Please sign in instead.');
        // Otherwise the random public card id collided; try again with a new one.
      }
    }
    throw new HttpError(500, 'server_error', 'Could not create the account. Please try again.');
  });

  r.post('/login', async (req, res) => {
    const { phone } = loginBody.parse(req.body);
    const user = await db.col.users.findOne({ phone });
    if (!user) throw new HttpError(404, 'no_account', 'No account with this number yet. Create one to continue.');
    await startSession(db, res, user._id);
    res.json({ user: toMe(user) });
  });

  r.post('/logout', async (req, res) => {
    await endSession(db, req, res);
    res.status(204).end();
  });

  return r;
}
