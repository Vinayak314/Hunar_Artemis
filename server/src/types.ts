import type { ObjectId } from 'mongodb';

export const TRADES = ['plumbing', 'electric', 'paint', 'carpentry', 'masonry', 'cleaning', 'labour'] as const;
export type Trade = (typeof TRADES)[number];

export const LANGS = ['hi', 'mr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const ROLES = ['worker', 'customer'] as const;
export type Role = (typeof ROLES)[number];

export const EXPERIENCE = ['0-2', '3-10', '10+'] as const;
export type Experience = (typeof EXPERIENCE)[number];

/** total = one amount for the whole job; per_day = daily wage. */
export const PAY_UNITS = ['total', 'per_day'] as const;
export type PayUnit = (typeof PAY_UNITS)[number];

/** When the worker gets paid. advance_part requires an advance amount. */
export const PAYMENT_WHEN = ['after_work', 'advance_part', 'daily'] as const;
export type PaymentWhen = (typeof PAYMENT_WHEN)[number];

export const PAYMENT_METHODS = ['cash', 'upi', 'either'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const JOB_STATUSES = ['open', 'assigned', 'done', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type Localized = Partial<Record<Lang, string>>;

/** GeoJSON point, coordinates are [longitude, latitude]. */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface RatingBreakdown {
  onTime: number;
  quality: number;
  behaviour: number;
  fairPrice: number;
}

export interface WorkerStats {
  jobsDone: number;
  reviewCount: number;
  /** null until the worker has at least one review. */
  score: number | null;
  breakdown: RatingBreakdown | null;
  /** Share of reviews rated 4 or above, 0..1; null with no reviews. */
  recommendRate: number | null;
}

export interface CustomerStats {
  jobsPosted: number;
  jobsCompleted: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface WorkerProfile {
  /** Short public id used in the Hunar Card QR link. */
  publicId: string;
  trade: Trade;
  experience: Experience;
  /** Hiring point or neighbourhood the worker usually stands at. */
  naka: string;
  city: string;
  dayRate?: { min: number; max: number };
  available: boolean;
  availableUpdatedAt: Date;
  location?: GeoPoint;
  stats: WorkerStats;
}

export interface UserDoc {
  _id: ObjectId;
  /** Normalised 10-digit Indian mobile number. */
  phone: string;
  name: string;
  role: Role;
  lang: Lang;
  worker?: WorkerProfile;
  customerStats?: CustomerStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobDoc {
  _id: ObjectId;
  customerId: ObjectId;
  customerName: string;
  trade: Trade;
  /** Short title in whichever languages are available. */
  title: Localized;
  /** One or two plain sentences for the worker, when the AI helper produced them. */
  summary: Localized;
  /** The customer's own words. */
  description: string;
  locality: string;
  city: string;
  location?: GeoPoint;
  /** Free text, e.g. "Today, 3 PM". */
  when: string;
  duration?: string;
  pay: { amount: number; unit: PayUnit; days?: number };
  payment: { when: PaymentWhen; method: PaymentMethod; advance?: number };
  status: JobStatus;
  workerId?: ObjectId;
  workerName?: string;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  /** Result of the fair-pay check at posting time. Informs, never blocks. */
  payCheck: 'fair' | 'low' | 'unknown';
  createdAt: Date;
  updatedAt: Date;
}

export const REVIEW_DIRECTIONS = ['customer_to_worker', 'worker_to_customer'] as const;
export type ReviewDirection = (typeof REVIEW_DIRECTIONS)[number];

export interface ReviewDoc {
  _id: ObjectId;
  jobId: ObjectId;
  direction: ReviewDirection;
  fromUserId: ObjectId;
  toUserId: ObjectId;
  fromName: string;
  /** Present for customer_to_worker reviews. */
  ratings?: RatingBreakdown;
  /** Overall 1..5. For customer_to_worker it is the rounded mean of ratings. */
  stars: number;
  comment?: string;
  createdAt: Date;
}

export interface SessionDoc {
  /** sha256 hex of the opaque session token; the raw token only lives in the cookie. */
  _id: string;
  userId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
}
