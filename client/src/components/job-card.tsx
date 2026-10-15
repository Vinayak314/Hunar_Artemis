import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck, Star, TriangleAlert } from 'lucide-react';
import { Notice, TradeIcon } from '@/components/common';
import { Listen } from '@/components/hunar-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { paymentText, payText, timeAgo } from '@/lib/format';
import { errorText, localizedText, TRADE_LABEL, useLang } from '@/lib/i18n';
import { useJobAction } from '@/lib/queries';
import type { Job, Lang } from '@/lib/types';

const COPY = {
  en: {
    total: 'Total pay',
    daily: 'Daily wage',
    view: 'View job',
    accept: 'Accept job',
    accepted: 'Accepted. You can now call the customer from My work.',
    goToMyWork: 'Open My work',
    when: 'When',
    duration: 'Duration',
    distance: 'Distance',
    place: 'Place',
    km: 'km',
    newCustomer: 'New customer',
    paidJobs: (n: number) => `${n} finished ${n === 1 ? 'job' : 'jobs'}`,
    lowPay: 'Pay may be low for this work. Talk about the rate before you start.',
    materials: 'Materials are separate from your pay. Agree on the work before starting.',
    posted: 'Posted',
  },
  hi: {
    total: 'कुल भुगतान',
    daily: 'रोज़ की मज़दूरी',
    view: 'काम देखें',
    accept: 'काम स्वीकार करें',
    accepted: 'काम स्वीकार हुआ। अब "मेरे काम" से ग्राहक को फ़ोन कर सकते हैं।',
    goToMyWork: 'मेरे काम खोलें',
    when: 'कब',
    duration: 'समय',
    distance: 'दूरी',
    place: 'जगह',
    km: 'कि.मी.',
    newCustomer: 'नया ग्राहक',
    paidJobs: (n: number) => `${n} काम पूरे`,
    lowPay: 'इस काम के लिए पैसे कम लग रहे हैं। शुरू करने से पहले दाम पर बात करें।',
    materials: 'सामान का खर्च आपकी मज़दूरी से अलग है। काम शुरू करने से पहले बात तय करें।',
    posted: 'डाला गया',
  },
  mr: {
    total: 'एकूण पैसे',
    daily: 'रोजची मजुरी',
    view: 'काम पहा',
    accept: 'काम स्वीकारा',
    accepted: 'काम स्वीकारले. आता "माझी कामे" मधून ग्राहकाला फोन करू शकता.',
    goToMyWork: 'माझी कामे उघडा',
    when: 'कधी',
    duration: 'वेळ',
    distance: 'अंतर',
    place: 'ठिकाण',
    km: 'कि.मी.',
    newCustomer: 'नवीन ग्राहक',
    paidJobs: (n: number) => `${n} कामे पूर्ण`,
    lowPay: 'या कामासाठी पैसे कमी वाटत आहेत. सुरू करण्याआधी दरावर बोला.',
    materials: 'साहित्याचा खर्च तुमच्या मजुरीपेक्षा वेगळा आहे. काम सुरू करण्याआधी ठरवा.',
    posted: 'टाकले',
  },
} satisfies Record<Lang, unknown>;

export function JobCard({ job }: { job: Job }) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const [open, setOpen] = useState(false);
  const action = useJobAction();
  const accepted = action.isSuccess || job.status === 'assigned';

  const title = localizedText(job.title, lang) || TRADE_LABEL[job.trade][lang];
  const subtitle = lang !== 'en' && job.title.en ? job.title.en : TRADE_LABEL[job.trade][lang];
  const summary = localizedText(job.summary, lang) || job.description;
  const pay = payText(job.pay, lang);
  const payment = paymentText(job.payment, lang);
  const place = job.distanceKm !== null ? `${job.locality} · ${job.distanceKm} ${c.km}` : job.locality;

  return (
    <>
      <article className="job-card">
        <div className="job-top">
          <TradeIcon trade={job.trade} />
          <div className="min-w-0">
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <div className="job-pay">
            <strong>{pay}</strong>
            <small>{job.pay.unit === 'per_day' ? c.daily : c.total}</small>
          </div>
        </div>
        <p className="job-description">{summary}</p>
        <div className="job-meta">
          <span>
            <MapPin size={13} />
            {place}
          </span>
          <span>
            <CalendarDays size={13} />
            {job.when}
          </span>
          {job.duration && (
            <span>
              <Clock3 size={13} />
              {job.duration}
            </span>
          )}
          <Listen text={`${title}. ${pay}. ${job.when}. ${payment}`} />
        </div>
        {job.payCheck === 'low' && (
          <p className="pay-flag">
            <TriangleAlert size={13} />
            {c.lowPay}
          </p>
        )}
        <div className="job-bottom">
          <span className="payment-info">
            <ShieldCheck size={13} />
            {payment}
          </span>
          <Button onClick={() => setOpen(true)}>
            {accepted && <Check />}
            {c.view}
            <ArrowUpRight size={13} />
          </Button>
        </div>
        <p className="customer-trust">
          {job.customer.ratingAvg !== null ? (
            <>
              <Star size={11} className="inline mr-1 text-warning" fill="currentColor" />
              {job.customer.ratingAvg} · {job.customer.name} · {c.paidJobs(job.customer.jobsCompleted)}
            </>
          ) : (
            <>
              {job.customer.name} · {job.customer.jobsCompleted > 0 ? c.paidJobs(job.customer.jobsCompleted) : c.newCustomer}
            </>
          )}
          {' · '}
          {c.posted} {timeAgo(job.createdAt, lang)}
        </p>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="modal-scroll">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subtitle} · {job.locality}, {job.city}
          </DialogDescription>
          <div className="text-3xl font-semibold">{pay}</div>
          <p className="text-sm leading-7">{summary}</p>
          {summary !== job.description && <p className="text-sm leading-7 text-muted-foreground">"{job.description}"</p>}
          <div>
            <div className="detail-line">
              <span>{c.when}</span>
              <strong>{job.when}</strong>
            </div>
            {job.duration && (
              <div className="detail-line">
                <span>{c.duration}</span>
                <strong>{job.duration}</strong>
              </div>
            )}
            <div className="detail-line">
              <span>{c.place}</span>
              <strong>
                {job.locality}, {job.city}
              </strong>
            </div>
            {job.distanceKm !== null && (
              <div className="detail-line">
                <span>{c.distance}</span>
                <strong>
                  {job.distanceKm} {c.km}
                </strong>
              </div>
            )}
          </div>
          <Notice>
            <ShieldCheck size={15} className="inline mr-2" />
            {payment}
            <br />
            {c.materials}
          </Notice>
          {job.payCheck === 'low' && <Notice tone="warning">{c.lowPay}</Notice>}
          {accepted ? (
            <div role="status" className="grid gap-3">
              <Notice>{c.accepted}</Notice>
              <Button asChild variant="outline">
                <Link to="/my-work">{c.goToMyWork}</Link>
              </Button>
            </div>
          ) : (
            <>
              {action.isError && <Notice tone="error">{errorText(action.error, lang)}</Notice>}
              <Button size="lg" disabled={action.isPending} onClick={() => action.mutate({ id: job.id, action: 'accept' })}>
                <Check />
                {c.accept}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
