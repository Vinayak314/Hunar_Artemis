import { LOCALE, PAYMENT_METHOD_LABEL, PAYMENT_WHEN_LABEL } from './i18n';
import type { Lang, Pay, Payment } from './types';

export function rupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Total the worker receives for the whole job. */
export function totalPay(pay: Pay): number {
  return pay.unit === 'per_day' ? pay.amount * (pay.days ?? 1) : pay.amount;
}

const PER_DAY: Record<Lang, string> = { en: '/day', hi: '/दिन', mr: '/दिवस' };
const DAYS: Record<Lang, (n: number) => string> = {
  en: (n) => `${n} ${n === 1 ? 'day' : 'days'}`,
  hi: (n) => `${n} दिन`,
  mr: (n) => `${n} दिवस`,
};

/** "₹800" or "₹700/day · 3 days". */
export function payText(pay: Pay, lang: Lang): string {
  if (pay.unit === 'total') return rupees(pay.amount);
  const base = `${rupees(pay.amount)}${PER_DAY[lang]}`;
  return pay.days && pay.days > 1 ? `${base} · ${DAYS[lang](pay.days)}` : base;
}

const ADVANCE: Record<Lang, (amount: string) => string> = {
  en: (a) => `${a} advance`,
  hi: (a) => `${a} पहले`,
  mr: (a) => `${a} आधी`,
};

/** "Part advance, rest after work (₹400 advance) · UPI". */
export function paymentText(payment: Payment, lang: Lang): string {
  const when = PAYMENT_WHEN_LABEL[payment.when][lang];
  const advance = payment.when === 'advance_part' && payment.advance ? ` (${ADVANCE[lang](rupees(payment.advance))})` : '';
  return `${when}${advance} · ${PAYMENT_METHOD_LABEL[payment.method][lang]}`;
}

export function timeAgo(iso: string, lang: Lang, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86_400), 'day');
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "9876543210" -> "98765 43210". */
export function phoneText(phone: string): string {
  return `${phone.slice(0, 5)} ${phone.slice(5)}`;
}
