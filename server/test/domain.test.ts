import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatIndianMobile, normalizeIndianMobile } from '../src/lib/phone.js';
import { bayesian, computeWorkerStats, overallStars, PRIOR_MEAN } from '../src/domain/score.js';

test('normalizeIndianMobile accepts common Indian formats', () => {
  assert.equal(normalizeIndianMobile('+91 98765 43210'), '9876543210');
  assert.equal(normalizeIndianMobile('09876543210'), '9876543210');
  assert.equal(normalizeIndianMobile('919876543210'), '9876543210');
  assert.equal(normalizeIndianMobile('98765-43210'), '9876543210');
});

test('normalizeIndianMobile rejects non-mobile numbers', () => {
  assert.equal(normalizeIndianMobile('12345'), null);
  assert.equal(normalizeIndianMobile('5876543210'), null, 'Indian mobiles start with 6-9');
  assert.equal(normalizeIndianMobile('98765432101'), null);
  assert.equal(normalizeIndianMobile(''), null);
});

test('formatIndianMobile groups 5+5', () => {
  assert.equal(formatIndianMobile('9876543210'), '98765 43210');
});

test('bayesian average starts at the prior and moves toward real ratings', () => {
  assert.equal(bayesian([]), PRIOR_MEAN);
  const one = bayesian([5]);
  const many = bayesian(Array(40).fill(5));
  assert.ok(one > PRIOR_MEAN && one < 5, 'one review only nudges the score');
  assert.ok(many > one, 'more consistent reviews earn more trust');
});

test('a single 5-star review does not outrank forty 4.8-level reviews', () => {
  const single = computeWorkerStats([{ onTime: 5, quality: 5, behaviour: 5, fairPrice: 5 }], 1);
  const veteran = computeWorkerStats(
    Array.from({ length: 40 }, (_, i) =>
      i % 5 === 0
        ? { onTime: 4, quality: 4, behaviour: 4, fairPrice: 4 }
        : { onTime: 5, quality: 5, behaviour: 5, fairPrice: 5 },
    ),
    40,
  );
  assert.ok((veteran.score ?? 0) > (single.score ?? 0));
});

test('computeWorkerStats with no reviews reports nulls, not a fake rating', () => {
  const stats = computeWorkerStats([], 3);
  assert.deepEqual(stats, { jobsDone: 3, reviewCount: 0, score: null, breakdown: null, recommendRate: null });
});

test('recommendRate counts reviews of 4 stars and above', () => {
  const stats = computeWorkerStats(
    [
      { onTime: 5, quality: 5, behaviour: 5, fairPrice: 5 },
      { onTime: 2, quality: 2, behaviour: 2, fairPrice: 2 },
    ],
    2,
  );
  assert.equal(stats.recommendRate, 0.5);
  assert.equal(overallStars({ onTime: 4, quality: 5, behaviour: 4, fairPrice: 5 }), 5);
});
