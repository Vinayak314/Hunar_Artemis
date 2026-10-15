import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { Check, Phone, Undo2, Wallet } from 'lucide-react';
import { EmptyBlock, ErrorBlock, LoadingBlock, Notice, StarInput, usePageTitle } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { paymentText, payText, phoneText, rupees, totalPay } from '@/lib/format';
import { errorText, localizedText, TRADE_LABEL, useLang } from '@/lib/i18n';
import { earningsQuery, myJobsQuery, useJobAction, useReview } from '@/lib/queries';
import type { Job, Lang } from '@/lib/types';

export const Route = createFileRoute('/_authed/my-work')({
  beforeLoad: ({ context }) => {
    if (context.me.role !== 'worker') throw redirect({ to: '/my-jobs' });
  },
  component: MyWork,
});

const COPY = {
  en: {
    title: 'My work',
    sub: 'Your work, your record. Payment is agreed directly between you and the customer.',
    thisWeek: 'This week',
    allTime: 'All time',
    jobsDone: 'Jobs done',
    selfReported: 'Amounts come from the pay agreed on each job. Hunar does not handle money.',
    active: 'In progress',
    finished: 'Finished',
    call: (name: string) => `Call ${name}`,
    markDone: 'Mark as finished',
    withdraw: 'I cannot do this job',
    confirmWithdraw: 'The job will go back to other workers. Are you sure?',
    yes: 'Yes, give it back',
    no: 'Keep the job',
    confirmPay: 'Confirm the payment directly with your customer.',
    rateCustomer: 'How was this customer?',
    rateHint: 'Your rating helps other workers avoid late payers.',
    comment: 'Anything to add? (optional)',
    saveRating: 'Save rating',
    rated: 'Thank you. Your rating is saved.',
    emptyTitle: 'No accepted jobs yet',
    emptyText: 'Jobs you accept will appear here with the customer phone number and payment terms.',
    findWork: 'Find work',
  },
  hi: {
    title: 'मेरे काम',
    sub: 'आपका काम, आपका हिसाब। भुगतान आप और ग्राहक आपस में तय करते हैं।',
    thisWeek: 'इस हफ़्ते',
    allTime: 'अब तक',
    jobsDone: 'काम पूरे',
    selfReported: 'रकम हर काम पर तय हुए पैसे से ली गई है। हुनर पैसों का लेन-देन नहीं करता।',
    active: 'चल रहे काम',
    finished: 'पूरे हुए काम',
    call: (name: string) => `${name} को फ़ोन करें`,
    markDone: 'काम पूरा हुआ',
    withdraw: 'मैं यह काम नहीं कर पाऊँगा',
    confirmWithdraw: 'यह काम दूसरे कारीगरों को वापस दिखेगा। क्या आप पक्का हैं?',
    yes: 'हाँ, वापस करें',
    no: 'काम रखें',
    confirmPay: 'भुगतान की पुष्टि सीधे ग्राहक से करें।',
    rateCustomer: 'ग्राहक कैसे थे?',
    rateHint: 'आपकी रेटिंग से दूसरे कारीगर देर से पैसे देने वालों से बच सकते हैं।',
    comment: 'कुछ और कहना है? (ज़रूरी नहीं)',
    saveRating: 'रेटिंग सेव करें',
    rated: 'धन्यवाद। आपकी रेटिंग सेव हो गई।',
    emptyTitle: 'अभी कोई काम नहीं',
    emptyText: 'जो काम आप स्वीकार करेंगे, वे यहाँ ग्राहक के फ़ोन नंबर और भुगतान की शर्तों के साथ दिखेंगे।',
    findWork: 'काम खोजें',
  },
  mr: {
    title: 'माझी कामे',
    sub: 'तुमचे काम, तुमचा हिशोब. पैसे तुम्ही आणि ग्राहक आपापसात ठरवता.',
    thisWeek: 'या आठवड्यात',
    allTime: 'आतापर्यंत',
    jobsDone: 'कामे पूर्ण',
    selfReported: 'रक्कम प्रत्येक कामावर ठरलेल्या पैशांवरून घेतली आहे. हुनर पैशांचा व्यवहार करत नाही.',
    active: 'सुरू असलेली कामे',
    finished: 'पूर्ण झालेली कामे',
    call: (name: string) => `${name} ला फोन करा`,
    markDone: 'काम पूर्ण झाले',
    withdraw: 'मला हे काम जमणार नाही',
    confirmWithdraw: 'हे काम इतर कारागिरांना परत दिसेल. नक्की?',
    yes: 'हो, परत द्या',
    no: 'काम ठेवा',
    confirmPay: 'पैशांची खात्री थेट ग्राहकाकडून करा.',
    rateCustomer: 'ग्राहक कसे होते?',
    rateHint: 'तुमच्या रेटिंगमुळे इतर कारागीर उशिरा पैसे देणाऱ्यांपासून वाचू शकतात.',
    comment: 'आणखी काही सांगायचे आहे? (ऐच्छिक)',
    saveRating: 'रेटिंग सेव्ह करा',
    rated: 'धन्यवाद. तुमचे रेटिंग सेव्ह झाले.',
    emptyTitle: 'अजून एकही काम नाही',
    emptyText: 'तुम्ही स्वीकारलेली कामे इथे ग्राहकाच्या फोन नंबर आणि पैशांच्या अटींसह दिसतील.',
    findWork: 'काम शोधा',
  },
} satisfies Record<Lang, unknown>;

