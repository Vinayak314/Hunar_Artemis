import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowUpRight, ChevronDown, FileCheck, Phone, ShieldCheck, Share2 } from 'lucide-react';
import { Notice, usePageTitle } from '@/components/common';
import { HunarShell } from '@/components/hunar-shell';
import { Button } from '@/components/ui/button';
import { CHECKED_ON, evaluateFit, LEGAL_AID, SCHEMES, type EligibilityAnswers, type Fit, type Scheme } from '@/content/schemes';
import { formatDate } from '@/lib/format';
import { TRADE_LABEL, useLang } from '@/lib/i18n';
import { meQuery } from '@/lib/queries';
import { TRADES, type Lang, type Trade } from '@/lib/types';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/rights')({ component: Rights });

const COPY = {
  en: {
    title: 'Your rights, with you',
    sub: 'Rights Hub: welfare schemes, the papers you need, and what to do when wages are not paid.',
    disclaimer: 'General information, not a decision on your eligibility and not legal advice. Rules and amounts change, so always confirm on the official site before you apply.',
    checked: (d: string) => `Information checked on ${d} from official government sources.`,
    quickTitle: 'Which schemes may fit me?',
    quickSub: 'Answer a few questions. Nothing is saved or sent anywhere.',
    age: 'Your age',
    trade: 'Your main skill',
    income: 'Do you earn ₹15,000 a month or less?',
    formal: 'Are you an EPFO or ESIC member, or do you pay income tax?',
    site: 'Have you worked more than 90 days at building or construction sites in the last year?',
    yes: 'Yes',
    no: 'No',
    fit: { likely: 'May fit you', unlikely: 'Probably not', check: 'Check eligibility' } as Record<Fit, string>,
    forTrade: 'Common for your trade',
    summaryHide: 'Hide details',
    details: 'Who can join and papers needed',
    who: 'Who can join',
    docs: 'Papers to keep ready',
    official: 'Official website',
    call: 'Call',
    onlyOfficial: 'Submit documents only through the official website or office. Hunar never asks for your Aadhaar or bank details.',
    wagesTitle: 'Wages not paid?',
    wagesSub: 'You did the work, you have a right to the pay you agreed. Take these steps in order.',
    steps: [
      'Keep proof: the agreed amount, messages, photos of the finished work, and names of people who saw it.',
      'Send a polite written request with the amount and ask for a payment date. You can prepare one below.',
      'If it is still unpaid, ask the labour office in your area how to file a complaint for unpaid wages.',
      'Free legal help: call the NALSA helpline or ask at your District Legal Services Authority.',
    ],
    draftTitle: 'Prepare a payment request',
    customer: 'Customer name',
    amount: 'Amount owed (₹)',
    work: 'Work done (optional)',
    workPlaceholder: 'e.g. Fixed kitchen tap on 12 October',
    prepare: 'Prepare message',
    draftLabel: 'Your message',
    share: 'Share or copy',
    copied: 'Message copied.',
    legalAid: 'Free legal aid (NALSA)',
    letter: (name: string, amount: string, work: string) =>
      `Hello ${name}, my work${work ? ` (${work})` : ''} is finished. As we agreed, ₹${amount} is still pending. Please tell me the date you will pay. Thank you.`,
  },
  hi: {
    title: 'आपके हक़, आपके साथ',
    sub: 'अधिकार साथी: सरकारी योजनाएँ, ज़रूरी कागज़, और मज़दूरी न मिले तो क्या करें।',
    disclaimer: 'यह सामान्य जानकारी है, आपकी पात्रता का फ़ैसला या कानूनी सलाह नहीं। नियम और रकम बदलते रहते हैं, इसलिए आवेदन से पहले आधिकारिक साइट पर ज़रूर जाँचें।',
    checked: (d: string) => `जानकारी ${d} को सरकारी स्रोतों से जाँची गई।`,
    quickTitle: 'मेरे लिए कौन सी योजनाएँ हो सकती हैं?',
    quickSub: 'कुछ सवालों के जवाब दें। कुछ भी सेव या कहीं भेजा नहीं जाता।',
    age: 'आपकी उम्र',
    trade: 'आपका मुख्य हुनर',
    income: 'क्या आपकी महीने की कमाई ₹15,000 या उससे कम है?',
    formal: 'क्या आप EPFO या ESIC के सदस्य हैं, या आयकर देते हैं?',
    site: 'क्या आपने पिछले साल इमारत या निर्माण स्थलों पर 90 दिन से ज़्यादा काम किया है?',
    yes: 'हाँ',
    no: 'नहीं',
    fit: { likely: 'आपके लिए हो सकती है', unlikely: 'शायद नहीं', check: 'पात्रता जाँचें' } as Record<Fit, string>,
    forTrade: 'आपके हुनर के लिए आम तौर पर',
    summaryHide: 'जानकारी छिपाएँ',
    details: 'कौन जुड़ सकता है और कौन से कागज़ चाहिए',
    who: 'कौन जुड़ सकता है',
    docs: 'ये कागज़ तैयार रखें',
    official: 'आधिकारिक वेबसाइट',
    call: 'फ़ोन करें',
    onlyOfficial: 'कागज़ात सिर्फ़ आधिकारिक वेबसाइट या दफ़्तर में ही जमा करें। हुनर कभी आपका आधार या बैंक की जानकारी नहीं माँगता।',
    wagesTitle: 'मज़दूरी नहीं मिली?',
    wagesSub: 'आपने काम किया है, तय की हुई मज़दूरी आपका हक़ है। ये कदम क्रम से उठाएँ।',
    steps: [
      'सबूत रखें: तय रकम, संदेश, पूरे हुए काम की फ़ोटो, और जिन लोगों ने काम देखा उनके नाम।',
      'रकम लिखकर विनम्रता से भुगतान माँगें और तारीख पूछें। नीचे संदेश तैयार कर सकते हैं।',
      'फिर भी पैसे न मिलें तो अपने इलाके के श्रम कार्यालय से पूछें कि बकाया मज़दूरी की शिकायत कैसे करें।',
      'मुफ़्त कानूनी मदद: NALSA हेल्पलाइन पर फ़ोन करें या ज़िला विधिक सेवा प्राधिकरण में पूछें।',
    ],
    draftTitle: 'भुगतान की माँग तैयार करें',
    customer: 'ग्राहक का नाम',
    amount: 'बकाया रकम (₹)',
    work: 'किया हुआ काम (ज़रूरी नहीं)',
    workPlaceholder: 'जैसे: 12 अक्टूबर को रसोई का नल ठीक किया',
    prepare: 'संदेश बनाएँ',
    draftLabel: 'आपका संदेश',
    share: 'भेजें या कॉपी करें',
    copied: 'संदेश कॉपी हो गया।',
    legalAid: 'मुफ़्त कानूनी मदद (NALSA)',
    letter: (name: string, amount: string, work: string) =>
      `नमस्ते ${name}, मेरा काम${work ? ` (${work})` : ''} पूरा हो गया है। हमारी सहमति के अनुसार ₹${amount} का भुगतान बाकी है। कृपया बताएँ कि आप किस तारीख को भुगतान करेंगे। धन्यवाद।`,
  },
  mr: {
    title: 'तुमचे हक्क, तुमच्यासोबत',
    sub: 'हक्क साथी: सरकारी योजना, आवश्यक कागदपत्रे, आणि मजुरी न मिळाल्यास काय करावे.',
    disclaimer: 'ही सामान्य माहिती आहे, तुमच्या पात्रतेचा निर्णय किंवा कायदेशीर सल्ला नाही. नियम आणि रक्कम बदलत असतात, म्हणून अर्ज करण्यापूर्वी अधिकृत साइटवर खात्री करा.',
    checked: (d: string) => `माहिती ${d} रोजी सरकारी स्रोतांवरून तपासली.`,
    quickTitle: 'माझ्यासाठी कोणत्या योजना असू शकतात?',
    quickSub: 'काही प्रश्नांची उत्तरे द्या. काहीही सेव्ह किंवा कुठे पाठवले जात नाही.',
    age: 'तुमचे वय',
    trade: 'तुमचे मुख्य कौशल्य',
    income: 'तुमची महिन्याची कमाई ₹15,000 किंवा कमी आहे का?',
    formal: 'तुम्ही EPFO किंवा ESIC चे सदस्य आहात का, किंवा आयकर भरता का?',
    site: 'गेल्या वर्षात तुम्ही इमारत किंवा बांधकाम ठिकाणी 90 दिवसांपेक्षा जास्त काम केले आहे का?',
    yes: 'हो',
    no: 'नाही',
    fit: { likely: 'तुमच्यासाठी असू शकते', unlikely: 'कदाचित नाही', check: 'पात्रता तपासा' } as Record<Fit, string>,
    forTrade: 'तुमच्या कौशल्यासाठी सहसा',
    summaryHide: 'माहिती लपवा',
    details: 'कोण सामील होऊ शकते आणि कोणती कागदपत्रे हवीत',
    who: 'कोण सामील होऊ शकते',
    docs: 'ही कागदपत्रे तयार ठेवा',
    official: 'अधिकृत वेबसाइट',
    call: 'फोन करा',
    onlyOfficial: 'कागदपत्रे फक्त अधिकृत वेबसाइट किंवा कार्यालयातच द्या. हुनर तुमचा आधार किंवा बँकेची माहिती कधीही मागत नाही.',
    wagesTitle: 'मजुरी मिळाली नाही?',
    wagesSub: 'तुम्ही काम केले आहे, ठरलेली मजुरी तुमचा हक्क आहे. हे टप्पे क्रमाने करा.',
    steps: [
      'पुरावे ठेवा: ठरलेली रक्कम, मेसेज, पूर्ण झालेल्या कामाचे फोटो, आणि काम पाहणाऱ्यांची नावे.',
      'रक्कम लिहून नम्रपणे पैसे मागा आणि तारीख विचारा. खाली मेसेज तयार करू शकता.',
      'तरीही पैसे न मिळाल्यास तुमच्या भागातील कामगार कार्यालयात थकीत मजुरीची तक्रार कशी करायची ते विचारा.',
      'मोफत कायदेशीर मदत: NALSA हेल्पलाइनला फोन करा किंवा जिल्हा विधी सेवा प्राधिकरणात विचारा.',
    ],
    draftTitle: 'पैशांची मागणी तयार करा',
    customer: 'ग्राहकाचे नाव',
    amount: 'थकीत रक्कम (₹)',
    work: 'केलेले काम (ऐच्छिक)',
    workPlaceholder: 'उदा. 12 ऑक्टोबरला स्वयंपाकघरातील नळ दुरुस्त केला',
    prepare: 'मेसेज तयार करा',
    draftLabel: 'तुमचा मेसेज',
    share: 'पाठवा किंवा कॉपी करा',
    copied: 'मेसेज कॉपी झाला.',
    legalAid: 'मोफत कायदेशीर मदत (NALSA)',
    letter: (name: string, amount: string, work: string) =>
      `नमस्कार ${name}, माझे काम${work ? ` (${work})` : ''} पूर्ण झाले आहे. आपल्या ठरल्याप्रमाणे ₹${amount} बाकी आहेत. कृपया तुम्ही कोणत्या तारखेला पैसे द्याल ते सांगा. धन्यवाद.`,
  },
} satisfies Record<Lang, unknown>;

