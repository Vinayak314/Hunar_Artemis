import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { MongoServerError, ObjectId, type Filter } from 'mongodb';
import { z } from 'zod';
import { chatTurn, draftSchema, FIELDS } from '../ai/jobChat.js';
import { currentUser, requireRole, requireUser } from '../auth/session.js';
import type { Database } from '../db.js';
import { checkPay } from '../domain/fairPay.js';
import { computeWorkerStats, overallStars } from '../domain/score.js';
import { conflict, forbidden, HttpError, notFound, parseObjectId } from '../lib/http.js';
import { toJob } from '../lib/serialize.js';
import {
  LANGS,
  PAY_UNITS,
  PAYMENT_METHODS,
  PAYMENT_WHEN,
  TRADES,
  type JobDoc,
  type Localized,
  type ReviewDoc,
  type UserDoc,
} from '../types.js';

const localizedInput = z
  .object({ en: z.string().trim().max(120), hi: z.string().trim().max(120), mr: z.string().trim().max(120) })
  .partial();

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const chatBody = z
  .object({
    lang: z.enum(LANGS),
    turns: z
      .array(
        z.object({
          role: z.enum(['customer', 'assistant']),
          text: z.string().trim().max(600),
          field: z.enum(FIELDS).optional(),
          value: z.string().trim().max(80).optional(),
        }),
      )
      .min(1)
      .max(16),
    // What the assistant returned last turn. Untrusted: it is validated here and again when the job is created.
    draft: draftSchema.optional(),
    image: z
      .object({
        mimeType: z.enum(IMAGE_TYPES),
        // ~2.5 MB of base64; the client downsizes photos before sending.
        base64: z.string().max(3_500_000).regex(/^[A-Za-z0-9+/=]+$/),
      })
      .optional(),
    cityHint: z.string().trim().max(60).optional(),
  })
  .refine((b) => b.image !== undefined || b.turns.some((t) => t.role === 'customer' && t.text.length > 0), {
    message: 'Describe the job or send a photo',
    path: ['turns'],
  });

const payInput = z.object({
  amount: z.number().int().min(1).max(500_000),
  unit: z.enum(PAY_UNITS),
  days: z.number().int().min(1).max(365).optional(),
});

const createBody = z
  .object({
    trade: z.enum(TRADES),
    description: z.string().trim().min(5).max(1000),
    title: localizedInput.optional(),
    summary: localizedInput.optional(),
    locality: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(60),
    location: latLng.optional(),
    when: z.string().trim().min(2).max(80),
    duration: z.string().trim().max(60).optional(),
    pay: payInput,
    payment: z.object({
      when: z.enum(PAYMENT_WHEN),
      method: z.enum(PAYMENT_METHODS),
      advance: z.number().int().min(1).optional(),
    }),
  })
  .superRefine((b, ctx) => {
    if (b.payment.when === 'advance_part') {
      const total = b.pay.unit === 'per_day' ? b.pay.amount * (b.pay.days ?? 1) : b.pay.amount;
      if (!b.payment.advance) {
        ctx.addIssue({ code: 'custom', path: ['payment', 'advance'], message: 'Enter the advance amount' });
      } else if (b.payment.advance >= total) {
        ctx.addIssue({ code: 'custom', path: ['payment', 'advance'], message: 'Advance must be less than the total pay' });
      }
    }
  });

