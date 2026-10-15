/**
 * End-to-end API test against a real MongoDB database named "hunar_test".
 * It never touches the production database: the run aborts unless the
 * connected database is exactly "hunar_test", and that database is dropped at the end.
 *
 * Set HUNAR_TEST_AI=1 to also exercise the live Gemini job helper (slow, billed).
 */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

process.env.MONGODB_DB = 'hunar_test';
process.env.NODE_ENV = 'test';

const { connectDatabase } = await import('../src/db.js');
const { createApp } = await import('../src/app.js');

type Json = Record<string, any>;

class Session {
  private cookie = '';
  constructor(private readonly base: string) {}

  async call(method: string, path: string, body?: unknown, contentType = 'application/json') {
    const headers: Record<string, string> = {};
    if (this.cookie) headers.cookie = this.cookie;
    let payload: string | undefined;
    if (method !== 'GET') {
      headers['content-type'] = contentType;
      payload = JSON.stringify(body ?? {});
    }
    const res = await fetch(this.base + path, { method, headers, body: payload });
    for (const raw of res.headers.getSetCookie()) {
      const pair = raw.split(';')[0] ?? '';
      if (pair.startsWith('hunar_session=')) this.cookie = pair === 'hunar_session=' ? '' : pair;
    }
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as Json };
  }
}

const randomPhone = () => `9${Math.floor(100_000_000 + Math.random() * 899_999_999)}`;

let db: Awaited<ReturnType<typeof connectDatabase>>;
let base = '';
let close: () => Promise<void>;

before(async () => {
  db = await connectDatabase();
  assert.equal(db.db.databaseName, 'hunar_test', 'refusing to run outside the hunar_test database');
  const server = createApp(db).listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
});

after(async () => {
  await close?.();
  if (db?.db.databaseName === 'hunar_test') await db.db.dropDatabase();
  await db?.client.close();
});

