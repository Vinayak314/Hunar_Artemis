import { MongoClient, type Db, type Collection } from 'mongodb';
import { env } from './env.js';
import type { JobDoc, ReviewDoc, SessionDoc, UserDoc } from './types.js';

export interface Collections {
  users: Collection<UserDoc>;
  jobs: Collection<JobDoc>;
  reviews: Collection<ReviewDoc>;
  sessions: Collection<SessionDoc>;
}

export interface Database {
  client: MongoClient;
  db: Db;
  col: Collections;
}

const CONNECT_ATTEMPTS = 5;

/**
 * The first connection is retried with backoff: transient DNS or network blips at boot
 * should not crash the process. After that the driver reconnects on its own.
 */
async function connectWithRetry(): Promise<MongoClient> {
  for (let attempt = 1; ; attempt++) {
    const client = new MongoClient(env.MONGODB_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10_000,
      appName: 'hunar-server',
    });
    try {
      await client.connect();
      return client;
    } catch (err) {
      await client.close();
      if (attempt >= CONNECT_ATTEMPTS) throw err;
      const waitMs = attempt * 1500;
      console.warn(`MongoDB connect attempt ${attempt} failed (${(err as Error).message}); retrying in ${waitMs} ms`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

export async function connectDatabase(dbName = env.MONGODB_DB): Promise<Database> {
  const client = await connectWithRetry();
  // Without an explicit name the database in the connection string is used.
  const db = dbName ? client.db(dbName) : client.db();
  await db.command({ ping: 1 });

  const col: Collections = {
    users: db.collection<UserDoc>('users'),
    jobs: db.collection<JobDoc>('jobs'),
    reviews: db.collection<ReviewDoc>('reviews'),
    sessions: db.collection<SessionDoc>('sessions'),
  };
  await ensureIndexes(col);
  return { client, db, col };
}

/** Idempotent: createIndex is a no-op when an identical index already exists. */
async function ensureIndexes(col: Collections): Promise<void> {
  await Promise.all([
    col.users.createIndex({ phone: 1 }, { unique: true, name: 'phone_unique' }),
    col.users.createIndex(
      { 'worker.publicId': 1 },
      { unique: true, name: 'worker_public_id', partialFilterExpression: { 'worker.publicId': { $exists: true } } },
    ),
    col.users.createIndex({ 'worker.location': '2dsphere' }, { name: 'worker_location', sparse: true }),

    col.jobs.createIndex({ status: 1, trade: 1, createdAt: -1 }, { name: 'feed' }),
    col.jobs.createIndex({ location: '2dsphere' }, { name: 'job_location', sparse: true }),
    col.jobs.createIndex({ customerId: 1, createdAt: -1 }, { name: 'by_customer' }),
    col.jobs.createIndex({ workerId: 1, status: 1, completedAt: -1 }, { name: 'by_worker' }),

    col.reviews.createIndex({ jobId: 1, direction: 1 }, { unique: true, name: 'one_review_per_side' }),
    col.reviews.createIndex({ toUserId: 1, createdAt: -1 }, { name: 'by_subject' }),

    col.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'session_ttl' }),
  ]);
}
