import { QRCodeSVG } from 'qrcode.react';
import { CircleCheck, Star } from 'lucide-react';
import { initials } from '@/lib/format';
import { EXPERIENCE_LABEL, TRADE_LABEL, useLang } from '@/lib/i18n';
import type { Experience, Lang, Trade, WorkerStats } from '@/lib/types';

const COPY = {
  en: { jobs: 'Jobs done', rating: 'Rating', newWorker: 'New', reviews: (n: number) => `${n} ${n === 1 ? 'review' : 'reviews'}` },
  hi: { jobs: 'काम पूरे', rating: 'रेटिंग', newWorker: 'नए', reviews: (n: number) => `${n} समीक्षा` },
  mr: { jobs: 'कामे पूर्ण', rating: 'रेटिंग', newWorker: 'नवीन', reviews: (n: number) => `${n} अभिप्राय` },
} satisfies Record<Lang, unknown>;

export interface CardPerson {
  name: string;
  trade: Trade;
  experience: Experience;
  naka: string;
  city: string;
  publicId: string;
  stats: WorkerStats;
}

/** The QR-backed identity card. The QR opens the worker's public card page. */
export function HunarCard({ person, qrUrl }: { person: CardPerson; qrUrl: string }) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const { stats } = person;
  return (
    <section className="identity-card" aria-label={`Hunar Card: ${person.name}`}>
      <div className="identity-top">
        <span>HUNAR CARD · हुनर पहचान</span>
        <span className="display">हुनर</span>
      </div>
      <div className="identity-person">
        <div className="identity-avatar">{initials(person.name)}</div>
        <div>
          <h3>{person.name}</h3>
          <p>
            {TRADE_LABEL[person.trade][lang]} · {EXPERIENCE_LABEL[person.experience][lang]}
            <CircleCheck size={10} className="inline ml-1" />
          </p>
          <p>
            {person.naka}, {person.city}
          </p>
        </div>
      </div>
      <div className="identity-stats">
        <div>
          <strong>{stats.jobsDone}</strong>
          <p>{c.jobs}</p>
        </div>
        <div>
          <strong className="flex gap-1 items-center">
            {stats.score !== null ? (
              <>
                {stats.score.toFixed(1)} <Star size={13} fill="currentColor" />
              </>
            ) : (
              c.newWorker
            )}
          </strong>
          <p>{stats.reviewCount > 0 ? c.reviews(stats.reviewCount) : c.rating}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-5">
        <div className="qr-paper">
          <QRCodeSVG value={qrUrl} size={112} level="M" />
        </div>
        <p className="text-xs leading-6">
          काम भी,
          <br />
          पहचान भी।
          <br />
          <span className="opacity-70">
            HUNAR · {person.city.toUpperCase()} · {person.publicId.toUpperCase()}
          </span>
        </p>
      </div>
    </section>
  );
}
