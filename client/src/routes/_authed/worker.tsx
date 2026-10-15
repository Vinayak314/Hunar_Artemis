import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, ChevronDown, CircleCheck, LocateFixed, MapPin, QrCode, Search, ShieldCheck, Star, Wallet } from 'lucide-react';
import { EmptyBlock, ErrorBlock, LoadingBlock, Notice, TRADE_ICON, usePageTitle } from '@/components/common';
import { JobCard } from '@/components/job-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { GeoError, getCurrentPosition, useNearMe } from '@/lib/device';
import { firstName, initials, rupees } from '@/lib/format';
import { LOCALE, TRADE_LABEL, useLang } from '@/lib/i18n';
import { earningsQuery, feedQuery, useUpdateMe } from '@/lib/queries';
import { useMe } from '@/lib/session';
import { TRADES, type Lang, type Me, type Trade } from '@/lib/types';

export const Route = createFileRoute('/_authed/worker')({
  beforeLoad: ({ context }) => {
    if (context.me.role !== 'worker') throw redirect({ to: '/my-jobs' });
  },
  component: WorkerHome,
});

const COPY = {
  en: {
    title: 'Find work',
    greeting: 'Namaste',
    greetingSub: 'A new day. A new opportunity.',
    hero: 'Your skill.\nYour identity.',
    heroSub: 'Good work. Fair pay. A name of your own.',
    nearby: 'Work near you',
    subtitle: 'Open jobs from customers. Nearest first when your location is on.',
    count: (n: number) => `${n} open`,
    all: 'All work',
    emptyTitle: 'No open jobs right now',
    emptyText: 'New jobs appear here as soon as customers post them. Keep "Available today" on and show your Hunar Card QR at your naka.',
    emptyFiltered: (trade: string) => `No open ${trade} jobs right now. Try "All work".`,
    available: 'Available today',
    notAvailable: 'Not available today',
    availableSub: 'Shown on your Hunar Card so customers know you are free.',
    myCard: 'My identity',
    jobsDone: 'Jobs done',
    rating: 'Rating',
    newRating: 'New',
    openCard: 'See your Hunar Card',
    week: "This week's earnings",
    vsLast: (pct: number) => `${pct > 0 ? '+' : ''}${pct}% vs last week`,
    fullRecord: 'See full record',
    rightsTitle: 'Your rights, with you',
    rightsText: 'Government schemes, documents and help in one place.',
    openRights: 'Open Rights Hub',
    checkJob: 'Check a job message',
    nearMe: 'Near me',
    locTitle: 'Show jobs near you',
    locText: 'Your location stays on this phone. It is only used to sort jobs by distance.',
    useLocation: 'Use my location',
    stopLocation: 'Stop using location',
    locDenied: 'Location permission was denied. You can allow it in your browser settings.',
    locFailed: 'Could not get your location. Please try again.',
  },
  hi: {
    title: 'काम खोजें',
    greeting: 'नमस्ते',
    greetingSub: 'नया दिन, नए मौके। चलिए, काम ढूँढते हैं।',
    hero: 'आपका हुनर,\nआपकी पहचान।',
    heroSub: 'अच्छा काम। सही दाम। अपनी पहचान।',
    nearby: 'आपके आस-पास काम',
    subtitle: 'ग्राहकों के डाले हुए खुले काम। लोकेशन चालू हो तो पास वाले पहले।',
    count: (n: number) => `${n} खुले काम`,
    all: 'सभी काम',
    emptyTitle: 'अभी कोई खुला काम नहीं',
    emptyText: 'ग्राहक जैसे ही काम डालेंगे, यहाँ दिखेगा। "आज उपलब्ध" चालू रखें और अपने नाके पर हुनर कार्ड का QR दिखाएँ।',
    emptyFiltered: (trade: string) => `अभी ${trade} का कोई खुला काम नहीं। "सभी काम" देखें।`,
    available: 'आज काम के लिए तैयार',
    notAvailable: 'आज उपलब्ध नहीं',
    availableSub: 'आपके हुनर कार्ड पर दिखेगा, ताकि ग्राहक जानें कि आप खाली हैं।',
    myCard: 'मेरी पहचान',
    jobsDone: 'काम पूरे',
    rating: 'रेटिंग',
    newRating: 'नए',
    openCard: 'अपना हुनर कार्ड देखें',
    week: 'इस हफ़्ते की कमाई',
    vsLast: (pct: number) => `पिछले हफ़्ते से ${pct > 0 ? '+' : ''}${pct}%`,
    fullRecord: 'पूरा हिसाब देखें',
    rightsTitle: 'आपके हक़, आपके साथ',
    rightsText: 'सरकारी योजनाएँ, ज़रूरी दस्तावेज़ और मदद, एक जगह।',
    openRights: 'अधिकार साथी खोलें',
    checkJob: 'काम की जाँच',
    nearMe: 'मेरे पास',
    locTitle: 'पास के काम दिखाएँ',
    locText: 'आपकी लोकेशन इसी फ़ोन पर रहती है। इसका इस्तेमाल सिर्फ़ काम को दूरी के हिसाब से लगाने के लिए होता है।',
    useLocation: 'मेरी लोकेशन इस्तेमाल करें',
    stopLocation: 'लोकेशन बंद करें',
    locDenied: 'लोकेशन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दे सकते हैं।',
    locFailed: 'लोकेशन नहीं मिल पाई। फिर कोशिश करें।',
  },
  mr: {
    title: 'काम शोधा',
    greeting: 'नमस्कार',
    greetingSub: 'नवा दिवस, नव्या संधी. चला, काम शोधूया.',
    hero: 'तुमचे कौशल्य,\nतुमची ओळख.',
    heroSub: 'चांगले काम. योग्य मोबदला. आपली ओळख.',
    nearby: 'तुमच्या जवळची कामे',
    subtitle: 'ग्राहकांनी टाकलेली कामे. लोकेशन सुरू असल्यास जवळची आधी.',
    count: (n: number) => `${n} कामे`,
    all: 'सर्व कामे',
    emptyTitle: 'सध्या एकही काम उपलब्ध नाही',
    emptyText: 'ग्राहकांनी काम टाकताच ते इथे दिसेल. "आज उपलब्ध" सुरू ठेवा आणि नाक्यावर हुनर कार्डचा QR दाखवा.',
    emptyFiltered: (trade: string) => `सध्या ${trade} चे काम उपलब्ध नाही. "सर्व कामे" पहा.`,
    available: 'आज कामासाठी तयार',
    notAvailable: 'आज उपलब्ध नाही',
    availableSub: 'तुमच्या हुनर कार्डवर दिसेल, म्हणजे ग्राहकांना कळेल की तुम्ही मोकळे आहात.',
    myCard: 'माझी ओळख',
    jobsDone: 'कामे पूर्ण',
    rating: 'रेटिंग',
    newRating: 'नवीन',
    openCard: 'तुमचे हुनर कार्ड पहा',
    week: 'या आठवड्याची कमाई',
    vsLast: (pct: number) => `मागच्या आठवड्यापेक्षा ${pct > 0 ? '+' : ''}${pct}%`,
    fullRecord: 'पूर्ण हिशोब पहा',
    rightsTitle: 'तुमचे हक्क, तुमच्यासोबत',
    rightsText: 'सरकारी योजना, आवश्यक कागदपत्रे आणि मदत, एका ठिकाणी.',
    openRights: 'हक्क साथी उघडा',
    checkJob: 'काम तपासा',
    nearMe: 'माझ्या जवळ',
    locTitle: 'जवळची कामे दाखवा',
    locText: 'तुमचे लोकेशन याच फोनवर राहते. ते फक्त कामे अंतरानुसार लावण्यासाठी वापरले जाते.',
    useLocation: 'माझे लोकेशन वापरा',
    stopLocation: 'लोकेशन बंद करा',
    locDenied: 'लोकेशनची परवानगी मिळाली नाही. ब्राउझर सेटिंगमध्ये परवानगी देऊ शकता.',
    locFailed: 'लोकेशन मिळाले नाही. पुन्हा प्रयत्न करा.',
  },
} satisfies Record<Lang, unknown>;

