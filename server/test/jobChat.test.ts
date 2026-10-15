import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildPrompt,
  cleanOptions,
  emptyDraft,
  fallbackOptions,
  MAX_ASKS,
  missingFields,
  normalizeDraft,
  reconcile,
  totalPay,
  type Draft,
  type ModelOutput,
} from '../src/ai/jobChat.js';

const tri = (en: string, hi = en, mr = en) => ({ en, hi, mr });

/** The state after the first message of the "fan story": trade known, nothing else. */
function fanDraft(over: Partial<Draft> = {}): Draft {
  return {
    ...emptyDraft(),
    trade: 'electric',
    title: tri('Fix ceiling fan', 'पंखा ठीक करना', 'पंखा दुरुस्त करणे'),
    summary: tri('Ceiling fan is not running.', 'छत का पंखा चल नहीं रहा।', 'छताचा पंखा चालत नाही.'),
    when: 'आज',
    ...over,
  };
}

function model(draft: Draft, over: Partial<ModelOutput> = {}): ModelOutput {
  return { draft, field: '', question: tri(''), options: [], ...over };
}

const ctx = { lang: 'hi' as const, assistantTurns: 1 };

describe('missingFields', () => {
  test('an empty draft is missing everything, in the order we ask', () => {
    assert.deepEqual(missingFields(emptyDraft()), ['problem', 'when', 'budget', 'place', 'payment']);
  });

  test('follows the fan story: each answer removes exactly one field', () => {
    assert.deepEqual(missingFields(fanDraft({ when: '' })), ['when', 'budget', 'place', 'payment']);
    assert.deepEqual(missingFields(fanDraft()), ['budget', 'place', 'payment']);
    assert.deepEqual(missingFields(fanDraft({ payAmount: 500, payUnit: 'total' })), ['place', 'payment']);
    assert.deepEqual(
      missingFields(fanDraft({ payAmount: 500, payUnit: 'total', locality: 'Bhushi Rd', city: 'Lonavla' })),
      ['payment'],
    );
    assert.deepEqual(
      missingFields(
        fanDraft({ payAmount: 500, payUnit: 'total', locality: 'Bhushi Rd', city: 'Lonavla', payWhen: 'after_work', payMethod: 'cash' }),
      ),
      [],
    );
  });

  test('an area without a city is still missing the place', () => {
    assert.ok(missingFields(fanDraft({ locality: 'Kothrud' })).includes('place'));
  });

  test('a part-advance needs an advance that is smaller than the total', () => {
    const base = fanDraft({ payAmount: 500, payUnit: 'total', locality: 'A', city: 'B', payWhen: 'advance_part', payMethod: 'upi' });
    assert.ok(missingFields({ ...base, advance: 0 }).includes('payment'));
    assert.ok(missingFields({ ...base, advance: 500 }).includes('payment'));
    assert.deepEqual(missingFields({ ...base, advance: 200 }), []);
  });
});

describe('totalPay', () => {
  test('multiplies a daily wage by the number of days, at least one day', () => {
    assert.equal(totalPay({ payAmount: 700, payUnit: 'per_day', payDays: 3 }), 2100);
    assert.equal(totalPay({ payAmount: 700, payUnit: 'per_day', payDays: 0 }), 700);
    assert.equal(totalPay({ payAmount: 800, payUnit: 'total', payDays: 0 }), 800);
  });
});

describe('normalizeDraft', () => {
  test('never invents money: a unit without an amount is dropped', () => {
    assert.equal(normalizeDraft({ ...fanDraft(), payAmount: 0, payUnit: 'total' }).payUnit, '');
  });

  test('uses the remembered city only when an area is named without one', () => {
    assert.equal(normalizeDraft(fanDraft({ locality: 'Kothrud' }), 'Pune').city, 'Pune');
    assert.equal(normalizeDraft(fanDraft({ locality: 'Kothrud', city: 'Nashik' }), 'Pune').city, 'Nashik');
    assert.equal(normalizeDraft(fanDraft(), 'Pune').city, '', 'no area named, so no city is guessed');
  });

  test('fills a blank language from another so a worker never sees an empty title', () => {
    const d = normalizeDraft(fanDraft({ title: { en: 'Fix fan', hi: '', mr: '' } }));
    assert.equal(d.title.hi, 'Fix fan');
    assert.equal(d.title.mr, 'Fix fan');
  });

  test('clears day count and advance that do not apply', () => {
    const d = normalizeDraft(fanDraft({ payAmount: 500, payUnit: 'total', payDays: 3, payWhen: 'after_work', advance: 100 }));
    assert.equal(d.payDays, 0);
    assert.equal(d.advance, 0);
  });
});