test('worker and customer complete a job end to end', async (t) => {
  const worker = new Session(base);
  const worker2 = new Session(base);
  const customer = new Session(base);
  const anon = new Session(base);
  const workerPhone = randomPhone();
  let jobId = '';
  let publicId = '';

  await t.test('health check reports the database is up', async () => {
    const res = await anon.call('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.db, 'up');
  });

  await t.test('registers a worker with a work profile', async () => {
    const res = await worker.call('POST', '/api/auth/register', {
      phone: `+91 ${workerPhone}`,
      name: 'Ramesh Patil',
      role: 'worker',
      lang: 'hi',
      worker: { trade: 'plumbing', experience: '3-10', naka: 'Karve Road Naka', city: 'Pune' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.phone, workerPhone);
    assert.equal(res.body.user.worker.stats.score, null, 'new workers have no score yet');
    assert.match(res.body.user.worker.publicId, /^[a-z2-9]{8}$/);
    publicId = res.body.user.worker.publicId;
  });

  await t.test('refuses a second account on the same number', async () => {
    const res = await anon.call('POST', '/api/auth/register', {
      phone: workerPhone,
      name: 'Someone Else',
      role: 'customer',
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'phone_taken');
  });

  await t.test('rejects invalid phone numbers', async () => {
    const res = await anon.call('POST', '/api/auth/login', { phone: '12345' });
    assert.equal(res.status, 400);
  });

  await t.test('registers a customer and a second worker', async () => {
    const c = await customer.call('POST', '/api/auth/register', {
      phone: randomPhone(),
      name: 'Anjali Deshmukh',
      role: 'customer',
      lang: 'en',
    });
    assert.equal(c.status, 201);
    const w2 = await worker2.call('POST', '/api/auth/register', {
      phone: randomPhone(),
      name: 'Suresh Kale',
      role: 'worker',
      worker: { trade: 'electric', experience: '10+', naka: 'Kothrud Naka', city: 'Pune' },
    });
    assert.equal(w2.status, 201);
  });

  await t.test('requires JSON for state-changing requests', async () => {
    const res = await customer.call('POST', '/api/jobs', {}, 'text/plain');
    assert.equal(res.status, 415);
  });

  await t.test('workers cannot post jobs', async () => {
    const res = await worker.call('POST', '/api/jobs', {});
    assert.equal(res.status, 403);
  });

  await t.test('only customers can use the posting assistant', async () => {
    const res = await worker.call('POST', '/api/jobs/chat', { lang: 'hi', turns: [{ role: 'customer', text: 'fan' }] });
    assert.equal(res.status, 403);
  });

  await t.test('the assistant needs words or a photo, and rejects a tampered draft', async () => {
    const empty = await customer.call('POST', '/api/jobs/chat', { lang: 'hi', turns: [{ role: 'customer', text: '' }] });
    assert.equal(empty.status, 400);
    const tampered = await customer.call('POST', '/api/jobs/chat', {
      lang: 'hi',
      turns: [{ role: 'customer', text: 'fan' }],
      draft: { trade: 'wizard' },
    });
    assert.equal(tampered.status, 400);
  });

  await t.test('jobs need payment terms', async () => {
    const res = await customer.call('POST', '/api/jobs', {
      trade: 'plumbing',
      description: 'Kitchen tap is leaking badly',
      locality: 'Kothrud',
      city: 'Pune',
      when: 'Today, 3 PM',
      pay: { amount: 800, unit: 'total' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.fields.some((f: Json) => f.path.startsWith('payment')));
  });

  await t.test('an advance must be smaller than the total', async () => {
    const res = await customer.call('POST', '/api/jobs', {
      trade: 'plumbing',
      description: 'Kitchen tap is leaking badly',
      locality: 'Kothrud',
      city: 'Pune',
      when: 'Today, 3 PM',
      pay: { amount: 800, unit: 'total' },
      payment: { when: 'advance_part', method: 'upi', advance: 900 },
    });
    assert.equal(res.status, 400);
  });

  await t.test('customer posts a job with location and clear terms', async () => {
    const res = await customer.call('POST', '/api/jobs', {
      trade: 'plumbing',
      description: 'Kitchen tap is leaking. Replace the washer; materials paid separately.',
      title: { en: 'Fix leaking kitchen tap', hi: 'रसोई का नल ठीक करना' },
      locality: 'Kothrud',
      city: 'Pune',
      location: { lat: 18.5074, lng: 73.8077 },
      when: 'Today, 3 PM',
      duration: '1-2 hours',
      pay: { amount: 800, unit: 'total' },
      payment: { when: 'after_work', method: 'either' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.job.status, 'open');
    assert.ok(['fair', 'low', 'unknown'].includes(res.body.job.payCheck));
    jobId = res.body.job.id;
  });

  await t.test('worker sees the job nearby without the customer phone', async () => {
    const res = await worker.call('GET', '/api/jobs?lat=18.51&lng=73.81&trade=plumbing');
    assert.equal(res.status, 200);
    const job = res.body.jobs.find((j: Json) => j.id === jobId);
    assert.ok(job, 'job appears in feed');
    assert.ok(job.distanceKm !== null && job.distanceKm < 2);
    assert.equal(job.customer.phone, null);
    assert.equal(job.customer.name, 'Anjali D.');
  });

  await t.test('one worker accepts; a second worker is told it is taken', async () => {
    const first = await worker.call('POST', `/api/jobs/${jobId}/accept`);
    assert.equal(first.status, 200);
    assert.equal(first.body.job.status, 'assigned');
    assert.ok(first.body.job.customer.phone, 'assigned worker can now call the customer');

    const second = await worker2.call('POST', `/api/jobs/${jobId}/accept`);
    assert.equal(second.status, 409);
    assert.equal(second.body.error.code, 'job_taken');
  });

  await t.test('an assigned job is private to its two parties', async () => {
    const outsider = await worker2.call('GET', `/api/jobs/${jobId}`);
    assert.equal(outsider.status, 404);
    const owner = await customer.call('GET', `/api/jobs/${jobId}`);
    assert.equal(owner.status, 200);
    assert.equal(owner.body.job.worker.name, 'Ramesh Patil');
    assert.ok(owner.body.job.worker.phone, 'customer can now call the worker');
  });

  await t.test('no rating before the job is finished', async () => {
    const res = await customer.call('POST', `/api/jobs/${jobId}/review`, {
      ratings: { onTime: 5, quality: 5, behaviour: 5, fairPrice: 5 },
    });
    assert.equal(res.status, 409);
  });

  await t.test('worker marks the job finished', async () => {
    const res = await worker.call('POST', `/api/jobs/${jobId}/complete`);
    assert.equal(res.status, 200);
    assert.equal(res.body.job.status, 'done');
    const me = await worker.call('GET', '/api/me');
    assert.equal(me.body.user.worker.stats.jobsDone, 1);
  });

  await t.test('customer rates the worker once', async () => {
    const res = await customer.call('POST', `/api/jobs/${jobId}/review`, {
      ratings: { onTime: 5, quality: 4, behaviour: 5, fairPrice: 5 },
      comment: 'Came on time and fixed it properly.',
    });
    assert.equal(res.status, 201);
    const again = await customer.call('POST', `/api/jobs/${jobId}/review`, {
      ratings: { onTime: 1, quality: 1, behaviour: 1, fairPrice: 1 },
    });
    assert.equal(again.status, 409);
  });

  await t.test('worker rates the customer', async () => {
    const res = await worker.call('POST', `/api/jobs/${jobId}/review`, { stars: 4 });
    assert.equal(res.status, 201);
    const me = await customer.call('GET', '/api/me');
    assert.equal(me.body.user.customerStats.ratingAvg, 4);
    assert.equal(me.body.user.customerStats.jobsCompleted, 1);
  });

  await t.test('the public Hunar Card shows earned reputation and no phone number', async () => {
    const res = await anon.call('GET', `/api/workers/${publicId}`);
    assert.equal(res.status, 200);
    const card = res.body.worker;
    assert.equal(card.stats.reviewCount, 1);
    assert.equal(card.stats.jobsDone, 1);
    assert.ok(card.stats.score > 4 && card.stats.score < 5);
    assert.equal(card.reviews[0].from, 'Anjali D.');
    assert.equal(JSON.stringify(card).includes(workerPhone), false, 'phone must not leak');
  });

  await t.test('earnings reflect the finished job', async () => {
    const res = await worker.call('GET', '/api/me/earnings');
    assert.equal(res.status, 200);
    assert.equal(res.body.thisWeek, 800);
    assert.equal(res.body.jobsDone, 1);
    assert.equal(res.body.last7Days.length, 7);
  });

  await t.test('my jobs lists the job with review state', async () => {
    const res = await worker.call('GET', '/api/me/jobs');
    const job = res.body.jobs.find((j: Json) => j.id === jobId);
    assert.ok(job);
    assert.equal(job.myReviewDone, true);
  });

  await t.test('sign out ends the session', async () => {
    const out = await worker.call('POST', '/api/auth/logout');
    assert.equal(out.status, 204);
    const me = await worker.call('GET', '/api/me');
    assert.equal(me.status, 401);
  });

  await t.test('signing back in by phone works', async () => {
    const res = await worker.call('POST', '/api/auth/login', { phone: workerPhone });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, 'Ramesh Patil');
  });
});

test('customer can cancel an open job but not someone else\'s', async () => {
  const owner = new Session(base);
  const other = new Session(base);
  await owner.call('POST', '/api/auth/register', { phone: randomPhone(), name: 'Meera Kulkarni', role: 'customer' });
  await other.call('POST', '/api/auth/register', { phone: randomPhone(), name: 'Sanjay Patil', role: 'customer' });
  const created = await owner.call('POST', '/api/jobs', {
    trade: 'paint',
    description: 'Paint one bedroom wall, two coats.',
    locality: 'Erandwane',
    city: 'Pune',
    when: 'Tomorrow, 9 AM',
    pay: { amount: 900, unit: 'per_day', days: 2 },
    payment: { when: 'daily', method: 'cash' },
  });
  assert.equal(created.status, 201);
  const id = created.body.job.id;
  assert.equal((await other.call('POST', `/api/jobs/${id}/cancel`)).status, 409);
  const cancelled = await owner.call('POST', `/api/jobs/${id}/cancel`);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.job.status, 'cancelled');
});

test('unknown ids and routes return 404', async () => {
  const s = new Session(base);
  await s.call('POST', '/api/auth/register', { phone: randomPhone(), name: 'Test Customer', role: 'customer' });
  assert.equal((await s.call('GET', '/api/jobs/not-an-id')).status, 404);
  assert.equal((await s.call('GET', '/api/jobs/64b7f0c2a1b2c3d4e5f60718')).status, 404);
  assert.equal((await s.call('GET', '/api/nope')).status, 404);
  assert.equal((await s.call('GET', '/api/workers/zzzzzzzz')).status, 404);
});

test(
  'AI chat walks the fan story from the design doc to a finished ticket',
  { skip: process.env.HUNAR_TEST_AI !== '1', timeout: 240_000 },
  async () => {
    const s = new Session(base);
    await s.call('POST', '/api/auth/register', { phone: randomPhone(), name: 'Priya Sharma', role: 'customer', lang: 'hi' });

    // Step 1 of the story: a vague Hindi message with no budget, place or payment terms.
    const turns: Json[] = [{ role: 'customer', text: 'पंखा नहीं चल रहा, आज ठीक करवाना है' }];
    let draft: Json | undefined;
    let result: Json = {};
    const asked: string[] = [];

    for (let i = 0; i < 8; i++) {
      const res = await s.call('POST', '/api/jobs/chat', { lang: 'hi', turns, ...(draft ? { draft } : {}) });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      result = res.body.result;
      draft = result.draft;

      if (i === 0) {
        assert.equal(draft?.trade, 'electric', 'a ceiling fan means an electrician');
        assert.equal(draft?.payAmount, 0, 'no budget was given, so none may be invented');
        assert.equal(draft?.locality, '');
        assert.equal(draft?.payWhen, '');
        assert.equal(result.action, 'ask');
      }
      if (result.action !== 'ask') break;

      asked.push(result.field);
      assert.ok(result.options.length <= 4, 'at most four tap chips');
      assert.ok(result.question.hi.length > 0, 'the question comes in Hindi');
      turns.push({ role: 'assistant', text: result.question.hi, field: result.field });

      // Step 2 of the story: answer one question per turn.
      const chip = (needle: string) => result.options.find((o: Json) => o.label.includes(needle));
      if (result.field === 'when') {
        const o = chip('आज') ?? result.options[0];
        turns.push({ role: 'customer', text: o?.label ?? 'आज', ...(o ? { value: o.value } : {}) });
      } else if (result.field === 'budget') {
        turns.push({ role: 'customer', text: '₹500' });
      } else if (result.field === 'place') {
        turns.push({ role: 'customer', text: 'Bhushi Rd, Lonavla' });
      } else if (result.field === 'payment') {
        const o = chip('नकद');
        turns.push({ role: 'customer', text: o?.label ?? 'काम के बाद, नकद', ...(o ? { value: o.value } : {}) });
      } else {
        turns.push({ role: 'customer', text: 'सीलिंग पंखा चलता नहीं है' });
      }
    }

    assert.equal(result.action, 'create', `expected a finished ticket, asked: ${asked.join(', ')}`);
    assert.ok(asked.indexOf('budget') < asked.indexOf('place') && asked.indexOf('place') < asked.indexOf('payment'), `asked in order: ${asked.join(', ')}`);

    const d = result.draft;
    assert.equal(d.trade, 'electric');
    assert.equal(d.payAmount, 500);
    assert.equal(d.payUnit, 'total');
    assert.match(d.locality, /Bhushi/i);
    assert.match(d.city, /Lonavla/i);
    assert.equal(d.payWhen, 'after_work');
    assert.equal(d.payMethod, 'cash');
    assert.ok(d.title.hi && d.title.mr && d.title.en, 'title in all three languages');
    assert.ok(d.summary.hi && d.summary.mr && d.summary.en, 'summary in all three languages');
    assert.deepEqual(result.progress, { done: 5, total: 5, missing: [] });

    // The finished draft really can be posted.
    const job = await s.call('POST', '/api/jobs', {
      trade: d.trade,
      description: 'पंखा नहीं चल रहा, आज ठीक करवाना है',
      title: d.title,
      summary: d.summary,
      locality: d.locality,
      city: d.city,
      when: d.when,
      pay: { amount: d.payAmount, unit: d.payUnit },
      payment: { when: d.payWhen, method: d.payMethod },
    });
    assert.equal(job.status, 201, JSON.stringify(job.body));
  },
);
