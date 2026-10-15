import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireRole, requireUser } from '../auth/session.js';
import type { Database } from '../db.js';
import { forbidden } from '../lib/http.js';
import { toJob, toMe } from '../lib/serialize.js';
import { EXPERIENCE, LANGS, TRADES, type JobDoc } from '../types.js';
import { dayRateInput } from './auth.js';

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

const patchBody = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  lang: z.enum(LANGS).optional(),
  worker: z
    .object({
      trade: z.enum(TRADES).optional(),
      experience: z.enum(EXPERIENCE).optional(),
      naka: z.string().trim().min(2).max(80).optional(),
      city: z.string().trim().min(2).max(60).optional(),
      dayRate: dayRateInput.nullable().optional(),
      available: z.boolean().optional(),
      location: latLng.nullable().optional(),
    })
    .optional(),
});

/** Money the worker earned for a finished job (self-reported, not processed by Hunar). */
export function jobEarning(job: Pick<JobDoc, 'pay'>): number {
  return job.pay.unit === 'per_day' ? job.pay.amount * (job.pay.days ?? 1) : job.pay.amount;
}

const IST_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
const istDayKey = (d: Date) => IST_DAY.format(d); // YYYY-MM-DD

export function meRoutes(db: Database): Router {
  const r = Router();
  r.use(requireUser);

  r.get('/', (req, res) => {
    res.json({ user: toMe(currentUser(req)) });
  });

  r.patch('/', async (req, res) => {
    const user = currentUser(req);
    const body = patchBody.parse(req.body);
    const now = new Date();
    const $set: Record<string, unknown> = { updatedAt: now };
    const $unset: Record<string, ''> = {};

    if (body.name) $set.name = body.name;
    if (body.lang) $set.lang = body.lang;
    if (body.worker) {
      if (user.role !== 'worker' || !user.worker) throw forbidden('Only workers have a work profile.');
      const w = body.worker;
      for (const key of ['trade', 'experience', 'naka', 'city'] as const) {
        if (w[key] !== undefined) $set[`worker.${key}`] = w[key];
      }
      if (w.dayRate === null) $unset['worker.dayRate'] = '';
      else if (w.dayRate) $set['worker.dayRate'] = w.dayRate;
      if (w.available !== undefined) {
        $set['worker.available'] = w.available;
        $set['worker.availableUpdatedAt'] = now;
      }
      if (w.location === null) $unset['worker.location'] = '';
      else if (w.location) $set['worker.location'] = { type: 'Point', coordinates: [w.location.lng, w.location.lat] };
    }

    const updated = await db.col.users.findOneAndUpdate(
      { _id: user._id },
      Object.keys($unset).length ? { $set, $unset } : { $set },
      { returnDocument: 'after' },
    );
    if (body.name && updated) {
      // Keep denormalised names on jobs in step with the profile.
      const field = user.role === 'worker' ? { workerId: user._id } : { customerId: user._id };
      const nameField = user.role === 'worker' ? 'workerName' : 'customerName';
      await db.col.jobs.updateMany(field, { $set: { [nameField]: body.name } });
    }
    res.json({ user: toMe(updated ?? user) });
  });

  /** Worker: jobs I accepted. Customer: jobs I posted. Newest first. */
  r.get('/jobs', async (req, res) => {
    const user = currentUser(req);
    const filter = user.role === 'worker' ? { workerId: user._id } : { customerId: user._id };
    const jobs = await db.col.jobs.find(filter).sort({ createdAt: -1 }).limit(200).toArray();

    const counterpartIds = jobs
      .map((j) => (user.role === 'worker' ? j.customerId : j.workerId))
      .filter((id): id is NonNullable<typeof id> => Boolean(id));
    const [people, reviews] = await Promise.all([
      db.col.users
        .find({ _id: { $in: counterpartIds } }, { projection: { name: 1, phone: 1, worker: 1, customerStats: 1 } })
        .toArray(),
      db.col.reviews
        .find(
          { jobId: { $in: jobs.map((j) => j._id) }, fromUserId: user._id },
          { projection: { jobId: 1 } },
        )
        .toArray(),
    ]);
    const byId = new Map(people.map((p) => [String(p._id), p]));
    const reviewed = new Set(reviews.map((rv) => String(rv.jobId)));

    res.json({
      jobs: jobs.map((j) =>
        toJob(j, {
          viewer: user,
          customer: user.role === 'worker' ? byId.get(String(j.customerId)) : user,
          worker: j.workerId ? (user.role === 'customer' ? byId.get(String(j.workerId)) : user) : null,
          myReviewDone: reviewed.has(String(j._id)),
        }),
      ),
    });
  });

  /** Worker earnings from finished jobs, bucketed by day in India Standard Time. */
  r.get('/earnings', requireRole('worker'), async (req, res) => {
    const user = currentUser(req);
    const done = await db.col.jobs
      .find({ workerId: user._id, status: 'done' }, { projection: { pay: 1, completedAt: 1 } })
      .toArray();

    const today = new Date();
    const days = Array.from({ length: 14 }, (_, i) => istDayKey(new Date(today.getTime() - (13 - i) * 86_400_000)));
    const totals = new Map(days.map((d) => [d, 0]));
    let allTime = 0;
    for (const job of done) {
      const amount = jobEarning(job);
      allTime += amount;
      if (job.completedAt) {
        const key = istDayKey(job.completedAt);
        if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + amount);
      }
    }
    const series = days.map((date) => ({ date, amount: totals.get(date) ?? 0 }));
    const sum = (xs: { amount: number }[]) => xs.reduce((a, b) => a + b.amount, 0);
    res.json({
      last7Days: series.slice(7),
      thisWeek: sum(series.slice(7)),
      previousWeek: sum(series.slice(0, 7)),
      allTime,
      jobsDone: done.length,
    });
  });

  return r;
}
