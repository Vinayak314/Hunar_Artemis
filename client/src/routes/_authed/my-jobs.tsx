import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { Check, ContactRound, Phone, Plus, Star, X } from 'lucide-react';
import { EmptyBlock, ErrorBlock, LoadingBlock, Notice, StarInput, TradeIcon, usePageTitle } from '@/components/common';
import { ratingLabels } from '@/components/work-record';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { paymentText, payText, phoneText, timeAgo } from '@/lib/format';
import { errorText, localizedText, TRADE_LABEL, useLang } from '@/lib/i18n';
import { myJobsQuery, useJobAction, useReview } from '@/lib/queries';
import type { Job, JobStatus, Lang, RatingBreakdown } from '@/lib/types';

export const Route = createFileRoute('/_authed/my-jobs')({
  beforeLoad: ({ context }) => {
    if (context.me.role !== 'customer') throw redirect({ to: '/worker' });
  },
  component: MyJobs,
});

const COPY = {
  en: {
    title: 'My jobs',
    sub: 'See who accepted your work, call them, and rate the job when it is done.',
    post: 'Post a new job',
    status: { open: 'Waiting for a worker', assigned: 'Worker on the job', done: 'Finished', cancelled: 'Cancelled' } as Record<JobStatus, string>,
    accepted: (name: string) => `${name} accepted this job`,
    call: 'Call',
    card: 'Hunar Card',
    cancel: 'Cancel job',
    confirmCancel: 'Cancel this job? Workers will no longer see it.',
    yes: 'Yes, cancel',
    no: 'Keep it',
    markDone: 'Mark as finished',
    rateTitle: (name: string) => `How did ${name} do?`,
    comment: 'A few words for other customers (optional)',
    saveRating: 'Save rating',
    rated: 'Thank you. Your rating now counts on the worker\'s Hunar Card.',
    emptyTitle: 'You have not posted any work yet',
    emptyText: 'Describe the job in your own words. Skilled workers nearby will see it with clear pay and payment terms.',
    posted: 'Posted',
  },
  hi: {
    title: 'मेरे दिए काम',
    sub: 'देखें किसने आपका काम लिया, उन्हें फ़ोन करें, और काम पूरा होने पर रेटिंग दें।',
    post: 'नया काम डालें',
    status: { open: 'कारीगर का इंतज़ार', assigned: 'कारीगर काम पर', done: 'पूरा हुआ', cancelled: 'रद्द' } as Record<JobStatus, string>,
    accepted: (name: string) => `${name} ने यह काम लिया है`,
    call: 'फ़ोन करें',
    card: 'हुनर कार्ड',
    cancel: 'काम रद्द करें',
    confirmCancel: 'यह काम रद्द करें? कारीगरों को यह फिर नहीं दिखेगा।',
    yes: 'हाँ, रद्द करें',
    no: 'रहने दें',
    markDone: 'काम पूरा हुआ',
    rateTitle: (name: string) => `${name} का काम कैसा रहा?`,
    comment: 'दूसरे ग्राहकों के लिए कुछ शब्द (ज़रूरी नहीं)',
    saveRating: 'रेटिंग सेव करें',
    rated: 'धन्यवाद। आपकी रेटिंग अब कारीगर के हुनर कार्ड पर गिनी जाएगी।',
    emptyTitle: 'आपने अभी कोई काम नहीं डाला',
    emptyText: 'अपने शब्दों में काम बताइए। पास के कुशल कारीगर इसे साफ़ पैसे और भुगतान की शर्तों के साथ देखेंगे।',
    posted: 'डाला गया',
  },
  mr: {
    title: 'मी दिलेली कामे',
    sub: 'तुमचे काम कोणी घेतले ते पहा, त्यांना फोन करा, आणि काम झाल्यावर रेटिंग द्या.',
    post: 'नवीन काम टाका',
    status: { open: 'कारागिराची वाट', assigned: 'कारागीर कामावर', done: 'पूर्ण झाले', cancelled: 'रद्द' } as Record<JobStatus, string>,
    accepted: (name: string) => `${name} यांनी हे काम घेतले आहे`,
    call: 'फोन करा',
    card: 'हुनर कार्ड',
    cancel: 'काम रद्द करा',
    confirmCancel: 'हे काम रद्द करायचे? कारागिरांना ते पुन्हा दिसणार नाही.',
    yes: 'हो, रद्द करा',
    no: 'राहू द्या',
    markDone: 'काम पूर्ण झाले',
    rateTitle: (name: string) => `${name} यांचे काम कसे होते?`,
    comment: 'इतर ग्राहकांसाठी काही शब्द (ऐच्छिक)',
    saveRating: 'रेटिंग सेव्ह करा',
    rated: 'धन्यवाद. तुमचे रेटिंग आता कारागिराच्या हुनर कार्डवर मोजले जाईल.',
    emptyTitle: 'तुम्ही अजून एकही काम टाकलेले नाही',
    emptyText: 'तुमच्या शब्दांत काम सांगा. जवळचे कुशल कारागीर ते स्पष्ट पैसे आणि अटींसह पाहतील.',
    posted: 'टाकले',
  },
} satisfies Record<Lang, unknown>;

