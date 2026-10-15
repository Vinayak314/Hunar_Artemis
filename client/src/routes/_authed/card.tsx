import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ExternalLink, Pencil, Share2 } from 'lucide-react';
import { ErrorBlock, LoadingBlock, Notice, TradeIcon, usePageTitle } from '@/components/common';
import { HunarCard } from '@/components/hunar-card';
import { Testimonials, WorkRecord } from '@/components/work-record';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { errorText, EXPERIENCE_LABEL, TRADE_LABEL, useLang } from '@/lib/i18n';
import { useUpdateMe, workerCardQuery } from '@/lib/queries';
import { useMe } from '@/lib/session';
import { EXPERIENCE, TRADES, type Experience, type Lang, type Me, type Trade } from '@/lib/types';

export const Route = createFileRoute('/_authed/card')({
  beforeLoad: ({ context }) => {
    if (context.me.role !== 'worker') throw redirect({ to: '/my-jobs' });
  },
  component: CardPage,
});

const COPY = {
  en: {
    title: 'My skill, my identity',
    sub: 'Your Hunar Card. Anyone who scans the QR sees your real work record, never your phone number.',
    share: 'Share card',
    shared: 'Card link shared or copied.',
    edit: 'Edit profile',
    openPublic: 'Open public card',
    editTitle: 'Your profile',
    editSub: 'Name, skill and where you work',
    name: 'Name',
    trade: 'Skill',
    experience: 'Experience',
    naka: 'Naka or area',
    city: 'City',
    dayRate: 'Day rate (optional)',
    min: 'Lowest',
    max: 'Highest',
    save: 'Save profile',
    shareText: (name: string, trade: string) => `${name} · ${trade} · Hunar Card`,
  },
  hi: {
    title: 'मेरा हुनर, मेरी पहचान',
    sub: 'आपका हुनर कार्ड। QR स्कैन करने वाले को आपका असली काम का रिकॉर्ड दिखता है, आपका फ़ोन नंबर नहीं।',
    share: 'कार्ड भेजें',
    shared: 'कार्ड का लिंक भेजा या कॉपी हुआ।',
    edit: 'प्रोफ़ाइल बदलें',
    openPublic: 'सार्वजनिक कार्ड खोलें',
    editTitle: 'अपना परिचय',
    editSub: 'नाम, हुनर और काम की जगह',
    name: 'नाम',
    trade: 'हुनर',
    experience: 'अनुभव',
    naka: 'नाका या इलाका',
    city: 'शहर',
    dayRate: 'रोज़ का रेट (ज़रूरी नहीं)',
    min: 'कम से कम',
    max: 'ज़्यादा से ज़्यादा',
    save: 'सेव करें',
    shareText: (name: string, trade: string) => `${name} · ${trade} · हुनर कार्ड`,
  },
  mr: {
    title: 'माझे कौशल्य, माझी ओळख',
    sub: 'तुमचे हुनर कार्ड. QR स्कॅन करणाऱ्याला तुमचा खरा कामाचा रेकॉर्ड दिसतो, तुमचा फोन नंबर नाही.',
    share: 'कार्ड पाठवा',
    shared: 'कार्डची लिंक पाठवली किंवा कॉपी झाली.',
    edit: 'प्रोफाइल बदला',
    openPublic: 'सार्वजनिक कार्ड उघडा',
    editTitle: 'तुमची ओळख',
    editSub: 'नाव, कौशल्य आणि कामाचे ठिकाण',
    name: 'नाव',
    trade: 'कौशल्य',
    experience: 'अनुभव',
    naka: 'नाका किंवा भाग',
    city: 'शहर',
    dayRate: 'रोजचा दर (ऐच्छिक)',
    min: 'किमान',
    max: 'कमाल',
    save: 'सेव्ह करा',
    shareText: (name: string, trade: string) => `${name} · ${trade} · हुनर कार्ड`,
  },
} satisfies Record<Lang, unknown>;