const feedQuery = z.object({
  trade: z.enum(TRADES).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  maxKm: z.coerce.number().min(1).max(100).default(25),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const payCheckQuery = z.object({
  trade: z.enum(TRADES),
  amount: z.coerce.number().int().min(1),
  unit: z.enum(PAY_UNITS),
  days: z.coerce.number().int().min(1).optional(),
});

const rating = z.number().int().min(1).max(5);
const customerReviewBody = z.object({
  ratings: z.object({ onTime: rating, quality: rating, behaviour: rating, fairPrice: rating }),
  comment: z.string().trim().max(500).optional(),
});
const workerReviewBody = z.object({ stars: rating, comment: z.string().trim().max(500).optional() });

const PARTY_PROJECTION = { projection: { name: 1, phone: 1, worker: 1, customerStats: 1 } } as const;

export function jobRoutes(db: Database): Router {
  const r = Router();
  r.use(requireUser);

  // The assistant costs money per call: cap it per account. A full chat is about 5 turns.
  const chatLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `u:${String(req.user._id)}` : ipKeyGenerator(req.ip ?? '')),
    handler: (_req, _res, next) =>
      next(new HttpError(429, 'rate_limited', 'Too many requests to the assistant. Try again in a while.')),
  });

  r.post('/chat', requireRole('customer'), chatLimiter, async (req, res) => {
    const body = chatBody.parse(req.body);
    const result = await chatTurn({
      lang: body.lang,
      turns: body.turns,
      ...(body.draft ? { draft: body.draft } : {}),
      ...(body.image ? { image: body.image } : {}),
      ...(body.cityHint ? { cityHint: body.cityHint } : {}),
    });
    res.json({ result });
  });

  r.get('/pay-check', (req, res) => {
    const q = payCheckQuery.parse(req.query);
    res.json({ payCheck: checkPay(q) });
  });

  r.post('/', requireRole('customer'), async (req, res) => {
    const user = currentUser(req);
    const body = createBody.parse(req.body);
    const now = new Date();
    const fallbackTitle: Localized = { [user.lang]: body.description.slice(0, 80) };
    const job: JobDoc = {
      _id: new ObjectId(),
      customerId: user._id,
      customerName: user.name,
      trade: body.trade,
      title: hasText(body.title) ? body.title : fallbackTitle,
      summary: hasText(body.summary) ? body.summary : {},
      description: body.description,
      locality: body.locality,
      city: body.city,
      when: body.when,
      pay: body.pay,
      payment: body.payment,
      status: 'open',
      payCheck: checkPay({ trade: body.trade, ...body.pay }),
      createdAt: now,
      updatedAt: now,
    };
    if (body.duration) job.duration = body.duration;
    if (body.location) job.location = { type: 'Point', coordinates: [body.location.lng, body.location.lat] };

    await db.col.jobs.insertOne(job);
    await db.col.users.updateOne({ _id: user._id }, { $inc: { 'customerStats.jobsPosted': 1 } });
    res.status(201).json({ job: toJob(job, { viewer: user, customer: user }) });
  });

  /** Open jobs for workers. With lat/lng, nearest first; jobs without a location follow, newest first. */
  r.get('/', async (req, res) => {
    const user = currentUser(req);
    const q = feedQuery.parse(req.query);
    const filter: Filter<JobDoc> = { status: 'open' };
    if (q.trade) filter.trade = q.trade;

    let located: (JobDoc & { distanceM?: number })[] = [];
    let unlocated: JobDoc[];
    if (q.lat !== undefined && q.lng !== undefined) {
      located = await db.col.jobs
        .aggregate<JobDoc & { distanceM: number }>([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [q.lng, q.lat] },
              distanceField: 'distanceM',
              maxDistance: q.maxKm * 1000,
              query: filter,
              spherical: true,
            },
          },
          { $limit: q.limit },
        ])
        .toArray();
      unlocated = await db.col.jobs
        .find({ ...filter, location: { $exists: false } })
        .sort({ createdAt: -1 })
        .limit(Math.max(0, q.limit - located.length))
        .toArray();
    } else {
      unlocated = await db.col.jobs.find(filter).sort({ createdAt: -1 }).limit(q.limit).toArray();
    }

    const all = [...located, ...unlocated];
    const customers = await db.col.users
      .find({ _id: { $in: [...new Set(all.map((j) => j.customerId))] } }, PARTY_PROJECTION)
      .toArray();
    const byId = new Map(customers.map((c) => [String(c._id), c]));

    res.json({
      jobs: all.map((j) =>
        toJob(j, {
          viewer: user,
          customer: byId.get(String(j.customerId)),
          distanceKm: 'distanceM' in j && typeof j.distanceM === 'number' ? Math.round(j.distanceM / 100) / 10 : undefined,
        }),
      ),
    });
  });

  r.get('/:id', async (req, res) => {
    const user = currentUser(req);
    const job = await db.col.jobs.findOne({ _id: parseObjectId(req.params.id) });
    if (!job || !canSee(job, user)) throw notFound('This job is no longer available.');
    res.json({ job: await present(db, job, user) });
  });

  r.post('/:id/accept', requireRole('worker'), async (req, res) => {
    const user = currentUser(req);
    const id = parseObjectId(req.params.id);
    const now = new Date();
    // Atomic: only one worker can move a job out of "open".
    const job = await db.col.jobs.findOneAndUpdate(
      { _id: id, status: 'open' },
      { $set: { status: 'assigned', workerId: user._id, workerName: user.name, acceptedAt: now, updatedAt: now } },
      { returnDocument: 'after' },
    );
    if (!job) {
      const exists = await db.col.jobs.findOne({ _id: id }, { projection: { status: 1 } });
      if (!exists) throw notFound('This job is no longer available.');
      throw conflict('job_taken', 'Another worker has already taken this job.');
    }
    res.json({ job: await present(db, job, user) });
  });

  r.post('/:id/withdraw', requireRole('worker'), async (req, res) => {
    const user = currentUser(req);
    const job = await db.col.jobs.findOneAndUpdate(
      { _id: parseObjectId(req.params.id), status: 'assigned', workerId: user._id },
      { $set: { status: 'open', updatedAt: new Date() }, $unset: { workerId: '', workerName: '', acceptedAt: '' } },
      { returnDocument: 'after' },
    );
    if (!job) throw conflict('not_assigned', 'You can only withdraw from a job you accepted and have not finished.');
    res.json({ job: await present(db, job, user) });
  });

  /** Either party can mark an accepted job as finished. */
  r.post('/:id/complete', async (req, res) => {
    const user = currentUser(req);
    const now = new Date();
    const job = await db.col.jobs.findOneAndUpdate(
      {
        _id: parseObjectId(req.params.id),
        status: 'assigned',
        $or: [{ workerId: user._id }, { customerId: user._id }],
      },
      { $set: { status: 'done', completedAt: now, updatedAt: now } },
      { returnDocument: 'after' },
    );
    if (!job || !job.workerId) throw conflict('not_assigned', 'Only an accepted job can be marked as finished.');
    await Promise.all([
      db.col.users.updateOne({ _id: job.workerId }, { $inc: { 'worker.stats.jobsDone': 1 } }),
      db.col.users.updateOne({ _id: job.customerId }, { $inc: { 'customerStats.jobsCompleted': 1 } }),
    ]);
    res.json({ job: await present(db, job, user) });
  });

  r.post('/:id/cancel', requireRole('customer'), async (req, res) => {
    const user = currentUser(req);
    const now = new Date();
    const job = await db.col.jobs.findOneAndUpdate(
      { _id: parseObjectId(req.params.id), customerId: user._id, status: 'open' },
      { $set: { status: 'cancelled', cancelledAt: now, updatedAt: now } },
      { returnDocument: 'after' },
    );
    if (!job) throw conflict('not_cancellable', 'Only your own job can be cancelled, and only before a worker accepts it.');
    res.json({ job: await present(db, job, user) });
  });

  /** Two-way ratings, once per side, only after the job is finished. */
  r.post('/:id/review', async (req, res) => {
    const user = currentUser(req);
    const job = await db.col.jobs.findOne({ _id: parseObjectId(req.params.id) });
    if (!job || !canSee(job, user)) throw notFound('This job is no longer available.');
    if (job.status !== 'done' || !job.workerId || !job.workerName) {
      throw conflict('not_finished', 'You can rate only after the job is marked as finished.');
    }

    const isCustomer = job.customerId.equals(user._id);
    const isWorker = job.workerId.equals(user._id);
    if (!isCustomer && !isWorker) throw forbidden();

    const review: ReviewDoc = isCustomer
      ? (() => {
          const b = customerReviewBody.parse(req.body);
          return {
            _id: new ObjectId(),
            jobId: job._id,
            direction: 'customer_to_worker' as const,
            fromUserId: user._id,
            toUserId: job.workerId,
            fromName: user.name,
            ratings: b.ratings,
            stars: overallStars(b.ratings),
            ...(b.comment ? { comment: b.comment } : {}),
            createdAt: new Date(),
          };
        })()
      : (() => {
          const b = workerReviewBody.parse(req.body);
          return {
            _id: new ObjectId(),
            jobId: job._id,
            direction: 'worker_to_customer' as const,
            fromUserId: user._id,
            toUserId: job.customerId,
            fromName: user.name,
            stars: b.stars,
            ...(b.comment ? { comment: b.comment } : {}),
            createdAt: new Date(),
          };
        })();

    try {
      await db.col.reviews.insertOne(review);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw conflict('already_reviewed', 'You have already rated this job.');
      }
      throw err;
    }

    if (isCustomer) await refreshWorkerStats(db, job.workerId);
    else await refreshCustomerRating(db, job.customerId);

    res.status(201).json({ ok: true });
  });

  return r;
}

