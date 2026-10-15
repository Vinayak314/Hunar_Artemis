import type { CustomerStats, JobDoc, UserDoc } from '../types.js';

/** "Anjali Deshmukh" -> "Anjali D." so strangers never see full names. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return last ? `${first} ${last.charAt(0)}.` : first;
}

export const emptyCustomerStats = (): CustomerStats => ({
  jobsPosted: 0,
  jobsCompleted: 0,
  ratingAvg: null,
  ratingCount: 0,
});

/** What the signed-in user sees about themselves. */
export function toMe(u: UserDoc) {
  const worker = u.worker
    ? {
        publicId: u.worker.publicId,
        trade: u.worker.trade,
        experience: u.worker.experience,
        naka: u.worker.naka,
        city: u.worker.city,
        dayRate: u.worker.dayRate ?? null,
        available: u.worker.available,
        hasLocation: Boolean(u.worker.location),
        stats: u.worker.stats,
      }
    : null;
  return {
    id: String(u._id),
    phone: u.phone,
    name: u.name,
    role: u.role,
    lang: u.lang,
    worker,
    customerStats: u.customerStats ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

type Party = Pick<UserDoc, '_id' | 'name' | 'phone' | 'worker' | 'customerStats'>;

export interface JobView {
  viewer: UserDoc;
  customer?: Party | null;
  worker?: Party | null;
  distanceKm?: number;
  myReviewDone?: boolean;
}

/**
 * A job as a given viewer may see it. Phone numbers are shared only between the
 * customer and the assigned worker, and only once the job is accepted.
 */
export function toJob(job: JobDoc, view: JobView) {
  const isCustomer = job.customerId.equals(view.viewer._id);
  const isWorker = Boolean(job.workerId?.equals(view.viewer._id));
  const engaged = job.status === 'assigned' || job.status === 'done';

  const customerStats = view.customer?.customerStats;
  return {
    id: String(job._id),
    trade: job.trade,
    title: job.title,
    summary: job.summary,
    description: job.description,
    locality: job.locality,
    city: job.city,
    distanceKm: view.distanceKm ?? null,
    when: job.when,
    duration: job.duration ?? null,
    pay: job.pay,
    payment: job.payment,
    payCheck: job.payCheck,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    acceptedAt: job.acceptedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    isMine: isCustomer || isWorker,
    myReviewDone: view.myReviewDone ?? false,
    customer: {
      name: isWorker && engaged ? job.customerName : shortName(job.customerName),
      phone: isWorker && engaged ? (view.customer?.phone ?? null) : null,
      ratingAvg: customerStats?.ratingAvg ?? null,
      ratingCount: customerStats?.ratingCount ?? 0,
      jobsCompleted: customerStats?.jobsCompleted ?? 0,
    },
    worker:
      job.workerId && job.workerName
        ? {
            name: isCustomer ? job.workerName : shortName(job.workerName),
            phone: isCustomer && engaged ? (view.worker?.phone ?? null) : null,
            publicId: view.worker?.worker?.publicId ?? null,
            score: view.worker?.worker?.stats.score ?? null,
          }
        : null,
  };
}
