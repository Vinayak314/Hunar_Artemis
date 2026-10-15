import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, LocateFixed, Plus, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { Notice, TradeIcon } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formToNewJob, type FormInitial } from '@/lib/chat';
import { getCurrentPosition, type Coords } from '@/lib/device';
import { totalPay } from '@/lib/format';
import { errorText, PAYMENT_METHOD_LABEL, PAYMENT_WHEN_LABEL, TRADE_LABEL, useLang } from '@/lib/i18n';
import { useCreateJob, usePayCheck } from '@/lib/queries';
import {
  PAYMENT_METHODS,
  PAYMENT_WHEN,
  TRADES,
  type Job,
  type Lang,
  type PaymentMethod,
  type PaymentWhen,
  type PayUnit,
  type Trade,
} from '@/lib/types';

const COPY = {
  en: {
    describe: 'What needs doing?',
    describeHint: 'Write it the way you would say it. Any language is fine.',
    trade: 'Skill needed',
    pay: 'Pay for the worker (₹)',
    total: 'For the whole job',
    perDay: 'Per day',
    days: 'Number of days',
    when: 'When?',
    whenPlaceholder: 'Today, 3 PM',
    duration: 'How long will it take? (optional)',
    durationPlaceholder: '2 hours',
    locality: 'Area or locality',
    city: 'City',
    addLocation: 'Add my current location',
    locationHint: 'Nearby workers see the job first. Only the distance is shown to them.',
    locationAdded: 'Location added',
    locationFailed: 'Could not get your location. The area name is enough.',
    payWhen: 'When will you pay? (required)',
    payMethod: 'How will you pay?',
    advance: 'Advance amount (₹)',
    materials: 'Materials are paid separately. Never ask a worker to pay a fee to get work.',
    lowPay: 'This may be low for this work. Discuss a fair rate and material costs with the worker. You can still post.',
    submit: 'Post job',
    posting: 'Posting...',
    fix: 'Please complete:',
    back: 'Back to the assistant',
    missing: {
      description: 'what needs doing',
      trade: 'the skill needed',
      pay: 'the pay amount',
      when: 'when',
      place: 'area and city',
      payWhen: 'when you will pay',
      advance: 'an advance smaller than the total',
    },
  },
  hi: {
    describe: 'क्या काम करवाना है?',
    describeHint: 'जैसे बोलते हैं वैसे ही लिखें। किसी भी भाषा में लिख सकते हैं।',
    trade: 'कौन सा कारीगर चाहिए',
    pay: 'कारीगर को कितने पैसे (₹)',
    total: 'पूरे काम के लिए',
    perDay: 'रोज़ के हिसाब से',
    days: 'कितने दिन',
    when: 'कब?',
    whenPlaceholder: 'आज, दोपहर 3 बजे',
    duration: 'कितना समय लगेगा? (ज़रूरी नहीं)',
    durationPlaceholder: '2 घंटे',
    locality: 'इलाका',
    city: 'शहर',
    addLocation: 'मेरी अभी की लोकेशन जोड़ें',
    locationHint: 'पास के कारीगर काम पहले देखेंगे। उन्हें सिर्फ़ दूरी दिखेगी।',
    locationAdded: 'लोकेशन जुड़ गई',
    locationFailed: 'लोकेशन नहीं मिली। इलाके का नाम काफ़ी है।',
    payWhen: 'पैसे कब देंगे? (ज़रूरी)',
    payMethod: 'पैसे कैसे देंगे?',
    advance: 'पहले कितने पैसे देंगे (₹)',
    materials: 'सामान का खर्च अलग से दें। काम देने के बदले कारीगर से कभी फीस न माँगें।',
    lowPay: 'इस काम के लिए यह रकम कम हो सकती है। कारीगर से सही दाम और सामान के खर्च पर बात करें। फिर भी काम डाल सकते हैं।',
    submit: 'काम डालें',
    posting: 'डाला जा रहा है...',
    fix: 'कृपया भरें:',
    back: 'सहायक पर वापस जाएँ',
    missing: {
      description: 'क्या काम है',
      trade: 'कौन सा कारीगर',
      pay: 'पैसे',
      when: 'कब',
      place: 'इलाका और शहर',
      payWhen: 'पैसे कब देंगे',
      advance: 'कुल रकम से कम एडवांस',
    },
  },
  mr: {
    describe: 'काय काम करायचे आहे?',
    describeHint: 'जसे बोलता तसेच लिहा. कोणत्याही भाषेत लिहू शकता.',
    trade: 'कोणता कारागीर हवा',
    pay: 'कारागिराला किती पैसे (₹)',
    total: 'पूर्ण कामासाठी',
    perDay: 'रोजच्या हिशोबाने',
    days: 'किती दिवस',
    when: 'कधी?',
    whenPlaceholder: 'आज, दुपारी 3 वाजता',
    duration: 'किती वेळ लागेल? (ऐच्छिक)',
    durationPlaceholder: '2 तास',
    locality: 'भाग',
    city: 'शहर',
    addLocation: 'माझे सध्याचे लोकेशन जोडा',
    locationHint: 'जवळचे कारागीर काम आधी पाहतील. त्यांना फक्त अंतर दिसेल.',
    locationAdded: 'लोकेशन जोडले',
    locationFailed: 'लोकेशन मिळाले नाही. भागाचे नाव पुरेसे आहे.',
    payWhen: 'पैसे कधी द्याल? (आवश्यक)',
    payMethod: 'पैसे कसे द्याल?',
    advance: 'आधी किती पैसे द्याल (₹)',
    materials: 'साहित्याचा खर्च वेगळा द्या. काम देण्यासाठी कारागिराकडून कधीही फी मागू नका.',
    lowPay: 'या कामासाठी ही रक्कम कमी असू शकते. कारागिराशी योग्य दर आणि साहित्याच्या खर्चावर बोला. तरीही काम टाकू शकता.',
    submit: 'काम टाका',
    posting: 'टाकत आहे...',
    fix: 'कृपया भरा:',
    back: 'मदतनीसाकडे परत जा',
    missing: {
      description: 'काय काम आहे',
      trade: 'कोणता कारागीर',
      pay: 'पैसे',
      when: 'कधी',
      place: 'भाग आणि शहर',
      payWhen: 'पैसे कधी द्याल',
      advance: 'एकूण रकमेपेक्षा कमी आगाऊ रक्कम',
    },
  },
} satisfies Record<Lang, unknown>;

