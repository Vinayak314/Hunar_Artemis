import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  ContactRound,
  Hammer,
  LogIn,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { speak, useNearMe } from '@/lib/device';
import { initials, phoneText } from '@/lib/format';
import { LANG_BUTTON, TRADE_LABEL, useCopy, useLang } from '@/lib/i18n';
import { feedQuery, meQuery, myJobsQuery, useSignOut, useUpdateMe } from '@/lib/queries';
import { LANGS, type Lang, type Me } from '@/lib/types';

const COPY = {
  en: {
    findWork: 'Find work',
    card: 'Hunar Card',
    myWork: 'My work',
    rights: 'Rights Hub',
    check: 'Check a job',
    postJob: 'Post a job',
    myJobs: 'My jobs',
    signIn: 'Sign in',
    signOut: 'Sign out',
    account: 'Your account',
    worker: 'Worker',
    customer: 'Customer',
    notifications: 'Updates',
    openForYou: (n: number, trade: string) => (n === 1 ? `1 open job for ${trade}` : `${n} open jobs for ${trade}`),
    noneForYou: 'No open jobs for your skill right now. We will show new ones here.',
    hasWorker: (n: number) => (n === 1 ? '1 of your jobs has a worker' : `${n} of your jobs have a worker`),
    toRate: (n: number) => (n === 1 ? '1 finished job is waiting for your rating' : `${n} finished jobs are waiting for your rating`),
    nothingNew: 'Nothing new right now.',
    view: 'View',
    listen: 'Listen',
    audioOff: 'Audio is not available on this phone',
    footer: 'मेहनत आपकी। पहचान आपकी।',
    footerSub: 'Built for the hands that build our cities.',
    language: 'Language',
    mainNav: 'Main navigation',
    mobileNav: 'Mobile navigation',
  },
  hi: {
    findWork: 'काम खोजें',
    card: 'हुनर कार्ड',
    myWork: 'मेरे काम',
    rights: 'अधिकार साथी',
    check: 'काम की जाँच',
    postJob: 'काम दें',
    myJobs: 'मेरे दिए काम',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    account: 'आपका खाता',
    worker: 'कारीगर',
    customer: 'ग्राहक',
    notifications: 'सूचनाएँ',
    openForYou: (n: number, trade: string) => `${trade} के लिए ${n} काम खुले हैं`,
    noneForYou: 'अभी आपके हुनर के लिए कोई खुला काम नहीं है। नए काम यहाँ दिखेंगे।',
    hasWorker: (n: number) => `आपके ${n} काम के लिए कारीगर मिल गया है`,
    toRate: (n: number) => `${n} पूरे हुए काम आपकी रेटिंग का इंतज़ार कर रहे हैं`,
    nothingNew: 'अभी कुछ नया नहीं है।',
    view: 'देखें',
    listen: 'सुनें',
    audioOff: 'इस फ़ोन पर आवाज़ उपलब्ध नहीं है',
    footer: 'मेहनत आपकी। पहचान आपकी।',
    footerSub: 'हमारे शहर बनाने वाले हाथों के लिए।',
    language: 'भाषा',
    mainNav: 'मुख्य मेनू',
    mobileNav: 'मोबाइल मेनू',
  },
  mr: {
    findWork: 'काम शोधा',
    card: 'हुनर कार्ड',
    myWork: 'माझी कामे',
    rights: 'हक्क साथी',
    check: 'काम तपासा',
    postJob: 'काम द्या',
    myJobs: 'मी दिलेली कामे',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    account: 'तुमचे खाते',
    worker: 'कारागीर',
    customer: 'ग्राहक',
    notifications: 'सूचना',
    openForYou: (n: number, trade: string) => `${trade} साठी ${n} कामे उपलब्ध आहेत`,
    noneForYou: 'सध्या तुमच्या कौशल्यासाठी काम उपलब्ध नाही. नवीन कामे इथे दिसतील.',
    hasWorker: (n: number) => `तुमच्या ${n} कामांसाठी कारागीर मिळाला आहे`,
    toRate: (n: number) => `${n} पूर्ण झालेली कामे तुमच्या रेटिंगची वाट पाहत आहेत`,
    nothingNew: 'सध्या काही नवीन नाही.',
    view: 'पहा',
    listen: 'ऐका',
    audioOff: 'या फोनवर आवाज उपलब्ध नाही',
    footer: 'मेहनत तुमची. ओळख तुमची.',
    footerSub: 'आपली शहरे घडवणाऱ्या हातांसाठी.',
    language: 'भाषा',
    mainNav: 'मुख्य मेनू',
    mobileNav: 'मोबाइल मेनू',
  },
} satisfies Record<Lang, unknown>;