describe('reconcile', () => {
  test('the model cannot declare itself done while a field is missing', () => {
    // The model claims nothing is left to ask, but no budget was ever given.
    const r = reconcile(model(fanDraft(), { field: '' }), ctx);
    assert.equal(r.action, 'ask');
    if (r.action === 'ask') {
      assert.equal(r.field, 'budget');
      assert.equal(r.progress.done, 2);
      assert.deepEqual(r.progress.missing, ['budget', 'place', 'payment']);
    }
  });

  test('uses the model wording and chips when it asked about the field the code needs next', () => {
    const r = reconcile(
      model(fanDraft(), {
        field: 'budget',
        question: tri('How much?', 'कितना खर्च करना चाहते हैं?', 'किती खर्च?'),
        options: [
          { label: '₹300', value: '300' },
          { label: '₹500', value: '500' },
          { label: '₹500', value: 'dup' },
          { label: '₹700', value: '700' },
        ],
      }),
      ctx,
    );
    assert.equal(r.action, 'ask');
    if (r.action === 'ask') {
      assert.equal(r.question.hi, 'कितना खर्च करना चाहते हैं?');
      assert.deepEqual(r.options.map((o) => o.label), ['₹300', '₹500', '₹700'], 'duplicates are dropped');
    }
  });

  test('ignores a question about the wrong field and asks the right one', () => {
    const r = reconcile(model(fanDraft(), { field: 'payment', question: tri('How will you pay?') }), ctx);
    assert.equal(r.action, 'ask');
    if (r.action === 'ask') {
      assert.equal(r.field, 'budget');
      assert.notEqual(r.question.en, 'How will you pay?');
    }
  });

  test('fills a blank language of the question from the built-in wording', () => {
    const r = reconcile(model(fanDraft(), { field: 'budget', question: tri('How much?', '', '') }), ctx);
    assert.equal(r.action, 'ask');
    if (r.action === 'ask') {
      assert.equal(r.question.en, 'How much?');
      assert.ok(r.question.hi.length > 0 && r.question.mr.length > 0);
    }
  });

  test('falls back to the standard chips for "when" and "payment" when the model gives none', () => {
    const when = reconcile(model(fanDraft({ when: '' }), { field: 'when' }), ctx);
    assert.equal(when.action, 'ask');
    if (when.action === 'ask') assert.deepEqual(when.options, fallbackOptions('when', 'hi'));

    const pay = reconcile(model(fanDraft({ payAmount: 500, payUnit: 'total', locality: 'A', city: 'B' }), { field: 'payment' }), ctx);
    assert.equal(pay.action, 'ask');
    if (pay.action === 'ask') assert.equal(pay.options.length, 3);
  });

  test('ignores English chips from the model for "when" and "payment" and uses the customer language', () => {
    const english = [
      { label: 'After work, cash', value: 'x' },
      { label: 'After work, UPI', value: 'y' },
    ];
    const draft = fanDraft({ payAmount: 500, payUnit: 'total', locality: 'A', city: 'B' });
    const r = reconcile(model(draft, { field: 'payment', options: english }), ctx);
    assert.equal(r.action, 'ask');
    if (r.action === 'ask') {
      assert.deepEqual(r.options, fallbackOptions('payment', 'hi'));
      assert.ok(r.options.every((o) => /[\u0900-\u097F]/.test(o.label)), 'labels are in Devanagari for Hindi');
    }
  });

  test('never offers chips for open questions (the problem and the place)', () => {
    const chips = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ];
    const place = reconcile(model(fanDraft({ payAmount: 500, payUnit: 'total' }), { field: 'place', options: chips }), ctx);
    assert.equal(place.action, 'ask');
    if (place.action === 'ask') assert.deepEqual(place.options, []);
  });

  test('creates the ticket once everything is known', () => {
    const done = fanDraft({ payAmount: 500, payUnit: 'total', locality: 'Bhushi Rd', city: 'Lonavla', payWhen: 'after_work', payMethod: 'cash' });
    const r = reconcile(model(done), ctx);
    assert.equal(r.action, 'create');
    assert.deepEqual(r.progress, { done: 5, total: 5, missing: [] });
  });

  test('hands over to the manual form after too many questions', () => {
    const r = reconcile(model(fanDraft()), { ...ctx, assistantTurns: MAX_ASKS });
    assert.equal(r.action, 'form');
    assert.ok(r.progress.missing.length > 0);
  });

  test('a complete ticket is created even after many questions', () => {
    const done = fanDraft({ payAmount: 500, payUnit: 'total', locality: 'A', city: 'B', payWhen: 'after_work', payMethod: 'cash' });
    assert.equal(reconcile(model(done), { ...ctx, assistantTurns: MAX_ASKS + 3 }).action, 'create');
  });
});

describe('cleanOptions', () => {
  test('keeps at most four, trims, and uses the label when a value is blank', () => {
    const out = cleanOptions(['a', 'b', 'c', 'd', 'e'].map((l) => ({ label: `  ${l}  `, value: '' })));
    assert.equal(out.length, 4);
    assert.deepEqual(out[0], { label: 'a', value: 'a' });
  });

  test('drops blank labels', () => {
    assert.deepEqual(cleanOptions([{ label: '   ', value: 'x' }]), []);
  });
});

describe('buildPrompt', () => {
  test('includes the draft, the questions asked, and tapped chip values', () => {
    const p = buildPrompt({
      lang: 'hi',
      draft: fanDraft(),
      turns: [
        { role: 'customer', text: 'पंखा नहीं चल रहा' },
        { role: 'assistant', text: 'कब चाहिए?', field: 'when' },
        { role: 'customer', text: 'आज', value: 'today' },
      ],
    });
    assert.match(p, /Customer language: hi/);
    assert.match(p, /You asked \[when\]: कब चाहिए\?/);
    assert.match(p, /Customer: आज \(tapped option: today\)/);
    assert.match(p, /Draft so far: \{/);
  });

  test('says so when the customer sent only a photo', () => {
    assert.match(buildPrompt({ lang: 'en', turns: [{ role: 'customer', text: '' }] }), /\(sent a photo only\)/);
  });
});
