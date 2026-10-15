import type { RatingBreakdown, WorkerStats } from '../types.js';

/**
 * Hunar score: a Bayesian average per dimension.
 *
 * A brand-new worker with one 5-star review should not outrank a worker with
 * forty 4.8 reviews, so every dimension starts from PRIOR_MEAN with the weight
 * of PRIOR_WEIGHT imaginary reviews. Real reviews pull it toward the truth.
 */
export const PRIOR_MEAN = 4.0;
export const PRIOR_WEIGHT = 3;

const DIMENSIONS: (keyof RatingBreakdown)[] = ['onTime', 'quality', 'behaviour', 'fairPrice'];

const round1 = (n: number) => Math.round(n * 10) / 10;

export function bayesian(values: number[], priorMean = PRIOR_MEAN, priorWeight = PRIOR_WEIGHT): number {
  const sum = values.reduce((a, b) => a + b, 0);
  return (priorMean * priorWeight + sum) / (priorWeight + values.length);
}

/** Recompute a worker's public stats from all of their customer reviews. */
export function computeWorkerStats(reviews: RatingBreakdown[], jobsDone: number): WorkerStats {
  if (reviews.length === 0) {
    return { jobsDone, reviewCount: 0, score: null, breakdown: null, recommendRate: null };
  }
  const breakdown = Object.fromEntries(
    DIMENSIONS.map((d) => [d, round1(bayesian(reviews.map((r) => r[d])))]),
  ) as unknown as RatingBreakdown;
  const score = round1(DIMENSIONS.reduce((acc, d) => acc + breakdown[d], 0) / DIMENSIONS.length);
  const recommended = reviews.filter((r) => overallStars(r) >= 4).length;
  return {
    jobsDone,
    reviewCount: reviews.length,
    score,
    breakdown,
    recommendRate: Math.round((recommended / reviews.length) * 100) / 100,
  };
}

/** Overall 1..5 stars for one customer review: the rounded mean of its dimensions. */
export function overallStars(r: RatingBreakdown): number {
  return Math.round((r.onTime + r.quality + r.behaviour + r.fairPrice) / 4);
}
