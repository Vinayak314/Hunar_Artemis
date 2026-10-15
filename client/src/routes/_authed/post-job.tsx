import { useState } from 'react';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { Check, Plus } from 'lucide-react';
import { Notice, TradeIcon, usePageTitle } from '@/components/common';
import { JobChat } from '@/components/job-chat';
import { JobForm } from '@/components/job-form';
import { Button } from '@/components/ui/button';
import { rememberCity, type FormInitial } from '@/lib/chat';
import { paymentText, payText } from '@/lib/format';
import { localizedText, TRADE_LABEL, useLang } from '@/lib/i18n';
import type { Job, Lang } from '@/lib/types';

export const Route = createFileRoute('/_authed/post-job')({
  beforeLoad: ({ context }) => {
    if (context.me.role !== 'customer') throw redirect({ to: '/worker' });
  },
  component: PostJob,
});

const COPY = {
  en: {
    title: 'Post a job',
    sub: 'Tell the assistant what you need. It asks only what is missing, then makes a clear ticket for the worker.',
    successTitle: 'Your job is live',
    successText: 'Nearby workers can see it now. You will see the worker name and phone number in My jobs as soon as someone accepts.',
    myJobs: 'Go to My jobs',
    another: 'Post another job',
  },
  hi: {
    title: 'काम दें',
    sub: 'सहायक को बताइए क्या चाहिए। वह सिर्फ़ वही पूछता है जो बाकी है, फिर कारीगर के लिए साफ़ टिकट बनाता है।',
    successTitle: 'आपका काम डल गया',
    successText: 'पास के कारीगर इसे अभी देख सकते हैं। कोई स्वीकार करते ही "मेरे दिए काम" में उनका नाम और फ़ोन नंबर दिखेगा।',
    myJobs: 'मेरे दिए काम देखें',
    another: 'एक और काम डालें',
  },
  mr: {
    title: 'काम द्या',
    sub: 'मदतनीसाला सांगा तुम्हाला काय हवे. तो फक्त उरलेली माहिती विचारतो, मग कारागिरासाठी स्पष्ट तिकीट बनवतो.',
    successTitle: 'तुमचे काम टाकले गेले',
    successText: 'जवळचे कारागीर ते आत्ता पाहू शकतात. कोणी स्वीकारताच "मी दिलेली कामे" मध्ये त्यांचे नाव आणि फोन नंबर दिसेल.',
    myJobs: 'मी दिलेली कामे पहा',
    another: 'आणखी एक काम टाका',
  },
} satisfies Record<Lang, unknown>;

function PostJob() {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  usePageTitle(c.title);

  const [mode, setMode] = useState<'chat' | 'form'>('chat');
  const [initial, setInitial] = useState<FormInitial>({});
  const [formKey, setFormKey] = useState(0);
  const [chatKey, setChatKey] = useState(0);
  const [posted, setPosted] = useState<Job | null>(null);

  function handlePosted(job: Job) {
    rememberCity(job.city);
    setPosted(job);
  }

  function toForm(values: FormInitial) {
    setInitial(values);
    setFormKey((k) => k + 1);
    setMode('form');
    window.scrollTo({ top: 0 });
  }

  function another() {
    setPosted(null);
    setMode('chat');
    setChatKey((k) => k + 1);
  }

  if (posted) {
    const title = localizedText(posted.title, lang) || TRADE_LABEL[posted.trade][lang];
    return (
      <div className="content-page max-w-xl">
        <h1 className="page-title">{c.successTitle}</h1>
        <section aria-live="polite" className="grid gap-4">
          <Notice>
            <Check className="inline mr-2" size={16} />
            {c.successText}
          </Notice>
          <div className="panel">
            <div className="flex items-center gap-3">
              <TradeIcon trade={posted.trade} />
              <div>
                <strong>{title}</strong>
                <p className="text-sm text-muted-foreground">
                  {payText(posted.pay, lang)} · {posted.locality}, {posted.city} · {posted.when}
                </p>
              </div>
            </div>
            <p className="text-xs mt-3 text-success">{paymentText(posted.payment, lang)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/my-jobs">{c.myJobs}</Link>
            </Button>
            <Button variant="outline" onClick={another}>
              <Plus />
              {c.another}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="content-page chat-page">
      <h1 className="page-title">{c.title}</h1>
      <p className="page-description">{c.sub}</p>
      {/* The chat stays mounted while the form is open, so going back loses nothing. */}
      <div hidden={mode !== 'chat'}>
        <JobChat key={chatKey} onPosted={handlePosted} onManual={toForm} />
      </div>
      {mode === 'form' && <JobForm key={formKey} initial={initial} onPosted={handlePosted} onBack={() => setMode('chat')} />}
    </div>
  );
}