function hasText(l: Localized | undefined): l is Localized {
  return Boolean(l && Object.values(l).some((v) => v && v.trim()));
}

function canSee(job: JobDoc, user: UserDoc): boolean {
  if (job.status === 'open') return true;
  return job.customerId.equals(user._id) || Boolean(job.workerId?.equals(user._id));
}

async function present(db: Database, job: JobDoc, viewer: UserDoc) {
  const [customer, worker, mine] = await Promise.all([
    db.col.users.findOne({ _id: job.customerId }, PARTY_PROJECTION),
    job.workerId ? db.col.users.findOne({ _id: job.workerId }, PARTY_PROJECTION) : null,
    db.col.reviews.countDocuments({ jobId: job._id, fromUserId: viewer._id }, { limit: 1 }),
  ]);
  return toJob(job, { viewer, customer, worker, myReviewDone: mine > 0 });
}

/** Recompute from every review so concurrent ratings cannot leave stale numbers. */
async function refreshWorkerStats(db: Database, workerId: ObjectId): Promise<void> {
  const reviews = await db.col.reviews
    .find({ toUserId: workerId, direction: 'customer_to_worker' }, { projection: { ratings: 1 } })
    .toArray();
  const stats = computeWorkerStats(
    reviews.flatMap((r) => (r.ratings ? [r.ratings] : [])),
    0,
  );
  // jobsDone is maintained by $inc on completion, so it is left untouched here.
  await db.col.users.updateOne(
    { _id: workerId },
    {
      $set: {
        'worker.stats.reviewCount': stats.reviewCount,
        'worker.stats.score': stats.score,
        'worker.stats.breakdown': stats.breakdown,
        'worker.stats.recommendRate': stats.recommendRate,
      },
    },
  );
}

async function refreshCustomerRating(db: Database, customerId: ObjectId): Promise<void> {
  const [agg] = await db.col.reviews
    .aggregate<{ avg: number; count: number }>([
      { $match: { toUserId: customerId, direction: 'worker_to_customer' } },
      { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
    ])
    .toArray();
  await db.col.users.updateOne(
    { _id: customerId },
    {
      $set: {
        'customerStats.ratingAvg': agg ? Math.round(agg.avg * 10) / 10 : null,
        'customerStats.ratingCount': agg?.count ?? 0,
      },
    },
  );
}