type Copy = (typeof COPY)['en'];

type YesNo = boolean | null;

function Rights() {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  usePageTitle(c.title);
  const me = useQuery(meQuery).data;

  const [ageText, setAgeText] = useState('');
  const [pickedTrade, setPickedTrade] = useState<Trade | null>(null);
  const [lowIncome, setLowIncome] = useState<YesNo>(null);
  const [formal, setFormal] = useState<YesNo>(null);
  const [site, setSite] = useState<YesNo>(null);
  const trade = pickedTrade ?? me?.worker?.trade ?? null;

  const age = ageText.trim() === '' ? null : Number(ageText);
  const answers: EligibilityAnswers = {
    age: age !== null && Number.isInteger(age) && age >= 10 && age <= 100 ? age : null,
    trade,
    lowIncome,
    formalOrTaxpayer: formal,
    siteWork90: site,
  };
  const answered = answers.age !== null || trade !== null || lowIncome !== null || formal !== null || site !== null;

  const ordered = useMemo(() => {
    const rank = (s: Scheme) => (trade && s.forTrades?.includes(trade) ? 0 : 1);
    return [...SCHEMES].sort((a, b) => rank(a) - rank(b));
  }, [trade]);

  return (
    <HunarShell>
      <div className="content-page">
        <ShieldCheck className="text-primary mb-4" size={34} />
        <h1 className="page-title">{c.title}</h1>
        <p className="page-description">{c.sub}</p>
        <Notice tone="warning">{c.disclaimer}</Notice>
        <p className="text-xs text-muted-foreground mt-2">{c.checked(formatDate(CHECKED_ON, lang))}</p>

        <section className="panel mt-6">
          <h2 className="section-title">{c.quickTitle}</h2>
          <p className="section-sub">{c.quickSub}</p>
          <div className="grid sm:grid-cols-2 gap-x-6">
            <label className="field">
              <span>{c.age}</span>
              <input type="number" inputMode="numeric" min={10} max={100} value={ageText} onChange={(e) => setAgeText(e.target.value)} />
            </label>
            <div className="field">
              <span>{c.trade}</span>
              <div className="chip-row" role="radiogroup" aria-label={c.trade}>
                {TRADES.map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={trade === t} className="chip" onClick={() => setPickedTrade(t)}>
                    {TRADE_LABEL[t][lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <YesNoField label={c.income} value={lowIncome} onChange={setLowIncome} c={c} />
          <YesNoField label={c.formal} value={formal} onChange={setFormal} c={c} />
          <YesNoField label={c.site} value={site} onChange={setSite} c={c} />
        </section>

        <div className="mt-4">
          {ordered.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              lang={lang}
              c={c}
              fit={answered ? evaluateFit(scheme.id, answers) : null}
              relevant={Boolean(trade && scheme.forTrades?.includes(trade))}
            />
          ))}
        </div>

        <WagesHelper lang={lang} c={c} />
      </div>
    </HunarShell>
  );
}

function YesNoField({ label, value, onChange, c }: { label: string; value: YesNo; onChange: (v: YesNo) => void; c: Copy }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chip-row" role="radiogroup" aria-label={label}>
        <button type="button" role="radio" aria-checked={value === true} className="chip" onClick={() => onChange(value === true ? null : true)}>
          {c.yes}
        </button>
        <button type="button" role="radio" aria-checked={value === false} className="chip" onClick={() => onChange(value === false ? null : false)}>
          {c.no}
        </button>
      </div>
    </div>
  );
}

