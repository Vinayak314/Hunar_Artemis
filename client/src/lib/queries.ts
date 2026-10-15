import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { Coords } from './device';
import type { ChatDraft, ChatResult, ChatTurn, Earnings, Job, Lang, Me, PayCheck, PayUnit, PublicWorker, RatingBreakdown, Trade } from './types';

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async (): Promise<Me | null> => {
    try {
      return (await api<{ user: Me }>('GET', '/api/me')).user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
  staleTime: 60_000,
});

export function feedQuery(params: { trade?: Trade | undefined; near?: Coords | null }) {
  const qs = new URLSearchParams();
  if (params.trade) qs.set('trade', params.trade);
  if (params.near) {
    qs.set('lat', params.near.lat.toFixed(4));
    qs.set('lng', params.near.lng.toFixed(4));
  }
  return queryOptions({
    queryKey: ['feed', params.trade ?? 'all', params.near?.lat ?? null, params.near?.lng ?? null],
    queryFn: async () => (await api<{ jobs: Job[] }>('GET', `/api/jobs?${qs}`)).jobs,
    refetchInterval: 60_000,
  });
}

export const myJobsQuery = queryOptions({
  queryKey: ['my-jobs'],
  queryFn: async () => (await api<{ jobs: Job[] }>('GET', '/api/me/jobs')).jobs,
  refetchInterval: 30_000,
});

export const earningsQuery = queryOptions({
  queryKey: ['earnings'],
  queryFn: () => api<Earnings>('GET', '/api/me/earnings'),
});

export function workerCardQuery(publicId: string) {
  return queryOptions({
    queryKey: ['worker-card', publicId],
    queryFn: async () => (await api<{ worker: PublicWorker }>('GET', `/api/workers/${publicId}`)).worker,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });
}

/** After any job change, everything that lists jobs or counts them may be stale. */
function useInvalidateJobs() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['feed'] }),
      qc.invalidateQueries({ queryKey: ['my-jobs'] }),
      qc.invalidateQueries({ queryKey: ['earnings'] }),
      qc.invalidateQueries({ queryKey: ['me'] }),
      qc.invalidateQueries({ queryKey: ['worker-card'] }),
    ]);
}

export type JobAction = 'accept' | 'withdraw' | 'complete' | 'cancel';

export function useJobAction() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: JobAction }) =>
      api<{ job: Job }>('POST', `/api/jobs/${id}/${action}`).then((r) => r.job),
    onSettled: invalidate,
  });
}

export type ReviewInput = { ratings: RatingBreakdown; comment?: string } | { stars: number; comment?: string };

export function useReview() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: ({ id, review }: { id: string; review: ReviewInput }) => api('POST', `/api/jobs/${id}/review`, review),
    onSettled: invalidate,
  });
}

export interface NewJob {
  trade: Trade;
  description: string;
  title?: Partial<Record<Lang, string>>;
  summary?: Partial<Record<Lang, string>>;
  locality: string;
  city: string;
  location?: Coords;
  when: string;
  duration?: string;
  pay: { amount: number; unit: 'total' | 'per_day'; days?: number };
  payment: { when: 'after_work' | 'advance_part' | 'daily'; method: 'cash' | 'upi' | 'either'; advance?: number };
}

export function useCreateJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (job: NewJob) => api<{ job: Job }>('POST', '/api/jobs', job).then((r) => r.job),
    onSettled: invalidate,
  });
}

export interface ChatInput {
  lang: Lang;
  turns: ChatTurn[];
  draft?: ChatDraft;
  image?: { mimeType: 'image/jpeg'; base64: string };
  cityHint?: string;
}

/** One turn of the posting chat. The server is stateless, so the whole conversation is sent each time. */
export function useChatTurn() {
  return useMutation({
    mutationFn: (input: ChatInput) => api<{ result: ChatResult }>('POST', '/api/jobs/chat', input).then((r) => r.result),
  });
}

/** Live fair-pay hint. It informs and never blocks posting. */
export function usePayCheck(trade: Trade | '' | null, amount: number, unit: PayUnit | '', days?: number) {
  const params = { trade, amount, unit, days };
  const qs = new URLSearchParams({ trade: trade ?? '', amount: String(amount), unit });
  if (days) qs.set('days', String(days));
  return useQuery({
    queryKey: ['pay-check', params],
    queryFn: async () => (await api<{ payCheck: PayCheck }>('GET', `/api/jobs/pay-check?${qs}`)).payCheck,
    enabled: Boolean(trade) && Boolean(unit) && Number.isInteger(amount) && amount > 0,
    staleTime: Infinity,
  });
}

export type ProfilePatch = {
  name?: string;
  lang?: Lang;
  worker?: Partial<{
    trade: Trade;
    experience: '0-2' | '3-10' | '10+';
    naka: string;
    city: string;
    dayRate: { min: number; max: number } | null;
    available: boolean;
  }>;
};

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api<{ user: Me }>('PATCH', '/api/me', patch).then((r) => r.user),
    onSuccess: (user) => {
      qc.setQueryData(meQuery.queryKey, user);
      void qc.invalidateQueries({ queryKey: ['worker-card'] });
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('POST', '/api/auth/logout'),
    onSettled: () => {
      qc.setQueryData(meQuery.queryKey, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
  });
}
