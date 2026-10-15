import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SPEECH_LANG } from './i18n';
import type { Lang } from './types';

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * The worker's "near me" point stays on this device only. It is sent as a query
 * parameter to sort the job feed by distance and is never stored on the server.
 */
export const useNearMe = create<{ coords: Coords | null; setCoords: (c: Coords | null) => void }>()(
  persist((set) => ({ coords: null, setCoords: (coords) => set({ coords }) }), {
    name: 'hunar-near-me',
    storage: createJSONStorage(() => localStorage),
  }),
);

export type GeoFailure = 'unsupported' | 'denied' | 'unavailable';

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeoError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new GeoError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
    );
  });
}

export class GeoError extends Error {
  constructor(readonly reason: GeoFailure) {
    super(reason);
  }
}

/** Read text aloud with the browser's speech engine. Returns false when unavailable. */
export function speak(text: string, lang: Lang): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG[lang];
  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Shrink a camera photo to a JPEG that is small enough to send to the job helper.
 * The photo is used only to describe the problem and is not stored.
 */
export async function photoToJpeg(file: File, maxSide = 1024, quality = 0.8): Promise<{ dataUrl: string; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(',') + 1) };
}

/** The part of the browser speech-recognition API we use (not in every TypeScript lib). */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True when this browser can turn speech into text (Chrome on Android works best). */
export const canListen = (): boolean => recognitionCtor() !== null;

export interface Listening {
  stop(): void;
}

/**
 * Listen once and report the transcript. `onError` receives the browser's reason, for example
 * "not-allowed" when the microphone permission was refused.
 */
export function listen(
  lang: Lang,
  handlers: { onText: (text: string) => void; onEnd: () => void; onError: (reason: string) => void },
): Listening | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = SPEECH_LANG[lang];
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript;
    if (transcript) handlers.onText(transcript);
  };
  recognition.onerror = (event) => handlers.onError(event.error);
  recognition.onend = () => handlers.onEnd();
  recognition.start();
  return { stop: () => recognition.stop() };
}
