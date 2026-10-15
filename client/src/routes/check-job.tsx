import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Notice, usePageTitle } from '@/components/common';
import { HunarShell } from '@/components/hunar-shell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCopy } from '@/lib/i18n';
import { checkListing, type ListingCheck } from '@/lib/trust';
import type { Lang } from '@/lib/types';

export const Route = createFileRoute('/check-job')({ component: CheckJob });

const COPY = {
  en: {
    title: 'Check this job',
    sub: 'Being careful is your strength. Paste a job message to check for common warning signs.',
    label: 'Job message',
    placeholder: 'Paste a WhatsApp message or job listing...',
    check: 'Check message',
    results: 'What to look out for',
    fee: 'It asks for money upfront. Never pay a fee, deposit or registration charge to get a job.',
    privateData: 'It asks for private details. Never share an OTP, PIN, password or bank details. Share Aadhaar only on official government portals.',
    pay: 'The pay is not clear. Confirm the total amount, how you will be paid and when, before you go.',
    clean: 'No common warning signs found. This does not prove the job is safe. Confirm the customer and payment terms before you start.',
    footnote: 'This is a simple rule-based check of the text, not a verification. The decision is yours. Meet in a safe place and tell someone where you are going.',
  },
  hi: {
    title: 'काम की जाँच',
    sub: 'सावधानी आपकी ताकत है। काम का संदेश डालें और आम खतरे के संकेत जाँचें।',
    label: 'काम का संदेश',
    placeholder: 'WhatsApp संदेश या काम का विज्ञापन यहाँ डालें...',
    check: 'जाँच करें',
    results: 'क्या ध्यान रखें',
    fee: 'इसमें पहले पैसे माँगे गए हैं। काम पाने के लिए कभी फीस, जमा राशि या रजिस्ट्रेशन शुल्क न दें।',
    privateData: 'इसमें निजी जानकारी माँगी गई है। OTP, PIN, पासवर्ड या बैंक जानकारी कभी न दें। आधार सिर्फ़ सरकारी पोर्टल पर दें।',
    pay: 'पैसे साफ़ नहीं लिखे हैं। जाने से पहले कुल रकम, कैसे और कब मिलेंगे, यह पक्का करें।',
    clean: 'कोई आम खतरे का संकेत नहीं मिला। इसका मतलब यह नहीं कि काम पूरी तरह सुरक्षित है। शुरू करने से पहले ग्राहक और भुगतान की शर्तें पक्की करें।',
    footnote: 'यह संदेश की एक सामान्य नियम-आधारित जाँच है, पुष्टि नहीं। फ़ैसला आपका है। सुरक्षित जगह पर मिलें और किसी को बताकर जाएँ।',
  },
  mr: {
    title: 'काम तपासा',
    sub: 'सावधगिरी हीच तुमची ताकद. कामाचा मेसेज टाका आणि सामान्य धोक्याच्या खुणा तपासा.',
    label: 'कामाचा मेसेज',
    placeholder: 'WhatsApp मेसेज किंवा कामाची जाहिरात इथे टाका...',
    check: 'तपासा',
    results: 'काय लक्षात ठेवा',
    fee: 'यात आधी पैसे मागितले आहेत. काम मिळवण्यासाठी कधीही फी, डिपॉझिट किंवा नोंदणी शुल्क देऊ नका.',
    privateData: 'यात खाजगी माहिती मागितली आहे. OTP, PIN, पासवर्ड किंवा बँकेची माहिती कधीही देऊ नका. आधार फक्त सरकारी पोर्टलवर द्या.',
    pay: 'पैसे स्पष्ट लिहिलेले नाहीत. जाण्याआधी एकूण रक्कम, कसे आणि कधी मिळतील हे पक्के करा.',
    clean: 'सामान्य धोक्याची खूण आढळली नाही. याचा अर्थ काम पूर्ण सुरक्षित आहे असा नाही. सुरू करण्याआधी ग्राहक आणि पैशांच्या अटी पक्क्या करा.',
    footnote: 'ही मेसेजची साधी नियम-आधारित तपासणी आहे, खात्री नाही. निर्णय तुमचा आहे. सुरक्षित ठिकाणी भेटा आणि कुणाला तरी सांगून जा.',
  },
} satisfies Record<Lang, unknown>;

function CheckJob() {
  const c = useCopy(COPY);
  usePageTitle(c.title);
  const [text, setText] = useState('');
  const [result, setResult] = useState<ListingCheck | null>(null);
  const clean = result && !result.upfrontFee && !result.privateData && !result.missingPay;

  return (
    <HunarShell>
      <div className="content-page max-w-xl">
        <ShieldCheck size={36} className="mb-4 text-primary" />
        <h1 className="page-title">{c.title}</h1>
        <p className="page-description">{c.sub}</p>
        <label className="field" htmlFor="listing">
          <span>{c.label}</span>
        </label>
        <Textarea
          id="listing"
          rows={6}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder={c.placeholder}
        />
        <Button className="mt-4" disabled={!text.trim()} onClick={() => setResult(checkListing(text))}>
          <Search />
          {c.check}
        </Button>
        {result && (
          <section className="mt-6 grid gap-3" aria-live="polite">
            <h2 className="section-title">{c.results}</h2>
            {result.upfrontFee && (
              <Notice tone="warning">
                <TriangleAlert size={15} className="inline mr-2" />
                {c.fee}
              </Notice>
            )}
            {result.privateData && (
              <Notice tone="warning">
                <TriangleAlert size={15} className="inline mr-2" />
                {c.privateData}
              </Notice>
            )}
            {result.missingPay && <Notice tone="warning">{c.pay}</Notice>}
            {clean && <Notice>{c.clean}</Notice>}
            <p className="text-xs text-muted-foreground leading-6">{c.footnote}</p>
          </section>
        )}
      </div>
    </HunarShell>
  );
}
