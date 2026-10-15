import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowRight, HandHeart, Hammer } from 'lucide-react';
import { Notice, TradeIcon, usePageTitle } from '@/components/common';
import { Brand, homeFor, LanguageControl } from '@/components/hunar-shell';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { errorText, EXPERIENCE_LABEL, TRADE_LABEL, useLang } from '@/lib/i18n';
import { meQuery } from '@/lib/queries';
import { safeRedirect } from '@/lib/session';
import { EXPERIENCE, TRADES, type Experience, type Lang, type Me, type Role, type Trade } from '@/lib/types';

type LoginSearch = { role?: Role; redirect?: string };

export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    role: s.role === 'worker' || s.role === 'customer' ? s.role : undefined,
    redirect: typeof s.redirect === 'string' ? s.redirect : undefined,
  }),
  component: Login,
});

const COPY = {
  en: {
    title: 'Welcome to Hunar',
    sub: 'Sign in with your mobile number.',
    phone: 'Your mobile number',
    phoneHint: 'Your number is shared only with the person you work with, after a job is accepted.',
    continue: 'Continue',
    newHere: 'New on Hunar? Tell us a little about yourself.',
    iAm: 'I am a',
    worker: 'Worker',
    workerSub: 'I want work',
    customer: 'Customer',
    customerSub: 'I want work done',
    name: 'Your name',
    trade: 'Your main skill',
    experience: 'Experience',
    naka: 'Your naka or area',
    nakaHint: 'Where you usually wait for work, for example Karve Road Naka.',
    city: 'City',
    create: 'Create my account',
    otherNumber: 'Use a different number',
    badPhone: 'Enter a 10-digit mobile number.',
    badName: 'Enter your name.',
    pickTrade: 'Choose your skill.',
    badPlace: 'Enter your naka and city.',
  },
  hi: {
    title: 'हुनर में आपका स्वागत है',
    sub: 'अपने मोबाइल नंबर से शुरू करें।',
    phone: 'आपका मोबाइल नंबर',
    phoneHint: 'आपका नंबर सिर्फ़ उसी को दिखेगा जिसके साथ आप काम करेंगे, काम स्वीकार होने के बाद।',
    continue: 'आगे बढ़ें',
    newHere: 'हुनर पर नए हैं? अपने बारे में थोड़ा बताइए।',
    iAm: 'मैं हूँ',
    worker: 'कारीगर',
    workerSub: 'मुझे काम चाहिए',
    customer: 'ग्राहक',
    customerSub: 'मुझे काम करवाना है',
    name: 'आपका नाम',
    trade: 'आपका मुख्य हुनर',
    experience: 'अनुभव',
    naka: 'आपका नाका या इलाका',
    nakaHint: 'जहाँ आप आमतौर पर काम के लिए खड़े होते हैं, जैसे कर्वे रोड नाका।',
    city: 'शहर',
    create: 'मेरा खाता बनाएँ',
    otherNumber: 'दूसरा नंबर डालें',
    badPhone: '10 अंकों का मोबाइल नंबर डालें।',
    badName: 'अपना नाम लिखें।',
    pickTrade: 'अपना हुनर चुनें।',
    badPlace: 'अपना नाका और शहर लिखें।',
  },
  mr: {
    title: 'हुनरमध्ये तुमचे स्वागत आहे',
    sub: 'तुमच्या मोबाइल नंबरने सुरू करा.',
    phone: 'तुमचा मोबाइल नंबर',
    phoneHint: 'तुमचा नंबर फक्त तुम्ही ज्यांच्यासोबत काम कराल त्यांनाच, काम स्वीकारल्यानंतर दिसेल.',
    continue: 'पुढे चला',
    newHere: 'हुनरवर नवीन आहात? स्वतःबद्दल थोडं सांगा.',
    iAm: 'मी आहे',
    worker: 'कारागीर',
    workerSub: 'मला काम हवं आहे',
    customer: 'ग्राहक',
    customerSub: 'मला काम करून घ्यायचं आहे',
    name: 'तुमचे नाव',
    trade: 'तुमचे मुख्य कौशल्य',
    experience: 'अनुभव',
    naka: 'तुमचा नाका किंवा भाग',
    nakaHint: 'जिथे तुम्ही सहसा कामासाठी थांबता, उदा. कर्वे रोड नाका.',
    city: 'शहर',
    create: 'माझे खाते तयार करा',
    otherNumber: 'दुसरा नंबर टाका',
    badPhone: '10 अंकी मोबाइल नंबर टाका.',
    badName: 'तुमचे नाव लिहा.',
    pickTrade: 'तुमचे कौशल्य निवडा.',
    badPlace: 'तुमचा नाका आणि शहर लिहा.',
  },
} satisfies Record<Lang, unknown>;

const tenDigits = (value: string) => {
  let d = value.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
};

