import type { Lang, Trade } from '@/lib/types';

/**
 * Reference content for the Rights Hub: real government schemes and the
 * official channels for them. This is not user data. Every fact below was read
 * from the scheme's official site or a Government of India (PIB / Ministry)
 * page on CHECKED_ON. Amounts and rules change, so the UI always tells the
 * worker to confirm on the official site before applying.
 */
export const CHECKED_ON = '2026-10-15';

type L<T> = Record<Lang, T>;

export interface Scheme {
  id: 'eshram' | 'pmsym' | 'pmsby' | 'pmjjby' | 'pmjay' | 'mahabocw' | 'pmvishwakarma';
  name: L<string>;
  summary: L<string>;
  who: L<string[]>;
  docs: L<string[]>;
  link: string;
  helpline?: { number: string; hours?: string };
  /** Trades for which this scheme is especially relevant. Others still see it. */
  forTrades?: Trade[];
}

const AADHAAR: L<string> = { en: 'Aadhaar card', hi: 'आधार कार्ड', mr: 'आधार कार्ड' };
const AADHAAR_MOBILE: L<string> = {
  en: 'Mobile number linked to Aadhaar',
  hi: 'आधार से जुड़ा मोबाइल नंबर',
  mr: 'आधारशी जोडलेला मोबाइल नंबर',
};
const BANK: L<string> = {
  en: 'Bank account details (account number and IFSC code)',
  hi: 'बैंक खाते की जानकारी (खाता नंबर और IFSC कोड)',
  mr: 'बँक खात्याची माहिती (खाते क्रमांक आणि IFSC कोड)',
};
const list = (...items: L<string>[]): L<string[]> => ({
  en: items.map((i) => i.en),
  hi: items.map((i) => i.hi),
  mr: items.map((i) => i.mr),
});