const asInt = (s: string) => (s.trim() === '' ? NaN : Number(s));

/** The manual way to post a job: used when the assistant cannot finish, and to edit its ticket. */
export function JobForm({ initial = {}, onPosted, onBack }: { initial?: FormInitial; onPosted: (job: Job) => void; onBack?: () => void }) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const create = useCreateJob();

  const [description, setDescription] = useState(initial.description ?? '');
  const [trade, setTrade] = useState<Trade | null>(initial.trade ?? null);
  const [amount, setAmount] = useState(initial.payAmount ? String(initial.payAmount) : '');
  const [unit, setUnit] = useState<PayUnit>(initial.payUnit ?? 'total');
  const [days, setDays] = useState(initial.payDays ? String(initial.payDays) : '');
  const [when, setWhen] = useState(initial.when ?? '');
  const [duration, setDuration] = useState(initial.duration ?? '');
  const [locality, setLocality] = useState(initial.locality ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [coords, setCoords] = useState<Coords | null>(initial.location ?? null);
  const [locFailed, setLocFailed] = useState(false);
  const [payWhen, setPayWhen] = useState<PaymentWhen | null>(initial.payWhen ?? null);
  const [method, setMethod] = useState<PaymentMethod>(initial.payMethod ?? 'either');
  const [advance, setAdvance] = useState(initial.advance ? String(initial.advance) : '');
  const [problems, setProblems] = useState<string[]>([]);

  const payAmount = asInt(amount);
  const dayCount = unit === 'per_day' && days ? asInt(days) : undefined;
  const payCheck = usePayCheck(trade, payAmount, unit, dayCount);

  async function addLocation() {
    setLocFailed(false);
    try {
      setCoords(await getCurrentPosition());
    } catch {
      setLocFailed(true);
    }
  }

  function validate(): string[] {
    const m = c.missing;
    const out: string[] = [];
    if (description.trim().length < 5) out.push(m.description);
    if (!trade) out.push(m.trade);
    if (!Number.isInteger(payAmount) || payAmount < 1) out.push(m.pay);
    if (when.trim().length < 2) out.push(m.when);
    if (locality.trim().length < 2 || city.trim().length < 2) out.push(m.place);
    if (!payWhen) out.push(m.payWhen);
    if (payWhen === 'advance_part') {
      const adv = asInt(advance);
      const total = totalPay({ amount: payAmount, unit, ...(dayCount ? { days: dayCount } : {}) });
      if (!Number.isInteger(adv) || adv < 1 || adv >= total) out.push(m.advance);
    }
    return out;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate();
    setProblems(found);
    if (found.length || !trade || !payWhen) return;
    create.mutate(
      formToNewJob({
        trade,
        description: description.trim(),
        title: initial.title,
        summary: initial.summary,
        locality: locality.trim(),
        city: city.trim(),
        location: coords,
        when: when.trim(),
        duration: duration.trim(),
        payAmount,
        payUnit: unit,
        payDays: dayCount,
        payWhen,
        payMethod: method,
        advance: payWhen === 'advance_part' ? asInt(advance) : undefined,
      }),
      { onSuccess: onPosted },
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {onBack && (
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft />
          {c.back}
        </Button>
      )}
      <label className="field">
        <span>{c.describe}</span>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        <span className="hint">{c.describeHint}</span>
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
        <span>{c.pay}</span>
        <div className="chip-row" role="radiogroup" aria-label={c.pay}>
          {(['total', 'per_day'] as const).map((u) => (
            <button key={u} type="button" role="radio" aria-checked={unit === u} className="chip" onClick={() => setUnit(u)}>
              {u === 'total' ? c.total : c.perDay}
            </button>
          ))}
        </div>
        <div className={unit === 'per_day' ? 'grid grid-cols-2 gap-4' : ''}>
          <input type="number" inputMode="numeric" min={1} aria-label={c.pay} value={amount} onChange={(e) => setAmount(e.target.value)} />
          {unit === 'per_day' && (
            <input type="number" inputMode="numeric" min={1} placeholder={c.days} aria-label={c.days} value={days} onChange={(e) => setDays(e.target.value)} />
          )}
        </div>
      </div>
      {payCheck.data === 'low' && (
        <p className="notice warning-notice">
          <TriangleAlert size={14} className="inline mr-2" />
          {c.lowPay}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-x-4">
        <label className="field">
          <span>{c.when}</span>
          <input placeholder={c.whenPlaceholder} value={when} onChange={(e) => setWhen(e.target.value)} maxLength={80} />
        </label>
        <label className="field">
          <span>{c.duration}</span>
          <input placeholder={c.durationPlaceholder} value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={60} />
        </label>
        <label className="field">
          <span>{c.locality}</span>
          <input value={locality} onChange={(e) => setLocality(e.target.value)} maxLength={80} />
        </label>
        <label className="field">
          <span>{c.city}</span>
          <input autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
        </label>
      </div>

      <div className="field">
        {coords ? (
          <span className="text-success flex items-center gap-2">
            <Check size={15} />
            {c.locationAdded}
            <Button type="button" variant="ghost" size="sm" onClick={() => setCoords(null)} aria-label="Remove location">
              <X />
            </Button>
          </span>
        ) : (
          <Button type="button" variant="outline" onClick={() => void addLocation()}>
            <LocateFixed />
            {c.addLocation}
          </Button>
        )}
        <span className="hint">{locFailed ? c.locationFailed : c.locationHint}</span>
      </div>

      <div className="field">
        <span>{c.payWhen}</span>
        <div className="grid gap-2" role="radiogroup" aria-label={c.payWhen}>
          {PAYMENT_WHEN.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={payWhen === p} className="choice" onClick={() => setPayWhen(p)}>
              <ShieldCheck size={16} />
              {PAYMENT_WHEN_LABEL[p][lang]}
            </button>
          ))}
        </div>
      </div>
      {payWhen === 'advance_part' && (
        <label className="field">
          <span>{c.advance}</span>
          <input type="number" inputMode="numeric" min={1} value={advance} onChange={(e) => setAdvance(e.target.value)} />
        </label>
      )}
      <div className="field">
        <span>{c.payMethod}</span>
        <div className="chip-row" role="radiogroup" aria-label={c.payMethod}>
          {PAYMENT_METHODS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={method === m} className="chip" onClick={() => setMethod(m)}>
              {PAYMENT_METHOD_LABEL[m][lang]}
            </button>
          ))}
        </div>
      </div>

      <Notice className="my-4">
        <ShieldCheck size={15} className="inline mr-2" />
        {c.materials}
      </Notice>

      {problems.length > 0 && (
        <Notice tone="error" className="mb-4">
          {c.fix} {problems.join(', ')}
        </Notice>
      )}
      {create.isError && (
        <Notice tone="error" className="mb-4">
          {errorText(create.error, lang)}
        </Notice>
      )}
      <Button type="submit" size="lg" disabled={create.isPending}>
        <Plus />
        {create.isPending ? c.posting : c.submit}
      </Button>
    </form>
  );
}
