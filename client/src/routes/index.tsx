import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Hammer, HandHeart, ShieldCheck } from 'lucide-react';
import { Brand, homeFor, LanguageControl } from '@/components/hunar-shell';
import { useCopy } from '@/lib/i18n';
import { meQuery } from '@/lib/queries';
import type { Lang } from '@/lib/types';

export const Route = createFileRoute('/')({ component: Landing });

// The Lovable design uses an em dash and a curly apostrophe in its copy. They are built
// from character codes here so this source file stays plain ASCII.
const DASH = String.fromCharCode(0x2014);
const APOS = String.fromCharCode(0x2019);

// Copy is taken from the Lovable design. Two Marathi phrases are corrected from the
// Lovable text: "hishob" is masculine ("kamaicha hishob"), and "karun ghyayche" is the
// right verb for getting work done.
const COPY = {
  hi: {
    badge: 'काम भी, पहचान भी',
    title: 'आपका हुनर,\nआपकी पहचान।',
    sub: 'अच्छा काम। सही दाम। अपनी पहचान।',
    workerTitle: 'मैं काम ढूँढता हूँ',
    workerSub: `अपना हुनर दिखाइए ${DASH} आस-पास के काम, कमाई का हिसाब और आपका हुनर कार्ड, एक जगह।`,
    workerCta: 'काम खोजें',
    customerTitle: 'मुझे काम करवाना है',
    customerSub: 'पास के कुशल कारीगर खोजिए। साफ़ शर्तें, सही दाम, कोई छुपा खर्च नहीं।',
    customerCta: 'काम दें',
    trust: 'मेहनत आपकी। पहचान आपकी।',
    safety: 'हर काम पर भुगतान की साफ़ शर्तें',
  },
  mr: {
    badge: 'काम पण, ओळख पण',
    title: 'तुमचे कौशल्य,\nतुमची ओळख.',
    sub: 'चांगले काम. योग्य मोबदला. आपली ओळख.',
    workerTitle: 'मला काम हवं आहे',
    workerSub: `तुमचे कौशल्य दाखवा ${DASH} जवळची कामे, कमाईचा हिशोब आणि तुमचे हुनर कार्ड, एकत्र.`,
    workerCta: 'काम शोधा',
    customerTitle: 'मला काम करून घ्यायचं आहे',
    customerSub: 'जवळचे कुशल कारीगर शोधा. स्पष्ट अटी, योग्य दर, लपलेला खर्च नाही.',
    customerCta: 'काम द्या',
    trust: 'मेहनत तुमची. ओळख तुमची.',
    safety: 'प्रत्येक कामावर पगाराच्या स्पष्ट अटी',
  },
  en: {
    badge: 'KAAM BHI, PEHCHAAN BHI',
    title: 'Your skill.\nYour identity.',
    sub: 'Good work. Fair pay. A name of your own.',
    workerTitle: `I${APOS}m looking for work`,
    workerSub: `Show your skill ${DASH} jobs near you, your earnings ledger and your Hunar Card, in one place.`,
    workerCta: 'Find work',
    customerTitle: 'I need work done',
    customerSub: 'Find skilled workers nearby. Clear terms, fair pay, no hidden costs.',
    customerCta: 'Post a job',
    trust: 'Your effort. Your identity.',
    safety: 'Clear payment terms on every job',
  },
} satisfies Record<Lang, unknown>;

type Copy = (typeof COPY)['en'];

function HeroImage() {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <img
      src="/images/naka-workers.jpg"
      width={1536}
      height={768}
      alt="Skilled Indian workers at a neighbourhood naka"
      fetchPriority="high"
      onError={() => setMissing(true)}
    />
  );
}

function Landing() {
  const t = useCopy(COPY);
  const me = useQuery(meQuery).data;

  useEffect(() => {
    document.title = `Hunar ${DASH} काम भी, पहचान भी · Kaam Bhi, Pehchaan Bhi`;
  }, []);

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="header-inner">
          <Brand to={homeFor(me)} />
          <LanguageControl />
        </div>
      </header>
      <main className="landing-main">
        <section className="landing-hero" aria-label="Hunar introduction">
          <HeroImage />
          <div className="landing-hero-inner">
            <div className="eyebrow landing-eyebrow">{t.badge}</div>
            <h1 className="display whitespace-pre-line">{t.title}</h1>
            <p>{t.sub}</p>
            <div className="landing-hero-foot">
              <ShieldCheck size={14} />
              {t.safety}
            </div>
          </div>
        </section>
        <section className="landing-options" aria-label="Choose how you use Hunar">
          {/* Signed-in users go straight to their area; everyone else signs in first. */}
          {me?.role === 'worker' ? (
            <Link to="/worker" className="landing-card landing-card-worker">
              <WorkerCard t={t} />
            </Link>
          ) : (
            <Link to="/login" search={{ role: 'worker' }} className="landing-card landing-card-worker">
              <WorkerCard t={t} />
            </Link>
          )}
          {me?.role === 'customer' ? (
            <Link to="/post-job" className="landing-card">
              <CustomerCard t={t} />
            </Link>
          ) : (
            <Link to="/login" search={{ role: 'customer' }} className="landing-card">
              <CustomerCard t={t} />
            </Link>
          )}
        </section>
        <footer className="landing-trust">
          <span className="mini-flower" aria-hidden="true" />
          <span>{t.trust}</span>
        </footer>
      </main>
    </div>
  );
}

function WorkerCard({ t }: { t: Copy }) {
  return (
    <>
      <span className="trade-icon">
        <Hammer size={20} />
      </span>
      <h2>{t.workerTitle}</h2>
      <p>{t.workerSub}</p>
      <span className="landing-cta">
        {t.workerCta} <ArrowRight size={15} />
      </span>
    </>
  );
}

function CustomerCard({ t }: { t: Copy }) {
  return (
    <>
      <span className="trade-icon">
        <HandHeart size={20} />
      </span>
      <h2>{t.customerTitle}</h2>
      <p>{t.customerSub}</p>
      <span className="landing-cta">
        {t.customerCta} <ArrowRight size={15} />
      </span>
    </>
  );
}