type NavItem = { to: string; label: string; icon: LucideIcon };

function navFor(me: Me | null | undefined, c: (typeof COPY)['en']): { main: NavItem[]; mobile: NavItem[] } {
  if (me?.role === 'worker') {
    const main = [
      { to: '/worker', label: c.findWork, icon: BriefcaseBusiness },
      { to: '/card', label: c.card, icon: ContactRound },
      { to: '/my-work', label: c.myWork, icon: Hammer },
      { to: '/rights', label: c.rights, icon: ShieldCheck },
    ];
    return { main, mobile: [...main, { to: '/check-job', label: c.check, icon: Search }] };
  }
  if (me?.role === 'customer') {
    const main = [
      { to: '/post-job', label: c.postJob, icon: Plus },
      { to: '/my-jobs', label: c.myJobs, icon: ClipboardList },
    ];
    return { main, mobile: main };
  }
  const main = [
    { to: '/rights', label: c.rights, icon: ShieldCheck },
    { to: '/check-job', label: c.check, icon: Search },
  ];
  return { main, mobile: main };
}

export function LanguageControl() {
  const { lang, setLang } = useLang();
  const me = useQuery(meQuery).data;
  const updateMe = useUpdateMe();
  const c = COPY[lang];
  return (
    <div className="language-control" role="group" aria-label={c.language}>
      {LANGS.map((l) => (
        <Button
          key={l}
          variant="ghost"
          className={lang === l ? 'selected' : ''}
          aria-pressed={lang === l}
          onClick={() => {
            setLang(l);
            if (me && me.lang !== l) updateMe.mutate({ lang: l });
          }}
        >
          {LANG_BUTTON[l]}
        </Button>
      ))}
    </div>
  );
}

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="brand" aria-label="Hunar home">
      <span className="brand-seal">ह</span>
      <div>
        <div className="brand-name display">
          hunar<span className="text-base ml-2 font-sans">हुनर</span>
        </div>
        <div className="brand-tag">KAAM BHI, PEHCHAAN BHI</div>
      </div>
    </Link>
  );
}

export function homeFor(me: Me | null | undefined): string {
  if (me?.role === 'worker') return '/worker';
  if (me?.role === 'customer') return '/my-jobs';
  return '/';
}

