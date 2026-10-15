/**
 * Rule-based "Check this job" scanner for messages workers receive on WhatsApp
 * or see on posters. It flags common warning signs; it never blocks anything and
 * never claims a job is safe.
 */
export interface ListingCheck {
  /** Asks the worker to pay something to get the job. */
  upfrontFee: boolean;
  /** Asks for an OTP, PIN, password, card or bank details, or an Aadhaar copy. */
  privateData: boolean;
  /** No clear amount of money anywhere in the message. */
  missingPay: boolean;
}

const UPFRONT_FEE = [
  /deposit/i,
  /registration\s*(fee|charge)/i,
  /joining\s*(fee|charge)/i,
  /(processing|security|advance|form|training)\s*(fee|charge|amount|deposit)/i,
  /pay\s+(first|before|to\s+(join|register|confirm))/i,
  /पहले\s*पैसे/,
  /जमा\s*(करें|करना|राशि)/,
  /रजिस्ट्रेशन\s*(फीस|शुल्क)/,
  /फ़?ीस/,
  /शुल्क/,
  /डिपॉझिट/,
  /नोंदणी\s*शुल्क/,
  /आधी\s*पैसे\s*भरा/,
];

const PRIVATE_DATA = [
  /\botp\b/i,
  /\bpin\b/i,
  /password/i,
  /\bcvv\b/i,
  /(bank|card|account)\s*(details|number|no\.?)/i,
  /aadh?aa?r/i,
  /ओटीपी/,
  /पासवर्ड/,
  /पिन\s*(नंबर|कोड)?/,
  /आधार/,
  /बैंक\s*(डिटेल|खाता|अकाउंट)/,
];

const MONEY = [/₹\s*\d/, /\brs\.?\s*\d/i, /\binr\s*\d/i, /\d[\d,]*\s*(rs|rupees?|\/-)/i, /\d+\s*(रुपये|रुपए|रुपया|रु\.?)/, /\b\d{3,6}\b/];
// 3-6 digit bare numbers count as an amount; 10-digit phone numbers do not.

export function checkListing(text: string): ListingCheck {
  return {
    upfrontFee: UPFRONT_FEE.some((re) => re.test(text)),
    privateData: PRIVATE_DATA.some((re) => re.test(text)),
    missingPay: !MONEY.some((re) => re.test(text)),
  };
}