export const SCHEMES: Scheme[] = [
  {
    id: 'eshram',
    name: {
      en: 'e-Shram card (national worker registry)',
      hi: 'ई-श्रम कार्ड (राष्ट्रीय श्रमिक पंजीकरण)',
      mr: 'ई-श्रम कार्ड (राष्ट्रीय कामगार नोंदणी)',
    },
    summary: {
      en: 'Free national registration for unorganised workers. Registered workers are covered by accident insurance (PMSBY): ₹2 lakh for accidental death or permanent disability and ₹1 lakh for partial disability. Check the portal for the current premium arrangement.',
      hi: 'असंगठित मज़दूरों के लिए मुफ़्त राष्ट्रीय पंजीकरण। पंजीकृत मज़दूरों को दुर्घटना बीमा (PMSBY) मिलता है: दुर्घटना में मृत्यु या स्थायी विकलांगता पर ₹2 लाख, आंशिक विकलांगता पर ₹1 लाख। मौजूदा प्रीमियम की व्यवस्था पोर्टल पर देखें।',
      mr: 'असंघटित कामगारांसाठी मोफत राष्ट्रीय नोंदणी. नोंदणीकृत कामगारांना अपघात विमा (PMSBY) मिळतो: अपघाती मृत्यू किंवा कायमच्या अपंगत्वासाठी ₹2 लाख, अंशतः अपंगत्वासाठी ₹1 लाख. सध्याची प्रीमियम व्यवस्था पोर्टलवर पहा.',
    },
    who: list(
      { en: 'Age 16 to 59', hi: '16 से 59 साल की उम्र', mr: '16 ते 59 वर्षे वय' },
      { en: 'Work in the unorganised sector', hi: 'असंगठित क्षेत्र में काम करते हों', mr: 'असंघटित क्षेत्रात काम करत असाल' },
      { en: 'Not a member of EPFO or ESIC', hi: 'EPFO या ESIC के सदस्य न हों', mr: 'EPFO किंवा ESIC चे सदस्य नसावे' },
      { en: 'Not an income tax payer', hi: 'आयकर देने वाले न हों', mr: 'आयकर भरणारे नसावे' },
    ),
    docs: list(AADHAAR, AADHAAR_MOBILE, BANK),
    link: 'https://eshram.gov.in/',
    helpline: { number: '14434', hours: '9:00 - 18:00' },
  },
  {
    id: 'pmsym',
    name: {
      en: 'PM Shram Yogi Maan-dhan (old-age pension)',
      hi: 'पीएम श्रम योगी मान-धन (बुढ़ापे की पेंशन)',
      mr: 'पीएम श्रम योगी मान-धन (वृद्धापकाळ पेन्शन)',
    },
    summary: {
      en: 'A voluntary pension scheme. Join between age 18 and 40, pay a small monthly amount, and the Government of India adds a matching amount. After age 60 you get an assured pension of ₹3,000 a month.',
      hi: 'स्वैच्छिक पेंशन योजना। 18 से 40 साल की उम्र में जुड़ें, हर महीने थोड़ी रकम जमा करें, और भारत सरकार उतनी ही रकम जोड़ती है। 60 साल के बाद हर महीने ₹3,000 की पक्की पेंशन मिलती है।',
      mr: 'ऐच्छिक पेन्शन योजना. 18 ते 40 वयात सामील व्हा, दरमहा थोडी रक्कम भरा, आणि भारत सरकार तितकीच रक्कम जमा करते. 60 वर्षांनंतर दरमहा ₹3,000 ची निश्चित पेन्शन मिळते.',
    },
    who: list(
      { en: 'Age 18 to 40 when you join', hi: 'जुड़ते समय 18 से 40 साल की उम्र', mr: 'सामील होताना 18 ते 40 वर्षे वय' },
      { en: 'Monthly income up to ₹15,000', hi: 'महीने की कमाई ₹15,000 तक', mr: 'दरमहा उत्पन्न ₹15,000 पर्यंत' },
      { en: 'Work in the unorganised sector', hi: 'असंगठित क्षेत्र में काम करते हों', mr: 'असंघटित क्षेत्रात काम करत असाल' },
      { en: 'Read the exclusions on the official site before joining', hi: 'जुड़ने से पहले आधिकारिक साइट पर बाहर रखे गए लोगों की शर्तें पढ़ें', mr: 'सामील होण्यापूर्वी अधिकृत साइटवरील अपवाद वाचा' },
    ),
    docs: list(AADHAAR, AADHAAR_MOBILE, BANK),
    link: 'https://maandhan.in/',
    helpline: { number: '14434' },
  },
  {
    id: 'pmsby',
    name: {
      en: 'PM Suraksha Bima Yojana (accident insurance)',
      hi: 'पीएम सुरक्षा बीमा योजना (दुर्घटना बीमा)',
      mr: 'पीएम सुरक्षा विमा योजना (अपघात विमा)',
    },
    summary: {
      en: 'Accident cover that costs ₹20 a year (when checked), taken automatically from your bank account: ₹2 lakh for accidental death or full disability and ₹1 lakh for partial disability. It renews every year from 1 June to 31 May.',
      hi: 'दुर्घटना बीमा, जिसका प्रीमियम ₹20 साल (जाँच के समय) है और बैंक खाते से अपने आप कटता है: दुर्घटना में मृत्यु या पूरी विकलांगता पर ₹2 लाख, आंशिक विकलांगता पर ₹1 लाख। हर साल 1 जून से 31 मई तक नवीनीकरण होता है।',
      mr: 'अपघात विमा, ज्याचा प्रीमियम ₹20 वर्ष (तपासताना) आहे आणि बँक खात्यातून आपोआप कापला जातो: अपघाती मृत्यू किंवा पूर्ण अपंगत्वासाठी ₹2 लाख, अंशतः अपंगत्वासाठी ₹1 लाख. दरवर्षी 1 जून ते 31 मे नूतनीकरण होते.',
    },
    who: list(
      { en: 'Age 18 to 70', hi: '18 से 70 साल की उम्र', mr: '18 ते 70 वर्षे वय' },
      { en: 'A bank or post office savings account', hi: 'बैंक या डाकघर का बचत खाता', mr: 'बँक किंवा पोस्ट ऑफिसचे बचत खाते' },
      { en: 'Your consent for the yearly auto-debit', hi: 'हर साल अपने आप पैसे कटने की आपकी सहमति', mr: 'दरवर्षी आपोआप पैसे कापण्यास तुमची संमती' },
    ),
    docs: list(AADHAAR, BANK),
    link: 'https://jansuraksha.gov.in/',
  },
  {
    id: 'pmjjby',
    name: {
      en: 'PM Jeevan Jyoti Bima Yojana (life insurance)',
      hi: 'पीएम जीवन ज्योति बीमा योजना (जीवन बीमा)',
      mr: 'पीएम जीवन ज्योती विमा योजना (जीवन विमा)',
    },
    summary: {
      en: 'Life cover of ₹2 lakh paid to your family if you die from any cause. It costs ₹436 a year (when checked), taken from your bank account. Death from illness in the first 30 days after joining is not covered; accidental death is covered from day one.',
      hi: 'किसी भी कारण से मृत्यु होने पर आपके परिवार को ₹2 लाख का जीवन बीमा। इसका प्रीमियम ₹436 साल (जाँच के समय) है, जो बैंक खाते से कटता है। जुड़ने के पहले 30 दिन में बीमारी से मृत्यु शामिल नहीं है; दुर्घटना में मृत्यु पहले दिन से शामिल है।',
      mr: 'कोणत्याही कारणाने मृत्यू झाल्यास तुमच्या कुटुंबाला ₹2 लाखांचा जीवन विमा. प्रीमियम ₹436 वर्ष (तपासताना) असून तो बँक खात्यातून कापला जातो. सामील झाल्यापासून पहिल्या 30 दिवसांत आजाराने मृत्यू झाल्यास लाभ नाही; अपघाती मृत्यू पहिल्या दिवसापासून समाविष्ट आहे.',
    },
    who: list(
      { en: 'Age 18 to 50 to join (cover can continue to age 55)', hi: 'जुड़ने के लिए 18 से 50 साल (बीमा 55 साल तक चल सकता है)', mr: 'सामील होण्यासाठी 18 ते 50 वर्षे (विमा 55 वर्षांपर्यंत चालू राहू शकतो)' },
      { en: 'A bank or post office savings account', hi: 'बैंक या डाकघर का बचत खाता', mr: 'बँक किंवा पोस्ट ऑफिसचे बचत खाते' },
      { en: 'Your consent for the yearly auto-debit', hi: 'हर साल अपने आप पैसे कटने की आपकी सहमति', mr: 'दरवर्षी आपोआप पैसे कापण्यास तुमची संमती' },
    ),
    docs: list(AADHAAR, BANK),
    link: 'https://jansuraksha.gov.in/',
  },
  {
    id: 'pmjay',
    name: {
      en: 'Ayushman Bharat PM-JAY (health insurance)',
      hi: 'आयुष्मान भारत पीएम-जेएवाई (स्वास्थ्य बीमा)',
      mr: 'आयुष्मान भारत पीएम-जेएवाय (आरोग्य विमा)',
    },
    summary: {
      en: 'Cashless hospital treatment up to ₹5 lakh per family per year at listed government and private hospitals. Whether your family qualifies depends on the government list, so check it before you need treatment.',
      hi: 'सूचीबद्ध सरकारी और निजी अस्पतालों में हर परिवार को साल में ₹5 लाख तक का कैशलेस इलाज। आपका परिवार पात्र है या नहीं, यह सरकारी सूची पर निर्भर करता है, इसलिए इलाज की ज़रूरत पड़ने से पहले जाँच लें।',
      mr: 'सूचीतील सरकारी आणि खाजगी रुग्णालयांत प्रत्येक कुटुंबाला वर्षाला ₹5 लाखांपर्यंत कॅशलेस उपचार. तुमचे कुटुंब पात्र आहे का हे सरकारी यादीवर अवलंबून आहे, म्हणून उपचार लागण्यापूर्वी तपासा.',
    },
    who: list(
      { en: 'Your family must be on the government eligibility list', hi: 'आपका परिवार सरकारी पात्रता सूची में होना चाहिए', mr: 'तुमचे कुटुंब सरकारी पात्रता यादीत असले पाहिजे' },
      { en: 'Check by calling 14555 or on mera.pmjay.gov.in', hi: '14555 पर फ़ोन करके या mera.pmjay.gov.in पर जाँचें', mr: '14555 वर फोन करून किंवा mera.pmjay.gov.in वर तपासा' },
      { en: 'Adults aged 70 and above can also qualify', hi: '70 साल या उससे ज़्यादा उम्र के लोग भी पात्र हो सकते हैं', mr: '70 वर्षे किंवा त्याहून जास्त वयाचे लोकही पात्र ठरू शकतात' },
    ),
    docs: list(AADHAAR, {
      en: 'Other papers: ask at the Ayushman Mitra desk of a hospital or at a Common Service Centre',
      hi: 'बाकी कागज़: अस्पताल के आयुष्मान मित्र डेस्क या कॉमन सर्विस सेंटर पर पूछें',
      mr: 'इतर कागदपत्रे: रुग्णालयातील आयुष्मान मित्र डेस्क किंवा कॉमन सर्व्हिस सेंटरवर विचारा',
    }),
    link: 'https://nha.gov.in/PM-JAY',
    helpline: { number: '14555' },
  },
  {
    id: 'mahabocw',
    name: {
      en: 'Maharashtra Building Workers Welfare Board',
      hi: 'महाराष्ट्र इमारत और अन्य निर्माण कामगार कल्याण मंडळ',
      mr: 'महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याण मंडळ',
    },
    summary: {
      en: 'For building and construction workers in Maharashtra: a health scheme, help after accidents or death, and support for your children\'s education. Register with the board to claim.',
      hi: 'महाराष्ट्र के इमारत और निर्माण कामगारों के लिए: स्वास्थ्य योजना, दुर्घटना या मृत्यु पर मदद, और बच्चों की पढ़ाई के लिए सहायता। लाभ लेने के लिए मंडळ में पंजीकरण करें।',
      mr: 'महाराष्ट्रातील इमारत व बांधकाम कामगारांसाठी: आरोग्य योजना, अपघात किंवा मृत्यूनंतर मदत, आणि मुलांच्या शिक्षणासाठी सहाय्य. लाभ घेण्यासाठी मंडळात नोंदणी करा.',
    },
    who: list(
      { en: 'Age 18 to 60', hi: '18 से 60 साल की उम्र', mr: '18 ते 60 वर्षे वय' },
      { en: 'Worked more than 90 days at construction sites in the last 12 months', hi: 'पिछले 12 महीनों में निर्माण स्थलों पर 90 दिन से ज़्यादा काम किया हो', mr: 'गेल्या 12 महिन्यांत बांधकाम ठिकाणी 90 दिवसांपेक्षा जास्त काम केले असावे' },
    ),
    docs: list(
      { en: 'Proof of age', hi: 'उम्र का प्रमाण', mr: 'वयाचा पुरावा' },
      { en: 'Certificate proving 90 days of work', hi: '90 दिन के काम का प्रमाणपत्र', mr: '90 दिवस कामाचे प्रमाणपत्र' },
      { en: 'Residence proof', hi: 'निवास का प्रमाण', mr: 'रहिवासाचा पुरावा' },
      { en: 'Identity proof', hi: 'पहचान का प्रमाण', mr: 'ओळखीचा पुरावा' },
      { en: 'Three passport-size photos', hi: 'तीन पासपोर्ट साइज़ फ़ोटो', mr: 'तीन पासपोर्ट साइज फोटो' },
      { en: 'Form V (download from the board website)', hi: 'फ़ॉर्म V (मंडळ की वेबसाइट से डाउनलोड करें)', mr: 'फॉर्म V (मंडळाच्या वेबसाइटवरून डाउनलोड करा)' },
    ),
    link: 'https://mahabocw.in/',
    helpline: { number: '1800-8892-816', hours: '10:00 - 18:00' },
    forTrades: ['plumbing', 'electric', 'paint', 'carpentry', 'masonry', 'labour'],
  },
  {
    id: 'pmvishwakarma',
    name: {
      en: 'PM Vishwakarma (craftspeople)',
      hi: 'पीएम विश्वकर्मा (कारीगरों के लिए)',
      mr: 'पीएम विश्वकर्मा (कारागिरांसाठी)',
    },
    summary: {
      en: 'For traditional craftspeople such as carpenters and masons: a Vishwakarma certificate and ID card, skill training with a ₹500 daily stipend, a ₹15,000 toolkit grant, and loans without collateral (₹1 lakh, then ₹2 lakh) at 5% interest.',
      hi: 'बढ़ई और राजमिस्त्री जैसे पारंपरिक कारीगरों के लिए: विश्वकर्मा प्रमाणपत्र और पहचान पत्र, ₹500 रोज़ के वज़ीफ़े के साथ कौशल प्रशिक्षण, ₹15,000 का टूलकिट अनुदान, और बिना गारंटी का कर्ज़ (₹1 लाख, फिर ₹2 लाख) 5% ब्याज पर।',
      mr: 'सुतार आणि गवंडी यांसारख्या पारंपरिक कारागिरांसाठी: विश्वकर्मा प्रमाणपत्र व ओळखपत्र, ₹500 दैनिक भत्त्यासह कौशल्य प्रशिक्षण, ₹15,000 चे टूलकिट अनुदान, आणि विनातारण कर्ज (₹1 लाख, नंतर ₹2 लाख) 5% व्याजाने.',
    },
    who: list(
      { en: 'Age 18 or above', hi: '18 साल या उससे ज़्यादा', mr: '18 वर्षे किंवा जास्त' },
      { en: 'Work with your hands and tools in one of the 18 listed trades, including carpenter and mason', hi: 'सूची के 18 कामों में से किसी में हाथ और औज़ार से काम करते हों, जैसे बढ़ई और राजमिस्त्री', mr: 'यादीतील 18 व्यवसायांपैकी एकात हात आणि अवजारांनी काम करत असाल, उदा. सुतार आणि गवंडी' },
      { en: 'Plumbers, electricians and painters are not on the list', hi: 'प्लंबर, इलेक्ट्रीशियन और पेंटर इस सूची में नहीं हैं', mr: 'प्लंबर, इलेक्ट्रिशियन आणि पेंटर या यादीत नाहीत' },
      { en: 'No similar government self-employment loan (PMEGP, PM SVANidhi, Mudra) in the last 5 years', hi: 'पिछले 5 सालों में ऐसा सरकारी स्वरोज़गार कर्ज़ (PMEGP, PM स्वनिधि, मुद्रा) न लिया हो', mr: 'गेल्या 5 वर्षांत असे सरकारी स्वयंरोजगार कर्ज (PMEGP, PM स्वनिधी, मुद्रा) घेतले नसावे' },
      { en: 'One person per family; not a government employee', hi: 'परिवार में एक ही व्यक्ति; सरकारी कर्मचारी न हों', mr: 'कुटुंबातील एकच व्यक्ती; सरकारी कर्मचारी नसावे' },
    ),
    docs: list(AADHAAR, AADHAAR_MOBILE, BANK, {
      en: 'See "How to Register" on the official portal for the current steps',
      hi: 'मौजूदा तरीका जानने के लिए आधिकारिक पोर्टल पर "How to Register" देखें',
      mr: 'सध्याची पद्धत जाणून घेण्यासाठी अधिकृत पोर्टलवर "How to Register" पहा',
    }),
    link: 'https://pmvishwakarma.gov.in/',
    forTrades: ['carpentry', 'masonry'],
  },
];

