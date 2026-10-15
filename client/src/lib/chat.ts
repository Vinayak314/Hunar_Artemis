import type { Coords } from './device';
import type { NewJob } from './queries';
import type { ChatDraft, PaymentMethod, PaymentWhen, PayUnit, Trade, Tri } from './types';

const CITY_KEY = 'hunar-last-city';

/** The city the customer used last time, so they are not asked for it every job. */
export function readLastCity(): string | undefined {
  try {
    return localStorage.getItem(CITY_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function rememberCity(city: string): void {
  try {
    localStorage.setItem(CITY_KEY, city);
  } catch {
    // Private mode or blocked storage: the customer is simply asked again next time.
  }
}

/** Only the languages that have text, so a half-filled draft never posts blank titles. */
function triToPartial(t: Tri): Partial<Tri> {
  const out: Partial<Tri> = {};
  if (t.en.trim()) out.en = t.en.trim();
  if (t.hi.trim()) out.hi = t.hi.trim();
  if (t.mr.trim()) out.mr = t.mr.trim();
  return out;
}

/**
 * Turn a finished draft into the body for POST /api/jobs, or null when something required is
 * still missing. `description` is the customer's own words.
 */
export function draftToNewJob(draft: ChatDraft, opts: { description: string; location?: Coords | null }): NewJob | null {
  if (!draft.trade || !draft.when || !draft.locality || !draft.city) return null;
  if (!(draft.payAmount > 0) || !draft.payUnit) return null;
  if (!draft.payWhen || !draft.payMethod) return null;
  if (draft.payWhen === 'advance_part' && !(draft.advance > 0)) return null;

  const description = (opts.description.trim() || draft.problemDetail.trim()).slice(0, 1000);
  if (description.length < 5) return null;

  const title = triToPartial(draft.title);
  const summary = triToPartial(draft.summary);
  return {
    trade: draft.trade,
    description,
    ...(Object.keys(title).length ? { title } : {}),
    ...(Object.keys(summary).length ? { summary } : {}),
    locality: draft.locality,
    city: draft.city,
    ...(opts.location ? { location: opts.location } : {}),
    when: draft.when,
    ...(draft.duration ? { duration: draft.duration } : {}),
    pay: {
      amount: draft.payAmount,
      unit: draft.payUnit,
      ...(draft.payUnit === 'per_day' && draft.payDays > 0 ? { days: draft.payDays } : {}),
    },
    payment: {
      when: draft.payWhen,
      method: draft.payMethod,
      ...(draft.payWhen === 'advance_part' ? { advance: draft.advance } : {}),
    },
  };
}

/**
 * The customer's own description of the job: their first message, plus any later reply to a
 * question about the problem. Chip taps and short answers (budget, place, time) are not part of it.
 */
export function descriptionFrom(messages: { role: 'customer' | 'assistant'; text: string; field?: string }[]): string {
  const parts: string[] = [];
  let previousField: string | undefined;
  messages.forEach((m, i) => {
    if (m.role === 'assistant') {
      previousField = m.field;
      return;
    }
    if ((i === 0 || previousField === 'problem') && m.text.trim()) parts.push(m.text.trim());
  });
  return parts.join('. ');
}

/** What the manual form starts with when the customer edits an AI draft or the assistant hands over. */
export interface FormInitial {
  trade?: Trade;
  description?: string;
  title?: Partial<Tri>;
  summary?: Partial<Tri>;
  when?: string;
  duration?: string;
  locality?: string;
  city?: string;
  payAmount?: number;
  payUnit?: PayUnit;
  payDays?: number;
  payWhen?: PaymentWhen;
  payMethod?: PaymentMethod;
  advance?: number;
  location?: Coords | null;
}

export function draftToFormInitial(draft: ChatDraft, description: string, location?: Coords | null): FormInitial {
  const out: FormInitial = { description: description.trim() || draft.problemDetail };
  if (draft.trade) out.trade = draft.trade;
  const title = triToPartial(draft.title);
  const summary = triToPartial(draft.summary);
  if (Object.keys(title).length) out.title = title;
  if (Object.keys(summary).length) out.summary = summary;
  if (draft.when) out.when = draft.when;
  if (draft.duration) out.duration = draft.duration;
  if (draft.locality) out.locality = draft.locality;
  if (draft.city) out.city = draft.city;
  if (draft.payAmount > 0) out.payAmount = draft.payAmount;
  if (draft.payUnit) out.payUnit = draft.payUnit;
  if (draft.payDays > 0) out.payDays = draft.payDays;
  if (draft.payWhen) out.payWhen = draft.payWhen;
  if (draft.payMethod) out.payMethod = draft.payMethod;
  if (draft.advance > 0) out.advance = draft.advance;
  if (location) out.location = location;
  return out;
}

export interface FormValues {
  trade: Trade;
  description: string;
  title?: Partial<Tri> | undefined;
  summary?: Partial<Tri> | undefined;
  locality: string;
  city: string;
  location?: Coords | null;
  when: string;
  duration?: string;
  payAmount: number;
  payUnit: PayUnit;
  payDays?: number | undefined;
  payWhen: PaymentWhen;
  payMethod: PaymentMethod;
  advance?: number | undefined;
}

/** Map the manual form's values onto the POST /api/jobs body. */
export function formToNewJob(v: FormValues): NewJob {
  return {
    trade: v.trade,
    description: v.description,
    ...(v.title && Object.keys(v.title).length ? { title: v.title } : {}),
    ...(v.summary && Object.keys(v.summary).length ? { summary: v.summary } : {}),
    locality: v.locality,
    city: v.city,
    ...(v.location ? { location: v.location } : {}),
    when: v.when,
    ...(v.duration ? { duration: v.duration } : {}),
    pay: { amount: v.payAmount, unit: v.payUnit, ...(v.payUnit === 'per_day' && v.payDays ? { days: v.payDays } : {}) },
    payment: { when: v.payWhen, method: v.payMethod, ...(v.payWhen === 'advance_part' && v.advance ? { advance: v.advance } : {}) },
  };
}