type Copy = (typeof COPY)['en'];

function WorkerHome() {
  const me = useMe();
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  usePageTitle(c.title);
  const near = useNearMe((s) => s.coords);
  const [filter, setFilter] = useState<Trade | 'all'>('all');
  const feed = useQuery(feedQuery({ trade: filter === 'all' ? undefined : filter, near }));
  const w = me.worker;
  if (!w) return <ErrorBlock error={new Error('missing worker profile')} />;
  const trades: Trade[] = [w.trade, ...TRADES.filter((t) => t !== w.trade)];

  return (
    <>
      <div className="greeting-row">
        <div>
          <h1>
            {c.greeting}, {firstName(me.name)}
          </h1>
          <p>{c.greetingSub}</p>
        </div>
        <LocationButton me={me} c={c} />
      </div>

      <WelcomeBanner c={c} />

      <div className="workspace">
        <section>
          <div className="section-heading">
            <div>
              <h2 className="section-title">{c.nearby}</h2>
              <p className="section-sub">{c.subtitle}</p>
            </div>
            {feed.data && (
              <span className="job-count">
                <CircleCheck size={12} />
                {c.count(feed.data.length)}
              </span>
            )}
          </div>
          <div className="filter-row" role="group" aria-label={c.nearby}>
            <Button variant={filter === 'all' ? 'default' : 'outline'} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              {c.all}
            </Button>
            {trades.map((t) => {
              const Icon = TRADE_ICON[t];
              return (
                <Button key={t} variant={filter === t ? 'default' : 'outline'} aria-pressed={filter === t} onClick={() => setFilter(t)}>
                  <Icon size={14} />
                  {TRADE_LABEL[t][lang]}
                </Button>
              );
            })}
          </div>

          {feed.isLoading ? (
            <LoadingBlock />
          ) : feed.isError ? (
            <ErrorBlock error={feed.error} onRetry={() => void feed.refetch()} />
          ) : feed.data && feed.data.length > 0 ? (
            <div className="job-list">
              {feed.data.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyBlock title={c.emptyTitle}>
              <p>{filter === 'all' ? c.emptyText : c.emptyFiltered(TRADE_LABEL[filter][lang])}</p>
            </EmptyBlock>
          )}

          <div className="flex flex-wrap gap-3 mt-5">
            <Button asChild variant="outline">
              <Link to="/check-job">
                <Search />
                {c.checkJob}
              </Link>
            </Button>
          </div>
        </section>

        <aside className="side-column">
          <Availability me={me} c={c} />
          <IdentityMini me={me} c={c} />
          <EarningsMini c={c} lang={lang} />
          <section className="side-section rights-teaser">
            <h3>
              <ShieldCheck size={17} />
              {c.rightsTitle}
            </h3>
            <p>{c.rightsText}</p>
            <Link to="/rights" className="side-link">
              {c.openRights} <ArrowUpRight size={14} />
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}

function WelcomeBanner({ c }: { c: Copy }) {
  const [missing, setMissing] = useState(false);
  return (
    <section className="welcome-banner" aria-label="Hunar">
      {!missing && (
        <img
          src="/images/naka-workers.png"
          width={1536}
          height={768}
          alt="Skilled Indian workers with their tools at a neighbourhood naka"
          onError={() => setMissing(true)}
        />
      )}
      <div className="banner-copy">
        <div className="eyebrow">हुनर से आगे बढ़ें · MADE OF SKILL</div>
        <h2 className="display whitespace-pre-line">{c.hero}</h2>
        <p>{c.heroSub}</p>
        <div className="banner-foot">
          <ShieldCheck size={13} />
          काम भी, पहचान भी।
        </div>
      </div>
    </section>
  );
}

function LocationButton({ me, c }: { me: Me; c: Copy }) {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { coords, setCoords } = useNearMe();
  const label = coords ? c.nearMe : me.worker ? `${me.worker.naka}, ${me.worker.city}` : c.nearMe;

  async function locate() {
    setBusy(true);
    setProblem(null);
    try {
      setCoords(await getCurrentPosition());
      setOpen(false);
    } catch (err) {
      setProblem(err instanceof GeoError && err.reason === 'denied' ? c.locDenied : c.locFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" className="location-button" onClick={() => setOpen(true)}>
        {coords ? <LocateFixed size={15} /> : <MapPin size={15} />}
        <span>{label}</span>
        <ChevronDown size={13} />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{c.locTitle}</DialogTitle>
          <DialogDescription>{c.locText}</DialogDescription>
          {problem && <Notice tone="warning">{problem}</Notice>}
          <Button disabled={busy} onClick={() => void locate()}>
            <LocateFixed />
            {c.useLocation}
          </Button>
          {coords && (
            <Button
              variant="outline"
              onClick={() => {
                setCoords(null);
                setOpen(false);
              }}
            >
              {c.stopLocation}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Availability({ me, c }: { me: Me; c: Copy }) {
  const update = useUpdateMe();
  const available = update.isPending && update.variables?.worker?.available !== undefined ? update.variables.worker.available : (me.worker?.available ?? false);
  return (
    <div className={`availability ${available ? '' : 'off'}`}>
      <div>
        <strong>
          <span className={`w-2 h-2 rounded-full ${available ? 'bg-success' : 'bg-muted-foreground'}`} />
          {available ? c.available : c.notAvailable}
        </strong>
        <p>{c.availableSub}</p>
      </div>
      <Switch
        checked={available}
        disabled={update.isPending}
        onCheckedChange={(v) => update.mutate({ worker: { available: v } })}
        aria-label={c.available}
      />
    </div>
  );
}

function IdentityMini({ me, c }: { me: Me; c: Copy }) {
  const lang = useLang((s) => s.lang);
  const w = me.worker;
  if (!w) return null;
  const Icon = TRADE_ICON[w.trade];
  return (
    <section className="identity-card">
      <div className="identity-top">
        <span>{c.myCard}</span>
        <span className="display">हुनर</span>
      </div>
      <div className="identity-person">
        <div className="identity-avatar">{initials(me.name)}</div>
        <div>
          <h3>{me.name}</h3>
          <p>
            {TRADE_LABEL[w.trade][lang]} · {w.naka}
          </p>
        </div>
      </div>
      <div className="identity-stats">
        <div>
          <strong>{w.stats.jobsDone}</strong>
          <p>{c.jobsDone}</p>
        </div>
        <div>
          <strong className="flex gap-1 items-center">
            {w.stats.score !== null ? (
              <>
                {w.stats.score.toFixed(1)} <Star size={13} fill="currentColor" />
              </>
            ) : (
              c.newRating
            )}
          </strong>
          <p>{c.rating}</p>
        </div>
        <Icon size={30} className="ml-auto opacity-40" />
      </div>
      <div className="identity-link">
        <Link to="/card">
          <QrCode size={15} />
          {c.openCard}
        </Link>
        <ArrowUpRight size={15} />
      </div>
    </section>
  );
}

function EarningsMini({ c, lang }: { c: Copy; lang: Lang }) {
  const earnings = useQuery(earningsQuery);
  if (!earnings.data) return null;
  const { thisWeek, previousWeek, last7Days } = earnings.data;
  const max = Math.max(...last7Days.map((d) => d.amount), 1);
  const pct = previousWeek > 0 ? Math.round(((thisWeek - previousWeek) / previousWeek) * 100) : null;
  const weekday = new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'narrow', timeZone: 'Asia/Kolkata' });
  return (
    <section className="side-section">
      <h3>
        <Wallet size={16} />
        {c.week}
      </h3>
      <div className="earnings-amount">
        {rupees(thisWeek)}
        {pct !== null && <small className={pct < 0 ? 'down' : ''}>{c.vsLast(pct)}</small>}
      </div>
      <div className="earnings-bars" aria-hidden="true">
        {last7Days.map((d, i) => (
          <span key={d.date} className={i === last7Days.length - 1 ? 'today' : ''} style={{ height: `${Math.max(4, (d.amount / max) * 100)}%` }} />
        ))}
      </div>
      <div className="week-labels">
        {last7Days.map((d) => (
          <span key={d.date}>{weekday.format(new Date(`${d.date}T12:00:00+05:30`))}</span>
        ))}
      </div>
      <Link to="/my-work" className="side-link">
        {c.fullRecord} <ArrowRight size={14} />
      </Link>
    </section>
  );
}
