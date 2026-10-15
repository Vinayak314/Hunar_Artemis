/** Types mirroring the JSON returned by the Hunar API (server/src/lib/serialize.ts). */

export const LANGS = ['hi', 'mr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const TRADES = ['plumbing', 'electric', 'paint', 'carpentry', 'masonry', 'cleaning', 'labour'] as const;
export type Trade = (typeof TRADES)[number];

export type Role = 'worker' | 'customer';
export const EXPERIENCE = ['0-2', '3-10', '10+'] as const;
export type Experience = (typeof EXPERIENCE)[number];
export type PayUnit = 'total' | 'per_day';
export const PAYMENT_WHEN = ['after_work', 'advance_part', 'daily'] as const;
export type PaymentWhen = (typeof PAYMENT_WHEN)[number];
export const PAYMENT_METHODS = ['either', 'cash', 'upi'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type JobStatus = 'open' | 'assigned' | 'done' | 'cancelled';
export type PayCheck = 'fair' | 'low' | 'unknown';
export type Localized = Partial<Record<Lang, string>>;

export interface RatingBreakdown {
  onTime: number;
  quality: number;
  behaviour: number;
  fairPrice: number;
}

export interface WorkerStats {
  jobsDone: number;
  reviewCount: number;
  score: number | null;
  breakdown: RatingBreakdown | null;
  recommendRate: number | null;
}

export interface Me {
  id: string;
  phone: string;
  name: string;
  role: Role;
  lang: Lang;
  worker: {
    publicId: string;
    trade: Trade;
    experience: Experience;
    naka: string;
    city: string;
    dayRate: { min: number; max: number } | null;
    available: boolean;
    hasLocation: boolean;
    stats: WorkerStats;
  } | null;
  customerStats: {
    jobsPosted: number;
    jobsCompleted: number;
    ratingAvg: number | null;
    ratingCount: number;
  } | null;
  createdAt: string;
}

export interface Pay {
  amount: number;
  unit: PayUnit;
  days?: number;
}

export interface Payment {
  when: PaymentWhen;
  method: PaymentMethod;
  advance?: number;
}

export interface Job {
  id: string;
  trade: Trade;
  title: Localized;
  summary: Localized;
  description: string;
  locality: string;
  city: string;
  distanceKm: number | null;
  when: string;
  duration: string | null;
  pay: Pay;
  payment: Payment;
  payCheck: PayCheck;
  status: JobStatus;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  isMine: boolean;
  myReviewDone: boolean;
  customer: {
    name: string;
    phone: string | null;
    ratingAvg: number | null;
    ratingCount: number;
    jobsCompleted: number;
  };
  worker: {
    name: string;
    phone: string | null;
    publicId: string | null;
    score: number | null;
  } | null;
}

export interface PublicWorker {
  publicId: string;
  name: string;
  trade: Trade;
  experience: Experience;
  naka: string;
  city: string;
  dayRate: { min: number; max: number } | null;
  available: boolean;
  stats: WorkerStats;
  memberSince: string;
  reviews: { stars: number; comment: string | null; from: string; createdAt: string }[];
}

export interface Earnings {
  last7Days: { date: string; amount: number }[];
  thisWeek: number;
  previousWeek: number;
  allTime: number;
  jobsDone: number;
}

export type ChatField = 'problem' | 'when' | 'budget' | 'place' | 'payment';
export const CHAT_FIELDS: ChatField[] = ['problem', 'when', 'budget', 'place', 'payment'];
export type Tri = Record<Lang, string>;

/** The ticket the assistant builds up while chatting. Empty strings and zeros mean "not said yet". */
export interface ChatDraft {
  trade: Trade | '';
  title: Tri;
  summary: Tri;
  problemDetail: string;
  when: string;
  duration: string;
  locality: string;
  city: string;
  payAmount: number;
  payUnit: PayUnit | '';
  payDays: number;
  payWhen: PaymentWhen | '';
  payMethod: PaymentMethod | '';
  advance: number;
  materials: string[];
}

export interface ChatOption {
  label: string;
  value: string;
}

export interface ChatProgress {
  done: number;
  total: number;
  missing: ChatField[];
}

export type ChatResult =
  | { action: 'ask'; field: ChatField; question: Tri; options: ChatOption[]; draft: ChatDraft; progress: ChatProgress }
  | { action: 'create'; draft: ChatDraft; progress: ChatProgress }
  | { action: 'form'; draft: ChatDraft; progress: ChatProgress };

export interface ChatTurn {
  role: 'customer' | 'assistant';
  text: string;
  field?: ChatField;
  value?: string;
}