/** Free legal aid, used by the unpaid-wages helper. */
export const LEGAL_AID = { helpline: '15100', site: 'https://nalsa.gov.in/' } as const;

export interface EligibilityAnswers {
  age: number | null;
  trade: Trade | null;
  /** Monthly income is Rs 15,000 or less. */
  lowIncome: boolean | null;
  /** Member of EPFO or ESIC, or pays income tax. */
  formalOrTaxpayer: boolean | null;
  /** More than 90 days of construction-site work in the last 12 months. */
  siteWork90: boolean | null;
}

export type Fit = 'likely' | 'unlikely' | 'check';

/**
 * A first-pass read of which schemes may fit, from a few simple answers.
 * It only informs: "likely" means the answers match the published basics, and
 * "unlikely" means at least one published basic is not met. Final eligibility
 * is always decided by the scheme itself.
 */
export function evaluateFit(id: Scheme['id'], a: EligibilityAnswers): Fit {
  const { age } = a;
  const inRange = (lo: number, hi: number) => age !== null && age >= lo && age <= hi;
  const ageKnown = age !== null;

  switch (id) {
    case 'eshram':
      if (ageKnown && !inRange(16, 59)) return 'unlikely';
      if (a.formalOrTaxpayer === true) return 'unlikely';
      return ageKnown && a.formalOrTaxpayer === false ? 'likely' : 'check';
    case 'pmsym':
      if (ageKnown && !inRange(18, 40)) return 'unlikely';
      if (a.lowIncome === false) return 'unlikely';
      return ageKnown && a.lowIncome === true ? 'likely' : 'check';
    case 'pmsby':
      if (ageKnown && !inRange(18, 70)) return 'unlikely';
      return ageKnown ? 'likely' : 'check';
    case 'pmjjby':
      if (ageKnown && !inRange(18, 50)) return 'unlikely';
      return ageKnown ? 'likely' : 'check';
    case 'pmjay':
      return 'check';
    case 'mahabocw':
      if (ageKnown && !inRange(18, 60)) return 'unlikely';
      if (a.siteWork90 === false) return 'unlikely';
      return ageKnown && a.siteWork90 === true ? 'likely' : 'check';
    case 'pmvishwakarma':
      if (age !== null && age < 18) return 'unlikely';
      if (a.trade !== null && a.trade !== 'carpentry' && a.trade !== 'masonry') return 'unlikely';
      return ageKnown && a.trade !== null ? 'likely' : 'check';
  }
}