function CardPage() {
  const me = useMe();
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  usePageTitle(c.title);
  const w = me.worker;
  const card = useQuery({ ...workerCardQuery(w?.publicId ?? ''), enabled: Boolean(w) });
  const [editOpen, setEditOpen] = useState(false);
  const [shared, setShared] = useState(false);
  if (!w) return <ErrorBlock error={new Error('missing worker profile')} />;

  const url = `${window.location.origin}/w/${w.publicId}`;

  async function share() {
    if (!w) return;
    const text = c.shareText(me.name, TRADE_LABEL[w.trade][lang]);
    try {
      if (navigator.share) await navigator.share({ title: 'Hunar Card', text, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
    } catch (err) {
      // Closing the share sheet throws AbortError; that is not a failure to report.
      if (!(err instanceof DOMException && err.name === 'AbortError')) setShared(false);
    }
  }

  return (
    <div className="content-page">
      <h1 className="page-title">{c.title}</h1>
      <p className="page-description">{c.sub}</p>
      <div className="page-grid">
        <HunarCard
          person={{ name: me.name, trade: w.trade, experience: w.experience, naka: w.naka, city: w.city, publicId: w.publicId, stats: w.stats }}
          qrUrl={url}
        />
        <section>
          <WorkRecord stats={w.stats} dayRate={w.dayRate} available={w.available} memberSince={me.createdAt} />
          <div className="flex flex-wrap gap-3 mt-5">
            <Button onClick={() => void share()}>
              <Share2 />
              {c.share}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              {c.edit}
            </Button>
            <Button asChild variant="ghost">
              <Link to="/w/$publicId" params={{ publicId: w.publicId }}>
                <ExternalLink />
                {c.openPublic}
              </Link>
            </Button>
          </div>
          {shared && (
            <p role="status" className="notice mt-4">
              {c.shared}
            </p>
          )}
        </section>
      </div>
      {card.isLoading ? <LoadingBlock /> : card.data ? <Testimonials reviews={card.data.reviews} /> : null}
      {editOpen && <EditProfile me={me} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

function EditProfile({ me, onClose }: { me: Me; onClose: () => void }) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const update = useUpdateMe();
  const w = me.worker;
  const [name, setName] = useState(me.name);
  const [trade, setTrade] = useState<Trade>(w?.trade ?? 'plumbing');
  const [experience, setExperience] = useState<Experience>(w?.experience ?? '3-10');
  const [naka, setNaka] = useState(w?.naka ?? '');
  const [city, setCity] = useState(w?.city ?? '');
  const [rateMin, setRateMin] = useState(w?.dayRate ? String(w.dayRate.min) : '');
  const [rateMax, setRateMax] = useState(w?.dayRate ? String(w.dayRate.max) : '');

  const min = Number(rateMin);
  const max = Number(rateMax);
  const hasRate = rateMin !== '' || rateMax !== '';
  const rateValid = !hasRate || (Number.isInteger(min) && min >= 100 && Number.isInteger(max) && max >= min && max <= 20000);
  const valid = name.trim().length >= 2 && naka.trim().length >= 2 && city.trim().length >= 2 && rateValid;

  function save() {
    update.mutate(
      {
        name: name.trim(),
        worker: { trade, experience, naka: naka.trim(), city: city.trim(), dayRate: hasRate ? { min, max } : null },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="modal-scroll">
        <DialogTitle>{c.editTitle}</DialogTitle>
        <DialogDescription>{c.editSub}</DialogDescription>
        <label className="field">
          <span>{c.name}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <div className="field">
          <span>{c.trade}</span>
          <div className="choice-grid" role="radiogroup" aria-label={c.trade}>
            {TRADES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={trade === t} className="choice" onClick={() => setTrade(t)}>
                <TradeIcon trade={t} size={16} />
                {TRADE_LABEL[t][lang]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>{c.experience}</span>
          <div className="chip-row" role="radiogroup" aria-label={c.experience}>
            {EXPERIENCE.map((x) => (
              <button key={x} type="button" role="radio" aria-checked={experience === x} className="chip" onClick={() => setExperience(x)}>
                {EXPERIENCE_LABEL[x][lang]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <label className="field">
            <span>{c.naka}</span>
            <input value={naka} onChange={(e) => setNaka(e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            <span>{c.city}</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
          </label>
        </div>
        <div className="field">
          <span>{c.dayRate}</span>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" inputMode="numeric" min={100} placeholder={c.min} aria-label={c.min} value={rateMin} onChange={(e) => setRateMin(e.target.value)} />
            <input type="number" inputMode="numeric" min={100} placeholder={c.max} aria-label={c.max} value={rateMax} onChange={(e) => setRateMax(e.target.value)} />
          </div>
        </div>
        {update.isError && <Notice tone="error">{errorText(update.error, lang)}</Notice>}
        <Button disabled={!valid || update.isPending} onClick={save}>
          {c.save}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