function Login() {
  const search = Route.useSearch();
  const { lang, setLang } = useLang();
  const t = COPY[lang];
  usePageTitle(t.title);
  const qc = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const me = useQuery(meQuery).data;

  const [step, setStep] = useState<'phone' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>(search.role ?? 'worker');
  const [name, setName] = useState('');
  const [trade, setTrade] = useState<Trade | null>(null);
  const [experience, setExperience] = useState<Experience>('3-10');
  const [naka, setNaka] = useState('');
  const [city, setCity] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function finish(user: Me) {
    qc.setQueryData(meQuery.queryKey, user);
    setLang(user.lang);
    const target = safeRedirect(search.redirect);
    if (target) router.history.push(target);
    else void navigate({ to: homeFor(user) });
  }

  useEffect(() => {
    if (me) void navigate({ to: homeFor(me), replace: true });
  }, [me, navigate]);

  async function submitPhone(e: FormEvent) {
    e.preventDefault();
    const clean = tenDigits(phone);
    if (!clean) return setProblem(t.badPhone);
    setProblem(null);
    setBusy(true);
    try {
      const { user } = await api<{ user: Me }>('POST', '/api/auth/login', { phone: clean });
      finish(user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'no_account') setStep('register');
      else setProblem(errorText(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(e: FormEvent) {
    e.preventDefault();
    const clean = tenDigits(phone);
    if (!clean) return setProblem(t.badPhone);
    if (name.trim().length < 2) return setProblem(t.badName);
    if (role === 'worker' && !trade) return setProblem(t.pickTrade);
    if (role === 'worker' && (naka.trim().length < 2 || city.trim().length < 2)) return setProblem(t.badPlace);
    setProblem(null);
    setBusy(true);
    try {
      const { user } = await api<{ user: Me }>('POST', '/api/auth/register', {
        phone: clean,
        name: name.trim(),
        role,
        lang,
        worker: role === 'worker' ? { trade, experience, naka: naka.trim(), city: city.trim() } : undefined,
      });
      finish(user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'phone_taken') setStep('phone');
      setProblem(errorText(err, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="header-inner">
          <Brand />
          <LanguageControl />
        </div>
      </header>
      <main className="main-wrap w-full">
        <div className="content-page max-w-xl">
          <h1 className="page-title">{t.title}</h1>
          <p className="page-description">{step === 'phone' ? t.sub : t.newHere}</p>

          {step === 'phone' ? (
            <form onSubmit={submitPhone} noValidate>
              <label className="field">
                <span>{t.phone}</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
                <span className="hint">{t.phoneHint}</span>
              </label>
              {problem && <Notice tone="error" className="mb-4">{problem}</Notice>}
              <Button type="submit" size="lg" disabled={busy}>
                {t.continue}
                <ArrowRight />
              </Button>
            </form>
          ) : (
            <form onSubmit={submitRegister} noValidate>
              <p className="text-sm mb-2">
                +91 {(() => {
                  const clean = tenDigits(phone);
                  return clean ? `${clean.slice(0, 5)} ${clean.slice(5)}` : phone;
                })()}{' '}
                <button type="button" className="text-primary underline ml-2" onClick={() => setStep('phone')}>
                  {t.otherNumber}
                </button>
              </p>

              <div className="field">
                <span>{t.iAm}</span>
                <div className="choice-grid" role="radiogroup" aria-label={t.iAm}>
                  <button type="button" role="radio" aria-checked={role === 'worker'} className="choice" onClick={() => setRole('worker')}>
                    <span className="trade-icon">
                      <Hammer size={18} />
                    </span>
                    <span>
                      {t.worker}
                      <br />
                      <small className="text-muted-foreground font-normal">{t.workerSub}</small>
                    </span>
                  </button>
                  <button type="button" role="radio" aria-checked={role === 'customer'} className="choice" onClick={() => setRole('customer')}>
                    <span className="trade-icon">
                      <HandHeart size={18} />
                    </span>
                    <span>
                      {t.customer}
                      <br />
                      <small className="text-muted-foreground font-normal">{t.customerSub}</small>
                    </span>
                  </button>
                </div>
              </div>

              <label className="field">
                <span>{t.name}</span>
                <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </label>

              {role === 'worker' && (
                <>
                  <div className="field">
                    <span>{t.trade}</span>
                    <div className="choice-grid" role="radiogroup" aria-label={t.trade}>
                      {TRADES.map((tr) => (
                        <button
                          key={tr}
                          type="button"
                          role="radio"
                          aria-checked={trade === tr}
                          className="choice"
                          onClick={() => setTrade(tr)}
                        >
                          <TradeIcon trade={tr} size={18} />
                          {TRADE_LABEL[tr][lang]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <span>{t.experience}</span>
                    <div className="chip-row" role="radiogroup" aria-label={t.experience}>
                      {EXPERIENCE.map((x) => (
                        <button key={x} type="button" role="radio" aria-checked={experience === x} className="chip" onClick={() => setExperience(x)}>
                          {EXPERIENCE_LABEL[x][lang]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-4">
                    <label className="field">
                      <span>{t.naka}</span>
                      <input value={naka} onChange={(e) => setNaka(e.target.value)} maxLength={80} />
                      <span className="hint">{t.nakaHint}</span>
                    </label>
                    <label className="field">
                      <span>{t.city}</span>
                      <input autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
                    </label>
                  </div>
                </>
              )}

              {problem && <Notice tone="error" className="mb-4">{problem}</Notice>}
              <Button type="submit" size="lg" disabled={busy}>
                {t.create}
                <ArrowRight />
              </Button>
            </form>
          )}
          <p className="mt-8 text-xs text-muted-foreground">
            <Link to="/" className="underline">
              hunar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
