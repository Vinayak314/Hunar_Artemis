import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { EmptyBlock, ErrorBlock, LoadingBlock, usePageTitle } from '@/components/common';
import { HunarCard } from '@/components/hunar-card';
import { HunarShell } from '@/components/hunar-shell';
import { Testimonials, WorkRecord } from '@/components/work-record';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { TRADE_LABEL, useCopy, useLang } from '@/lib/i18n';
import { meQuery, workerCardQuery } from '@/lib/queries';
import type { Lang } from '@/lib/types';

export const Route = createFileRoute('/w/$publicId')({ component: PublicCard });

const COPY = {
  en: {
    title: 'Hunar Card',
    sub: 'A work record built from real jobs and real customer ratings.',
    notFound: 'No Hunar Card with this code',
    notFoundText: 'Check the QR code or link and try again.',
    hire: 'Need work done? Post a job on Hunar',
    hireCta: 'Post a job',
    hireText: 'Workers near you see your job with clear pay and payment terms.',
  },
  hi: {
    title: 'हुनर कार्ड',
    sub: 'असली काम और असली ग्राहकों की रेटिंग से बना काम का रिकॉर्ड।',
    notFound: 'इस कोड का कोई हुनर कार्ड नहीं मिला',
    notFoundText: 'QR कोड या लिंक जाँचकर फिर कोशिश करें।',
    hire: 'काम करवाना है? हुनर पर काम डालें',
    hireCta: 'काम दें',
    hireText: 'पास के कारीगर आपका काम साफ़ पैसे और भुगतान की शर्तों के साथ देखेंगे।',
  },
  mr: {
    title: 'हुनर कार्ड',
    sub: 'खऱ्या कामांवर आणि खऱ्या ग्राहकांच्या रेटिंगवर आधारित कामाचा रेकॉर्ड.',
    notFound: 'या कोडचे हुनर कार्ड सापडले नाही',
    notFoundText: 'QR कोड किंवा लिंक तपासून पुन्हा प्रयत्न करा.',
    hire: 'काम करून घ्यायचे आहे? हुनरवर काम टाका',
    hireCta: 'काम द्या',
    hireText: 'जवळचे कारागीर तुमचे काम स्पष्ट पैसे आणि अटींसह पाहतील.',
  },
} satisfies Record<Lang, unknown>;

function PublicCard() {
  const { publicId } = Route.useParams();
  const c = useCopy(COPY);
  const lang = useLang((s) => s.lang);
  const card = useQuery(workerCardQuery(publicId));
  const me = useQuery(meQuery).data;
  const w = card.data;
  usePageTitle(w ? `${w.name} · ${TRADE_LABEL[w.trade][lang]}` : c.title);

  return (
    <HunarShell>
      <div className="content-page">
        <h1 className="page-title">{c.title}</h1>
        <p className="page-description">{c.sub}</p>
        {card.isLoading ? (
          <LoadingBlock />
        ) : card.error instanceof ApiError && card.error.status === 404 ? (
          <EmptyBlock title={c.notFound}>
            <p>{c.notFoundText}</p>
          </EmptyBlock>
        ) : card.isError || !w ? (
          <ErrorBlock error={card.error} onRetry={() => void card.refetch()} />
        ) : (
          <>
            <div className="page-grid">
              <HunarCard person={w} qrUrl={window.location.href} />
              <WorkRecord stats={w.stats} dayRate={w.dayRate} available={w.available} memberSince={w.memberSince} />
            </div>
            <Testimonials reviews={w.reviews} />
            {me?.role !== 'worker' && (
              <section className="panel mt-9 grid gap-3">
                <h2 className="section-title">{c.hire}</h2>
                <p className="text-sm text-muted-foreground">{c.hireText}</p>
                <Button asChild className="justify-self-start">
                  {me?.role === 'customer' ? (
                    <Link to="/post-job">
                      <Plus />
                      {c.hireCta}
                    </Link>
                  ) : (
                    <Link to="/login" search={{ role: 'customer' }}>
                      <Plus />
                      {c.hireCta}
                    </Link>
                  )}
                </Button>
              </section>
            )}
          </>
        )}
      </div>
    </HunarShell>
  );
}