const FIT_CLASS: Record<Fit, string> = { likely: 'done', unlikely: 'cancelled', check: 'open' };

function SchemeCard({ scheme, lang, c, fit, relevant }: { scheme: Scheme; lang: Lang; c: Copy; fit: Fit | null; relevant: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = `scheme-${scheme.id}`;
  return (
    <section className="scheme">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2>{scheme.name[lang]}</h2>
        <div className="flex flex-wrap gap-2">
          {relevant && <span className="status-pill">{c.forTrade}</span>}
          {fit && <span className={cn('status-pill', FIT_CLASS[fit])}>{c.fit[fit]}</span>}
        </div>
      </div>
      <p>{scheme.summary[lang]}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          <FileCheck />
          {open ? c.summaryHide : c.details}
          <ChevronDown className={open ? 'rotate-180' : ''} />
        </Button>
        <Button asChild variant="ghost">
          <a href={scheme.link} target="_blank" rel="noreferrer noopener">
            {c.official} <ArrowUpRight />
          </a>
        </Button>
        {scheme.helpline && (
          <Button asChild variant="ghost">
            <a href={`tel:${scheme.helpline.number.replace(/[^\d+]/g, '')}`}>
              <Phone />
              {c.call} {scheme.helpline.number}
              {scheme.helpline.hours ? ` (${scheme.helpline.hours})` : ''}
            </a>
          </Button>
        )}
      </div>
      {open && (
        <div id={panelId} className="grid sm:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-semibold text-sm mb-2">{c.who}</h3>
            <ul className="list-disc ml-5 text-sm leading-7">
              {scheme.who[lang].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-2">{c.docs}</h3>
            <ul className="list-disc ml-5 text-sm leading-7">
              {scheme.docs[lang].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Notice tone="warning" className="mt-3">
              {c.onlyOfficial}
            </Notice>
          </div>
        </div>
      )}
    </section>
  );
}

function WagesHelper({ lang, c }: { lang: Lang; c: Copy }) {
  const [customer, setCustomer] = useState('');
  const [amount, setAmount] = useState('');
  const [work, setWork] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const amountOk = Number.isInteger(Number(amount)) && Number(amount) > 0;

  async function share() {
    if (!message) return;
    try {
      if (navigator.share) await navigator.share({ text: message });
      else await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) setCopied(false);
    }
  }

  return (
    <section className="scheme">
      <h2>{c.wagesTitle}</h2>
      <p>{c.wagesSub}</p>
      <ol className="list-decimal ml-5 text-sm leading-7 mb-4">
        {c.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <Button asChild variant="outline">
        <a href={`tel:${LEGAL_AID.helpline}`}>
          <Phone />
          {c.legalAid}: {LEGAL_AID.helpline}
        </a>
      </Button>

      <div className="panel mt-5">
        <h3 className="font-semibold">{c.draftTitle}</h3>
        <label className="field">
          <span>{c.customer}</span>
          <input value={customer} onChange={(e) => { setCustomer(e.target.value); setMessage(null); }} maxLength={60} />
        </label>
        <label className="field">
          <span>{c.amount}</span>
          <input type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => { setAmount(e.target.value); setMessage(null); }} />
        </label>
        <label className="field">
          <span>{c.work}</span>
          <input value={work} placeholder={c.workPlaceholder} onChange={(e) => { setWork(e.target.value); setMessage(null); }} maxLength={120} />
        </label>
        <Button
          disabled={!customer.trim() || !amountOk}
          onClick={() => {
            setCopied(false);
            setMessage(c.letter(customer.trim(), Number(amount).toLocaleString('en-IN'), work.trim()));
          }}
        >
          {c.prepare}
        </Button>
        {message && (
          <div className="mt-4 grid gap-3" aria-live="polite">
            <p className="text-xs text-muted-foreground">{c.draftLabel}</p>
            <div className="notice" lang={lang}>
              {message}
            </div>
            <Button variant="outline" className="justify-self-start" onClick={() => void share()}>
              <Share2 />
              {c.share}
            </Button>
            {copied && (
              <p role="status" className="text-xs text-success">
                {c.copied}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
