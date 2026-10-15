import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ApiError } from './api';
import type { Experience, Lang, Localized, PaymentMethod, PaymentWhen, Trade } from './types';

/** Device-level language preference. Synced to the profile when signed in. */
export const useLang = create<{ lang: Lang; setLang: (lang: Lang) => void }>()(
  persist((set) => ({ lang: 'en', setLang: (lang) => set({ lang }) }), {
    name: 'hunar-lang',
    storage: createJSONStorage(() => localStorage),
  }),
);

/** Pick the copy block for the current language. Every block must have the same keys. */
export function useCopy<T>(copy: Record<Lang, T>): T {
  const lang = useLang((s) => s.lang);
  return copy[lang];
}

export const LOCALE: Record<Lang, string> = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' };
export const SPEECH_LANG: Record<Lang, string> = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' };

/** Best available text from a localized field: current language, then English, Hindi, Marathi. */
export function localizedText(text: Localized, lang: Lang): string {
  return text[lang] || text.en || text.hi || text.mr || '';
}

export const LANG_BUTTON: Record<Lang, string> = { hi: 'हिं', mr: 'म', en: 'EN' };
export const LANG_NAME: Record<Lang, string> = { hi: 'हिंदी', mr: 'मराठी', en: 'English' };

export const TRADE_LABEL: Record<Trade, Record<Lang, string>> = {
  plumbing: { en: 'Plumber', hi: 'प्लंबर', mr: 'प्लंबर' },
  electric: { en: 'Electrician', hi: 'इलेक्ट्रीशियन', mr: 'इलेक्ट्रिशियन' },
  paint: { en: 'Painter', hi: 'पेंटर', mr: 'पेंटर' },
  carpentry: { en: 'Carpenter', hi: 'बढ़ई', mr: 'सुतार' },
  masonry: { en: 'Mason', hi: 'राजमिस्त्री', mr: 'गवंडी' },
  cleaning: { en: 'Cleaning', hi: 'सफ़ाई', mr: 'साफसफाई' },
  labour: { en: 'Helper / Labour', hi: 'मज़दूर / हेल्पर', mr: 'मजूर / हेल्पर' },
};

export const EXPERIENCE_LABEL: Record<Experience, Record<Lang, string>> = {
  '0-2': { en: 'Under 2 years', hi: '2 साल से कम', mr: '2 वर्षांपेक्षा कमी' },
  '3-10': { en: '3 to 10 years', hi: '3 से 10 साल', mr: '3 ते 10 वर्षे' },
  '10+': { en: 'Over 10 years', hi: '10 साल से ज़्यादा', mr: '10 वर्षांहून अधिक' },
};

export const PAYMENT_WHEN_LABEL: Record<PaymentWhen, Record<Lang, string>> = {
  after_work: { en: 'Full payment after work', hi: 'काम के बाद पूरा भुगतान', mr: 'काम झाल्यावर पूर्ण पैसे' },
  advance_part: { en: 'Part advance, rest after work', hi: 'कुछ पैसे पहले, बाकी काम के बाद', mr: 'काही पैसे आधी, बाकी काम झाल्यावर' },
  daily: { en: 'Paid at the end of each day', hi: 'हर दिन शाम को भुगतान', mr: 'रोज संध्याकाळी पैसे' },
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, Record<Lang, string>> = {
  either: { en: 'Cash or UPI', hi: 'नकद या UPI', mr: 'रोख किंवा UPI' },
  cash: { en: 'Cash', hi: 'नकद', mr: 'रोख' },
  upi: { en: 'UPI', hi: 'UPI', mr: 'UPI' },
};

const ERROR_COPY: Record<string, Record<Lang, string>> = {
  network: {
    en: 'No internet connection. Check your network and try again.',
    hi: 'इंटरनेट नहीं है। नेटवर्क देखकर फिर कोशिश करें।',
    mr: 'इंटरनेट नाही. नेटवर्क तपासून पुन्हा प्रयत्न करा.',
  },
  phone_taken: {
    en: 'This number already has an account. Please sign in instead.',
    hi: 'इस नंबर से खाता पहले से है। कृपया साइन इन करें।',
    mr: 'या नंबरचे खाते आधीच आहे. कृपया साइन इन करा.',
  },
  job_taken: {
    en: 'Another worker has already taken this job.',
    hi: 'यह काम किसी और कारीगर ने ले लिया है।',
    mr: 'हे काम दुसऱ्या कारागिराने घेतले आहे.',
  },
  ai_unavailable: {
    en: 'The assistant is busy right now. Please try again, or fill in the details yourself.',
    hi: 'सहायक अभी व्यस्त है। फिर कोशिश करें, या खुद जानकारी भरें।',
    mr: 'मदतनीस आत्ता व्यस्त आहे. पुन्हा प्रयत्न करा, किंवा स्वतः माहिती भरा.',
  },
  rate_limited: {
    en: 'Too many tries. Please wait a few minutes.',
    hi: 'बहुत बार कोशिश हुई। कृपया कुछ मिनट रुकें।',
    mr: 'खूप वेळा प्रयत्न झाले. कृपया काही मिनिटे थांबा.',
  },
  invalid_input: {
    en: 'Some details are missing or not valid. Please check the form.',
    hi: 'कुछ जानकारी अधूरी या गलत है। कृपया फ़ॉर्म देखें।',
    mr: 'काही माहिती अपूर्ण किंवा चुकीची आहे. कृपया फॉर्म तपासा.',
  },
  server_error: {
    en: 'Something went wrong. Please try again.',
    hi: 'कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।',
    mr: 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.',
  },
};

/** A user-facing message for any thrown error, in the current language when we have one. */
export function errorText(err: unknown, lang: Lang): string {
  if (err instanceof ApiError) {
    const known = ERROR_COPY[err.code];
    if (known) return known[lang];
    if (lang === 'en' || err.status < 500) return err.message;
  }
  return ERROR_COPY.server_error![lang];
}
