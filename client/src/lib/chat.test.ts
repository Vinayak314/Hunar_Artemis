import { describe, expect, it } from 'vitest';
import { descriptionFrom, draftToFormInitial, draftToNewJob, formToNewJob } from './chat';
import type { ChatDraft } from './types';

const tri = (en: string, hi = en, mr = en) => ({ en, hi, mr });

/** The finished ticket from the fan story in the design doc. */
const fan: ChatDraft = {
  trade: 'electric',
  title: tri('Fix ceiling fan', 'पंखा ठीक करना', 'पंखा दुरुस्त करणे'),
  summary: tri('Ceiling fan is not running.', 'छत का पंखा चल नहीं रहा।', 'छताचा पंखा चालत नाही.'),
  problemDetail: 'Ceiling fan unresponsive at all speeds.',
  when: 'आज',
  duration: '1 घंटा',
  locality: 'Bhushi Rd',
  city: 'Lonavla',
  payAmount: 500,
  payUnit: 'total',
  payDays: 0,
  payWhen: 'after_work',
  payMethod: 'cash',
  advance: 0,
  materials: ['capacitor'],
};

const words = 'पंखा नहीं चल रहा, आज ठीक करवाना है';

describe('draftToNewJob', () => {
  it('turns the finished fan ticket into a job the server will accept', () => {
    const job = draftToNewJob(fan, { description: words });
    expect(job).toMatchObject({
      trade: 'electric',
      description: words,
      locality: 'Bhushi Rd',
      city: 'Lonavla',
      when: 'आज',
      duration: '1 घंटा',
      pay: { amount: 500, unit: 'total' },
      payment: { when: 'after_work', method: 'cash' },
      title: { en: 'Fix ceiling fan', hi: 'पंखा ठीक करना', mr: 'पंखा दुरुस्त करणे' },
    });
    expect(job?.payment.advance).toBeUndefined();
    expect(job?.pay.days).toBeUndefined();
  });

  it('refuses to build a job while anything required is missing', () => {
    const missing: Partial<ChatDraft>[] = [
      { trade: '' },
      { when: '' },
      { locality: '' },
      { city: '' },
      { payAmount: 0 },
      { payUnit: '' },
      { payWhen: '' },
      { payMethod: '' },
    ];
    for (const patch of missing) {
      expect(draftToNewJob({ ...fan, ...patch }, { description: words }), JSON.stringify(patch)).toBeNull();
    }
  });

  it('uses the problem line the assistant wrote when the customer only sent a photo', () => {
    expect(draftToNewJob(fan, { description: '' })?.description).toBe('Ceiling fan unresponsive at all speeds.');
    expect(draftToNewJob({ ...fan, problemDetail: '' }, { description: '' })).toBeNull();
  });

  it('keeps the day count only for daily wages', () => {
    const daily = draftToNewJob({ ...fan, payUnit: 'per_day', payDays: 3, payWhen: 'daily' }, { description: words });
    expect(daily?.pay).toEqual({ amount: 500, unit: 'per_day', days: 3 });
    expect(draftToNewJob({ ...fan, payDays: 3 }, { description: words })?.pay).toEqual({ amount: 500, unit: 'total' });
  });

  it('needs an advance for a part-advance and includes it', () => {
    const advance = { ...fan, payWhen: 'advance_part' as const, payMethod: 'upi' as const };
    expect(draftToNewJob({ ...advance, advance: 0 }, { description: words })).toBeNull();
    expect(draftToNewJob({ ...advance, advance: 200 }, { description: words })?.payment).toEqual({ when: 'advance_part', method: 'upi', advance: 200 });
  });

  it('never posts a blank title language', () => {
    const job = draftToNewJob({ ...fan, title: tri('Fix fan', '', '') }, { description: words });
    expect(job?.title).toEqual({ en: 'Fix fan' });
    expect(draftToNewJob({ ...fan, title: tri('', '', '') }, { description: words })?.title).toBeUndefined();
  });

  it('adds the location only when the customer shared it', () => {
    expect(draftToNewJob(fan, { description: words })?.location).toBeUndefined();
    expect(draftToNewJob(fan, { description: words, location: { lat: 18.75, lng: 73.4 } })?.location).toEqual({ lat: 18.75, lng: 73.4 });
  });
});

describe('descriptionFrom', () => {
  it('keeps the first message and ignores answers to budget, place and payment', () => {
    expect(
      descriptionFrom([
        { role: 'customer', text: words },
        { role: 'assistant', text: 'कितना खर्च?', field: 'budget' },
        { role: 'customer', text: '₹500' },
        { role: 'assistant', text: 'कहाँ?', field: 'place' },
        { role: 'customer', text: 'Bhushi Rd, Lonavla' },
      ]),
    ).toBe(words);
  });

  it('adds a later reply to a question about the problem itself', () => {
    expect(
      descriptionFrom([
        { role: 'customer', text: '' },
        { role: 'assistant', text: 'क्या ठीक करवाना है?', field: 'problem' },
        { role: 'customer', text: 'पंखा चलता नहीं' },
      ]),
    ).toBe('पंखा चलता नहीं');
  });
});

describe('draftToFormInitial', () => {
  it('prefills only what the customer has already said', () => {
    const initial = draftToFormInitial({ ...fan, locality: '', city: '', payAmount: 0, payUnit: '', payWhen: '', payMethod: '' }, words);
    expect(initial.trade).toBe('electric');
    expect(initial.when).toBe('आज');
    expect(initial.description).toBe(words);
    expect(initial.locality).toBeUndefined();
    expect(initial.payAmount).toBeUndefined();
    expect(initial.payWhen).toBeUndefined();
  });
});

describe('formToNewJob', () => {
  it('maps the manual form onto the job body and leaves unset options out', () => {
    const job = formToNewJob({
      trade: 'plumbing',
      description: 'Kitchen tap is leaking',
      locality: 'Kothrud',
      city: 'Pune',
      when: 'Today, 3 PM',
      duration: '',
      payAmount: 800,
      payUnit: 'total',
      payWhen: 'after_work',
      payMethod: 'either',
    });
    expect(job).toEqual({
      trade: 'plumbing',
      description: 'Kitchen tap is leaking',
      locality: 'Kothrud',
      city: 'Pune',
      when: 'Today, 3 PM',
      pay: { amount: 800, unit: 'total' },
      payment: { when: 'after_work', method: 'either' },
    });
  });
});
