import { useEffect, type ReactNode } from 'react';
import {
  BrickWall,
  CircleAlert,
  Hammer,
  HardHat,
  LoaderCircle,
  Paintbrush,
  SprayCan,
  Star,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { errorText, useCopy, useLang } from '@/lib/i18n';
import type { Lang, Trade } from '@/lib/types';
import { cn } from '@/lib/utils';

export const TRADE_ICON: Record<Trade, LucideIcon> = {
  plumbing: Wrench,
  electric: Zap,
  paint: Paintbrush,
  carpentry: Hammer,
  masonry: BrickWall,
  cleaning: SprayCan,
  labour: HardHat,
};

export function TradeIcon({ trade, size = 22, className }: { trade: Trade; size?: number; className?: string }) {
  const Icon = TRADE_ICON[trade];
  return (
    <span className={cn('trade-icon', trade, className)} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}

/** Sets the browser tab title for the current page. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Hunar` : 'Hunar - Kaam Bhi, Pehchaan Bhi';
  }, [title]);
}

const STATE_COPY: Record<Lang, { loading: string; retry: string; stars: (n: number) => string }> = {
  en: { loading: 'Loading...', retry: 'Try again', stars: (n) => `${n} out of 5 stars` },
  hi: { loading: 'लोड हो रहा है...', retry: 'फिर कोशिश करें', stars: (n) => `5 में से ${n} स्टार` },
  mr: { loading: 'लोड होत आहे...', retry: 'पुन्हा प्रयत्न करा', stars: (n) => `5 पैकी ${n} स्टार` },
};

export function LoadingBlock({ label }: { label?: string }) {
  const c = useCopy(STATE_COPY);
  return (
    <div className="state-block" role="status" aria-live="polite">
      <LoaderCircle className="animate-spin" size={22} />
      <span>{label ?? c.loading}</span>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const lang = useLang((s) => s.lang);
  const c = STATE_COPY[lang];
  return (
    <div className="state-block error" role="alert">
      <CircleAlert size={22} />
      <span>{errorText(error, lang)}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {c.retry}
        </Button>
      )}
    </div>
  );
}

export function EmptyBlock({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <h2 className="section-title">{title}</h2>
      {children}
    </div>
  );
}

export function Notice({ tone = 'success', children, className }: { tone?: 'success' | 'warning' | 'error'; children: ReactNode; className?: string }) {
  return (
    <div className={cn('notice', tone === 'warning' && 'warning-notice', tone === 'error' && 'error-notice', className)}>
      {children}
    </div>
  );
}

export function StarDisplay({ value, size = 14 }: { value: number; size?: number }) {
  const c = useCopy(STATE_COPY);
  return (
    <span className="star-row" role="img" aria-label={c.stars(Math.round(value))}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={value >= n - 0.25 ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const c = useCopy(STATE_COPY);
  return (
    <div className="rating-stars" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Button
          key={n}
          type="button"
          variant="outline"
          role="radio"
          aria-checked={value === n}
          aria-label={c.stars(n)}
          onClick={() => onChange(n)}
        >
          <Star fill={value >= n ? 'currentColor' : 'none'} />
        </Button>
      ))}
    </div>
  );
}