const STATUS_ORDER: Record<JobStatus, number> = { assigned: 0, done: 1, open: 2, cancelled: 3 };

function MyJobs() {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  usePageTitle(c.title);
  const jobs = useQuery(myJobsQuery);
  const sorted = [...(jobs.data ?? [])].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="content-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{c.title}</h1>
          <p className="page-description">{c.sub}</p>
        </div>
        <Button asChild>
          <Link to="/post-job">
            <Plus />
            {c.post}
          </Link>
        </Button>
      </div>

      {jobs.isLoading ? (
        <LoadingBlock />
      ) : jobs.isError ? (
        <ErrorBlock error={jobs.error} onRetry={() => void jobs.refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyBlock title={c.emptyTitle}>
          <p>{c.emptyText}</p>
          <Button asChild>
            <Link to="/post-job">
              <Plus />
              {c.post}
            </Link>
          </Button>
        </EmptyBlock>
      ) : (
        sorted.map((job) => <JobRow key={job.id} job={job} lang={lang} />)
      )}
    </div>
  );
}

function JobRow({ job, lang }: { job: Job; lang: Lang }) {
  const c = COPY[lang];
  const action = useJobAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const title = localizedText(job.title, lang) || TRADE_LABEL[job.trade][lang];

  return (
    <article className="history-row">
      <div className="flex items-start gap-3">
        <TradeIcon trade={job.trade} size={18} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap justify-between gap-2">
            <h3>{title}</h3>
            <span className={`status-pill ${job.status}`}>{c.status[job.status]}</span>
          </div>
          <p>
            {payText(job.pay, lang)} · {job.locality}, {job.city} · {job.when}
          </p>
          <p>
            {paymentText(job.payment, lang)} · {c.posted} {timeAgo(job.createdAt, lang)}
          </p>
        </div>
      </div>

      {job.worker && (job.status === 'assigned' || job.status === 'done') && (
        <div className="notice mt-3 grid gap-2">
          <span>
            {c.accepted(job.worker.name)}
            {job.worker.score !== null && (
              <>
                {' · '}
                <Star size={12} className="inline" fill="currentColor" /> {job.worker.score.toFixed(1)}
              </>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            {job.worker.phone && (
              <Button asChild size="sm">
                <a href={`tel:+91${job.worker.phone}`}>
                  <Phone />
                  {c.call} · {phoneText(job.worker.phone)}
                </a>
              </Button>
            )}
            {job.worker.publicId && (
              <Button asChild size="sm" variant="outline">
                <Link to="/w/$publicId" params={{ publicId: job.worker.publicId }}>
                  <ContactRound />
                  {c.card}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {action.isError && (
        <Notice tone="error" className="mt-3">
          {errorText(action.error, lang)}
        </Notice>
      )}

      {job.status === 'open' &&
        (confirmCancel ? (
          <div className="notice warning-notice mt-3 grid gap-3">
            <span>{c.confirmCancel}</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" disabled={action.isPending} onClick={() => action.mutate({ id: job.id, action: 'cancel' })}>
                {c.yes}
              </Button>
              <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                {c.no}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="mt-3" onClick={() => setConfirmCancel(true)}>
            <X />
            {c.cancel}
          </Button>
        ))}

      {job.status === 'assigned' && (
        <Button className="mt-3" disabled={action.isPending} onClick={() => action.mutate({ id: job.id, action: 'complete' })}>
          <Check />
          {c.markDone}
        </Button>
      )}

      {job.status === 'done' && job.worker && (job.myReviewDone ? <p className="mt-3">{c.rated}</p> : <RateWorker job={job} workerName={job.worker.name} lang={lang} />)}
    </article>
  );
}

const DIMENSIONS: (keyof RatingBreakdown)[] = ['onTime', 'quality', 'behaviour', 'fairPrice'];

function RateWorker({ job, workerName, lang }: { job: Job; workerName: string; lang: Lang }) {
  const c = COPY[lang];
  const labels = ratingLabels(lang);
  const review = useReview();
  const [ratings, setRatings] = useState<Record<keyof RatingBreakdown, number>>({ onTime: 0, quality: 0, behaviour: 0, fairPrice: 0 });
  const [comment, setComment] = useState('');
  const complete = DIMENSIONS.every((d) => ratings[d] > 0);

  return (
    <div className="mt-4 panel">
      <p className="font-medium">{c.rateTitle(workerName)}</p>
      {DIMENSIONS.map((d) => (
        <div key={d} className="mt-3">
          <p className="text-sm">{labels[d]}</p>
          <StarInput value={ratings[d]} onChange={(n) => setRatings((r) => ({ ...r, [d]: n }))} label={labels[d]} />
        </div>
      ))}
      <Textarea className="mt-4" placeholder={c.comment} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
      {review.isError && <Notice tone="error" className="mt-3">{errorText(review.error, lang)}</Notice>}
      <Button
        className="mt-3"
        disabled={!complete || review.isPending}
        onClick={() => review.mutate({ id: job.id, review: { ratings, ...(comment.trim() ? { comment: comment.trim() } : {}) } })}
      >
        {c.saveRating}
      </Button>
    </div>
  );
}
