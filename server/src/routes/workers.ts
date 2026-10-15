import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../db.js';
import { notFound } from '../lib/http.js';
import { shortName } from '../lib/serialize.js';

const publicIdParam = z.string().regex(/^[a-z2-9]{8}$/);

/**
 * Public Hunar Card. Anyone who scans a worker's QR code can see their work
 * record. No phone number or exact location is exposed here.
 */
export function workerRoutes(db: Database): Router {
  const r = Router();

  r.get('/:publicId', async (req, res) => {
    const parsed = publicIdParam.safeParse(req.params.publicId);
    if (!parsed.success) throw notFound('No Hunar Card with this code.');

    const user = await db.col.users.findOne({ 'worker.publicId': parsed.data, role: 'worker' });
    if (!user?.worker) throw notFound('No Hunar Card with this code.');

    const reviews = await db.col.reviews
      .find({ toUserId: user._id, direction: 'customer_to_worker' })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const w = user.worker;
    res.json({
      worker: {
        publicId: w.publicId,
        name: user.name,
        trade: w.trade,
        experience: w.experience,
        naka: w.naka,
        city: w.city,
        dayRate: w.dayRate ?? null,
        available: w.available,
        stats: w.stats,
        memberSince: user.createdAt.toISOString(),
        reviews: reviews.map((rv) => ({
          stars: rv.stars,
          comment: rv.comment ?? null,
          from: shortName(rv.fromName),
          createdAt: rv.createdAt.toISOString(),
        })),
      },
    });
  });

  return r;
}