function MyWork() {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  usePageTitle(c.title);
  const jobs = useQuery(myJobsQuery);
  const earnings = useQuery(earningsQuery);
  const active = jobs.data?.filter((j) => j.status === 'assigned') ?? [];
  const finished = jobs.data?.filter((j) => j.status === 'done') ?? [];

  return (
    <div className="content-page">
      <h1 className="page-title">{c.title}</h1>
      <p className="page-description">{c.sub}</p>

      {earnings.data && (
        <>
          <div className="stat-grid">
            <div>
              <strong>{rupees(earnings.data.thisWeek)}</strong>
              <span>{c.thisWeek}</span>
            </div>
            <div>
              <strong>{rupees(earnings.data.allTime)}</strong>
              <span>{c.allTime}</span>
            </div>
            <div>
              <strong>{earnings.data.jobsDone}</strong>
              <span>{c.jobsDone}</span>
            </div>
          </div>
          <Notice className="flex items-center gap-3 mb-6">
            <Wallet size={18} />
            <span>{c.selfReported}</span>
          </Notice>
        </>
      )}

      {jobs.isLoading ? (
        <LoadingBlock />
      ) : jobs.isError ? (
        <ErrorBlock error={jobs.error} onRetry={() => void jobs.refetch()} />
      ) : active.length + finished.length === 0 ? (
        <EmptyBlock title={c.emptyTitle}>
          <p>{c.emptyText}</p>
          <Button asChild>
            <Link to="/worker">{c.findWork}</Link>
          </Button>
        </EmptyBlock>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="section-title mt-2">{c.active}</h2>
              {active.map((j) => (
                <WorkRow key={j.id} job={j} lang={lang} />
              ))}
            </section>
          )}
          {finished.length > 0 && (
            <section className="mt-8">
              <h2 className="section-title">{c.finished}</h2>
              {finished.map((j) => (
                <WorkRow key={j.id} job={j} lang={lang} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function WorkRow({ job, lang }: { job: Job; lang: Lang }) {
  const c = COPY[lang];
  const action = useJobAction();
  const [confirming, setConfirming] = useState(false);
  const title = localizedText(job.title, lang) || TRADE_LABEL[job.trade][lang];

  return (
    <article className="history-row">
      <div className="flex justify-between gap-3">
        <h3 className="section-title text-base">{title}</h3>
        <strong>{payText(job.pay, lang)}</strong>
      </div>
      <p>
        {job.customer.name} · {job.locality}, {job.city} · {job.when}
      </p>
      <p>{paymentText(job.payment, lang)}</p>
      {job.customer.phone && (
        <Button asChild variant="outline" className="mt-3">
          <a href={`tel:+91${job.customer.phone}`}>
            <Phone />
            {c.call(job.customer.name)} · {phoneText(job.customer.phone)}
          </a>
        </Button>
      )}

      {action.isError && (
        <Notice tone="error" className="mt-3">
          {errorText(action.error, lang)}
        </Notice>
      )}

      {job.status === 'assigned' &&
        (confirming ? (
          <div className="notice warning-notice mt-3 grid gap-3">
            <span>{c.confirmWithdraw}</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" disabled={action.isPending} onClick={() => action.mutate({ id: job.id, action: 'withdraw' })}>
                {c.yes}
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                {c.no}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mt-3">
            <Button disabled={action.isPending} onClick={() => action.mutate({ id: job.id, action: 'complete' })}>
              <Check />
              {c.markDone}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              <Undo2 />
              {c.withdraw}
            </Button>
          </div>
        ))}

      {job.status === 'done' && (
        <>
          <Notice className="mt-3">
            <Check size={15} className="inline mr-2" />
            {rupees(totalPay(job.pay))} · {c.confirmPay}
          </Notice>
          {job.myReviewDone ? <p className="mt-3">{c.rated}</p> : <RateCustomer job={job} lang={lang} />}
        </>
      )}
    </article>
  );
}

function RateCustomer({ job, lang }: { job: Job; lang: Lang }) {
  const c = COPY[lang];
  const review = useReview();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  return (
    <div className="mt-4">
      <p className="font-medium text-sm">{c.rateCustomer}</p>
      <p className="text-xs">{c.rateHint}</p>
      <StarInput value={stars} onChange={setStars} label={c.rateCustomer} />
      {stars > 0 && (
        <>
          <Textarea className="mt-3" placeholder={c.comment} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
          {review.isError && <Notice tone="error" className="mt-3">{errorText(review.error, lang)}</Notice>}
          <Button
            className="mt-3"
            disabled={review.isPending}
            onClick={() => review.mutate({ id: job.id, review: { stars, ...(comment.trim() ? { comment: comment.trim() } : {}) } })}
          >
            {c.saveRating}
          </Button>
        </>
      )}
    </div>
  );
}
