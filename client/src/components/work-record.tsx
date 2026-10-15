import { StarDisplay } from '@/components/common';
import { formatDate, rupees } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import type { Lang, PublicWorker, RatingBreakdown, WorkerStats } from '@/lib/types';

const COPY = {
  en: {
    record: 'Work record',
    jobsDone: (n: number) => `${n} ${n === 1 ? 'job' : 'jobs'} finished through Hunar`,
    reviews: (n: number) => `${n} customer ${n === 1 ? 'rating' : 'ratings'}`,
    recommend: 'Customers who recommend',
    noReviews: 'No ratings yet. After each finished job, the customer can rate the work here.',
    dims: { onTime: 'On time', quality: 'Quality of work', behaviour: 'Behaviour', fairPrice: 'Fair price' },
    dayRate: 'Day rate',
    availableToday: 'Available today',
    notAvailable: 'Not available today',
    memberSince: 'On Hunar since',
    testimonials: 'What customers say',
  },
  hi: {
    record: 'मेहनत का रिकॉर्ड',
    jobsDone: (n: number) => `हुनर से ${n} काम पूरे`,
    reviews: (n: number) => `${n} ग्राहकों की रेटिंग`,
    recommend: 'सिफ़ारिश करने वाले ग्राहक',
    noReviews: 'अभी कोई रेटिंग नहीं। हर पूरे हुए काम के बाद ग्राहक यहाँ रेटिंग दे सकते हैं।',
    dims: { onTime: 'समय पर', quality: 'काम की गुणवत्ता', behaviour: 'व्यवहार', fairPrice: 'सही दाम' },
    dayRate: 'रोज़ का रेट',
    availableToday: 'आज उपलब्ध',
    notAvailable: 'आज उपलब्ध नहीं',
    memberSince: 'हुनर पर कब से',
    testimonials: 'लोगों की बात',
  },
  mr: {
    record: 'कामाचा रेकॉर्ड',
    jobsDone: (n: number) => `हुनरमधून ${n} कामे पूर्ण`,
    reviews: (n: number) => `${n} ग्राहकांचे रेटिंग`,
    recommend: 'शिफारस करणारे ग्राहक',
    noReviews: 'अजून रेटिंग नाही. प्रत्येक पूर्ण कामानंतर ग्राहक इथे रेटिंग देऊ शकतात.',
    dims: { onTime: 'वेळेवर', quality: 'कामाचा दर्जा', behaviour: 'वागणूक', fairPrice: 'योग्य दर' },
    dayRate: 'रोजचा दर',
    availableToday: 'आज उपलब्ध',
    notAvailable: 'आज उपलब्ध नाही',
    memberSince: 'हुनरवर कधीपासून',
    testimonials: 'लोक काय म्हणतात',
  },
} satisfies Record<Lang, { dims: Record<keyof RatingBreakdown, string> } & Record<string, unknown>>;

/** Rating dimension labels, shared with the customer rating form. */
export function ratingLabels(lang: Lang): Record<keyof RatingBreakdown, string> {
  return COPY[lang].dims;
}

const DIMENSIONS: (keyof RatingBreakdown)[] = ['onTime', 'quality', 'behaviour', 'fairPrice'];

export function WorkRecord({
  stats,
  dayRate,
  available,
  memberSince,
}: {
  stats: WorkerStats;
  dayRate: { min: number; max: number } | null;
  available: boolean;
  memberSince: string;
}) {
  const lang = useLang((s) => s.lang);
  const r = COPY[lang];
  return (
    <div>
      <h2 className="section-title mb-2">{r.record}</h2>
      <div className="detail-line">
        <span>{r.jobsDone(stats.jobsDone)}</span>
      </div>
      {stats.reviewCount > 0 && stats.breakdown ? (
        <>
          <div className="detail-line">
            <span>{r.reviews(stats.reviewCount)}</span>
            <strong>{stats.score?.toFixed(1)}</strong>
          </div>
          {DIMENSIONS.map((d) => (
            <div className="detail-line" key={d}>
              <span>{r.dims[d]}</span>
              <StarDisplay value={stats.breakdown?.[d] ?? 0} />
            </div>
          ))}
          {stats.recommendRate !== null && (
            <div className="detail-line">
              <span>{r.recommend}</span>
              <strong>{Math.round(stats.recommendRate * 100)}%</strong>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground py-3">{r.noReviews}</p>
      )}
      {dayRate && (
        <div className="detail-line">
          <span>{r.dayRate}</span>
          <strong>
            {rupees(dayRate.min)} - {rupees(dayRate.max)}
          </strong>
        </div>
      )}
      <div className="detail-line">
        <span>{available ? r.availableToday : r.notAvailable}</span>
        <span className={`w-2.5 h-2.5 rounded-full self-center ${available ? 'bg-success' : 'bg-muted-foreground'}`} />
      </div>
      <div className="detail-line">
        <span>{r.memberSince}</span>
        <strong>{formatDate(memberSince, lang)}</strong>
      </div>
    </div>
  );
}

export function Testimonials({ reviews }: { reviews: PublicWorker['reviews'] }) {
  const lang = useLang((s) => s.lang);
  const r = COPY[lang];
  const withText = reviews.filter((rv) => rv.comment);
  if (withText.length === 0) return null;
  return (
    <section className="mt-9">
      <h2 className="section-title">{r.testimonials}</h2>
      {withText.map((rv) => (
        <div className="history-row" key={`${rv.from}-${rv.createdAt}`}>
          <StarDisplay value={rv.stars} />
          <p>"{rv.comment}"</p>
          <p>
            {rv.from} · {formatDate(rv.createdAt, lang)}
          </p>
        </div>
      ))}
    </section>
  );
}