export function HunarShell({ children }: { children: ReactNode }) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const me = useQuery(meQuery).data;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const nav = navFor(me, c);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <Brand to={homeFor(me)} />
          <nav className="header-nav" aria-label={c.mainNav}>
            {nav.main.map((n) => (
              <Link key={n.to} to={n.to} className={`nav-link ${path === n.to ? 'active' : ''}`}>
                <n.icon size={16} />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="header-controls">
            <LanguageControl />
            {me ? (
              <>
                <Button variant="ghost" size="icon" aria-label={c.notifications} title={c.notifications} onClick={() => setNoticeOpen(true)}>
                  <Bell size={19} />
                </Button>
                <button type="button" className="avatar" aria-label={c.account} onClick={() => setAccountOpen(true)}>
                  {initials(me.name)}
                </button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/login">
                  <LogIn />
                  {c.signIn}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="main-wrap">
        {children}
        <footer className="bottom-trust">
          <span className="mini-flower" aria-hidden="true" />
          <span>
            {c.footer}
            <span className="hidden sm:inline"> · {c.footerSub}</span>
          </span>
        </footer>
      </main>

      <nav className="bottom-nav" aria-label={c.mobileNav}>
        {nav.mobile.map((n) => (
          <Link key={n.to} to={n.to} className={path === n.to ? 'active' : ''}>
            <n.icon />
            {n.label}
          </Link>
        ))}
      </nav>

      {me && <NotificationsDialog me={me} open={noticeOpen} onOpenChange={setNoticeOpen} />}
      {me && <AccountDialog me={me} open={accountOpen} onOpenChange={setAccountOpen} />}
    </>
  );
}

function NotificationsDialog({ me, open, onOpenChange }: { me: Me; open: boolean; onOpenChange: (o: boolean) => void }) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const near = useNearMe((s) => s.coords);
  const isWorker = me.role === 'worker';
  const feed = useQuery({ ...feedQuery({ trade: me.worker?.trade, near }), enabled: open && isWorker });
  const mine = useQuery({ ...myJobsQuery, enabled: open && !isWorker });

  let lines: { text: string; to: string }[] = [];
  if (isWorker && me.worker && feed.data) {
    const n = feed.data.length;
    lines = n > 0 ? [{ text: c.openForYou(n, TRADE_LABEL[me.worker.trade][lang]), to: '/worker' }] : [];
  } else if (!isWorker && mine.data) {
    const withWorker = mine.data.filter((j) => j.status === 'assigned').length;
    const toRate = mine.data.filter((j) => j.status === 'done' && !j.myReviewDone).length;
    if (withWorker) lines.push({ text: c.hasWorker(withWorker), to: '/my-jobs' });
    if (toRate) lines.push({ text: c.toRate(toRate), to: '/my-jobs' });
  }
  const loading = isWorker ? feed.isLoading : mine.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-scroll">
        <DialogTitle>{c.notifications}</DialogTitle>
        <DialogDescription>{me.name}</DialogDescription>
        {loading ? null : lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isWorker ? c.noneForYou : c.nothingNew}</p>
        ) : (
          lines.map((l) => (
            <div key={l.text} className="notice flex items-center justify-between gap-3">
              <span>{l.text}</span>
              <Link to={l.to} onClick={() => onOpenChange(false)} className="font-semibold">
                {c.view}
              </Link>
            </div>
          ))
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccountDialog({ me, open, onOpenChange }: { me: Me; open: boolean; onOpenChange: (o: boolean) => void }) {
  const c = useCopy(COPY);
  const signOut = useSignOut();
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{c.account}</DialogTitle>
        <DialogDescription>
          {me.name} · {me.role === 'worker' ? c.worker : c.customer}
        </DialogDescription>
        <p className="text-sm">+91 {phoneText(me.phone)}</p>
        {me.role === 'worker' && (
          <Button asChild variant="outline">
            <Link to="/card" onClick={() => onOpenChange(false)}>
              <ContactRound />
              {c.card}
            </Link>
          </Button>
        )}
        <Button
          variant="destructive"
          disabled={signOut.isPending}
          onClick={() =>
            signOut.mutate(undefined, {
              onSettled: () => {
                onOpenChange(false);
                void navigate({ to: '/' });
              },
            })
          }
        >
          <LogOut />
          {c.signOut}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function Listen({ text }: { text: string }) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const [failed, setFailed] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="listen-button"
        aria-label={c.listen}
        title={c.listen}
        onClick={() => setFailed(!speak(text, lang))}
      >
        <Volume2 size={16} />
      </Button>
      {failed && (
        <span role="status" className="text-xs">
          {c.audioOff}
        </span>
      )}
    </>
  );
}
