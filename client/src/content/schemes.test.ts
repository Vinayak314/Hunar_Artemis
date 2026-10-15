import { describe, expect, it } from 'vitest';
import { checkListing } from '@/lib/trust';
import { evaluateFit, SCHEMES, type EligibilityAnswers } from './schemes';

const base: EligibilityAnswers = { age: null, trade: null, lowIncome: null, formalOrTaxpayer: null, siteWork90: null };

describe('scheme content', () => {
  it('has all three languages for every text field', () => {
    for (const s of SCHEMES) {
      for (const lang of ['en', 'hi', 'mr'] as const) {
        expect(s.name[lang], `${s.id} name ${lang}`).toBeTruthy();
        expect(s.summary[lang], `${s.id} summary ${lang}`).toBeTruthy();
        expect(s.who[lang].length, `${s.id} who ${lang}`).toBe(s.who.en.length);
        expect(s.docs[lang].length, `${s.id} docs ${lang}`).toBe(s.docs.en.length);
      }
      expect(s.link.startsWith('https://')).toBe(true);
    }
  });
});

describe('evaluateFit', () => {
  it('matches e-Shram to a 30-year-old outside EPFO/ESIC', () => {
    expect(evaluateFit('eshram', { ...base, age: 30, formalOrTaxpayer: false })).toBe('likely');
  });

  it('rules out e-Shram for EPFO/ESIC members and ages outside 16-59', () => {
    expect(evaluateFit('eshram', { ...base, age: 30, formalOrTaxpayer: true })).toBe('unlikely');
    expect(evaluateFit('eshram', { ...base, age: 62, formalOrTaxpayer: false })).toBe('unlikely');
    expect(evaluateFit('eshram', { ...base, age: 15, formalOrTaxpayer: false })).toBe('unlikely');
  });

  it('applies the PM-SYM age and income limits', () => {
    expect(evaluateFit('pmsym', { ...base, age: 35, lowIncome: true })).toBe('likely');
    expect(evaluateFit('pmsym', { ...base, age: 41, lowIncome: true })).toBe('unlikely');
    expect(evaluateFit('pmsym', { ...base, age: 35, lowIncome: false })).toBe('unlikely');
  });

  it('applies the insurance age limits (PMSBY 18-70, PMJJBY 18-50)', () => {
    expect(evaluateFit('pmsby', { ...base, age: 60 })).toBe('likely');
    expect(evaluateFit('pmjjby', { ...base, age: 60 })).toBe('unlikely');
    expect(evaluateFit('pmjjby', { ...base, age: 50 })).toBe('likely');
  });

  it('only suggests PM Vishwakarma for carpenters and masons', () => {
    expect(evaluateFit('pmvishwakarma', { ...base, age: 30, trade: 'carpentry' })).toBe('likely');
    expect(evaluateFit('pmvishwakarma', { ...base, age: 30, trade: 'masonry' })).toBe('likely');
    expect(evaluateFit('pmvishwakarma', { ...base, age: 30, trade: 'plumbing' })).toBe('unlikely');
    expect(evaluateFit('pmvishwakarma', { ...base, age: 30 })).toBe('check');
  });

  it('needs 90 days of site work for the Maharashtra board', () => {
    expect(evaluateFit('mahabocw', { ...base, age: 30, siteWork90: true })).toBe('likely');
    expect(evaluateFit('mahabocw', { ...base, age: 30, siteWork90: false })).toBe('unlikely');
    expect(evaluateFit('mahabocw', { ...base, age: 61, siteWork90: true })).toBe('unlikely');
  });

  it('never claims PM-JAY eligibility; it depends on the government list', () => {
    expect(evaluateFit('pmjay', { ...base, age: 30 })).toBe('check');
  });

  it('asks for more information instead of guessing when answers are missing', () => {
    for (const s of SCHEMES) expect(evaluateFit(s.id, base)).toBe('check');
  });
});

describe('checkListing', () => {
  it('flags upfront fees in English and Hindi', () => {
    expect(checkListing('Pay Rs 500 registration fee to join, salary 15000').upfrontFee).toBe(true);
    expect(checkListing('काम पक्का, पहले पैसे जमा करें, 800 रुपये रोज').upfrontFee).toBe(true);
  });

  it('flags requests for private data', () => {
    expect(checkListing('Send your OTP and bank details to confirm, 700 per day').privateData).toBe(true);
    expect(checkListing('आधार और ओटीपी भेजो').privateData).toBe(true);
  });

  it('flags missing pay but not a clear amount', () => {
    expect(checkListing('Need a painter tomorrow, call me').missingPay).toBe(true);
    expect(checkListing('Need a painter tomorrow, ₹900 per day').missingPay).toBe(false);
    expect(checkListing('पेंटर चाहिए, 900 रुपये रोज').missingPay).toBe(false);
  });

  it('treats a bare phone number as not being a pay amount', () => {
    expect(checkListing('Call 9876543210 for work').missingPay).toBe(true);
  });

  it('reports a clean message as clean', () => {
    const r = checkListing('Fix a leaking tap tomorrow 10 AM in Kothrud. ₹600 after the work, cash or UPI.');
    expect(r).toEqual({ upfrontFee: false, privateData: false, missingPay: false });
  });
});
