import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Check, ImagePlus, LoaderCircle, LocateFixed, Mic, Pencil, RotateCcw, Send, ShieldCheck, Square, TriangleAlert, X } from 'lucide-react';
import { Notice, TradeIcon } from '@/components/common';
import { Listen } from '@/components/hunar-shell';
import { Button } from '@/components/ui/button';
import { descriptionFrom, draftToFormInitial, draftToNewJob, readLastCity, rememberCity, type FormInitial } from '@/lib/chat';
import { canListen, getCurrentPosition, listen, photoToJpeg, type Coords, type Listening } from '@/lib/device';
import { paymentText, payText } from '@/lib/format';
import { errorText, localizedText, TRADE_LABEL, useLang } from '@/lib/i18n';
import { useChatTurn, useCreateJob, usePayCheck } from '@/lib/queries';
import type { ChatDraft, ChatField, ChatOption, ChatProgress, ChatResult, ChatTurn, Job, Lang } from '@/lib/types';

const COPY = {
  en: {
    greeting: 'Hello! Tell me what needs fixing. You can type, speak, or send a photo.',
    placeholder: 'Fan not working, up to ₹500, today',
    takePhoto: 'Take a photo',
    gallery: 'From gallery',
    removePhoto: 'Remove photo',
    photoFailed: 'Could not read this photo. Try another one.',
    send: 'Send',
    speak: 'Speak',
    stopSpeaking: 'Stop',
    listening: 'Listening...',
    micDenied: 'The microphone is blocked. Allow it in your browser settings, or type instead.',
    micFailed: 'Could not hear you. Please try again or type.',
    thinking: 'One moment...',
    ticketReady: 'Here is your ticket. Check it and post.',
    handOver: 'Let us finish the details together here.',
    tryAgain: 'Try again',
    fillForm: 'Fill the form myself',
    startOver: 'Start over',
    progress: (done: number, total: number) => `${done} of ${total} details`,
    previewTitle: 'Your ticket',
    total: 'Total pay',
    daily: 'Daily wage',
    lowPay: 'This may be low for this work. Raise your offer for faster replies, and talk about material costs with the worker. You can still post.',
    post: 'Post job',
    posting: 'Posting...',
    edit: 'Edit',
    addLocation: 'Add my current location',
    locationAdded: 'Location added',
    locationHint: 'Nearby workers see the job first. Only the distance is shown to them.',
    locationFailed: 'Could not get your location. The area name is enough.',
    materials: 'Materials are paid separately. Never ask a worker to pay a fee to get work.',
  },
  hi: {
    greeting: 'नमस्ते! बताइए क्या ठीक करवाना है। लिखें, बोलें या फ़ोटो भेजें।',
    placeholder: 'पंखा नहीं चल रहा, ₹500 तक, आज',
    takePhoto: 'फ़ोटो खींचें',
    gallery: 'गैलरी से',
    removePhoto: 'फ़ोटो हटाएँ',
    photoFailed: 'यह फ़ोटो नहीं पढ़ी जा सकी। दूसरी फ़ोटो डालें।',
    send: 'भेजें',
    speak: 'बोलें',
    stopSpeaking: 'रोकें',
    listening: 'सुन रहा हूँ...',
    micDenied: 'माइक्रोफ़ोन बंद है। ब्राउज़र सेटिंग में अनुमति दें, या लिखकर बताएँ।',
    micFailed: 'आपकी आवाज़ नहीं सुन पाया। फिर कोशिश करें या लिखें।',
    thinking: 'एक पल...',
    ticketReady: 'यह आपका टिकट है। देखकर डाल दें।',
    handOver: 'बाकी जानकारी यहाँ भर लेते हैं।',
    tryAgain: 'फिर कोशिश करें',
    fillForm: 'मैं खुद फ़ॉर्म भरता हूँ',
    startOver: 'फिर से शुरू करें',
    progress: (done: number, total: number) => `${total} में से ${done} जानकारी`,
    previewTitle: 'आपका टिकट',
    total: 'कुल भुगतान',
    daily: 'रोज़ की मज़दूरी',
    lowPay: 'इस काम के लिए यह रकम कम हो सकती है। जल्दी जवाब के लिए रकम बढ़ाएँ, और सामान के खर्च पर कारीगर से बात करें। फिर भी काम डाल सकते हैं।',
    post: 'काम डालें',
    posting: 'डाला जा रहा है...',
    edit: 'बदलें',
    addLocation: 'मेरी अभी की लोकेशन जोड़ें',
    locationAdded: 'लोकेशन जुड़ गई',
    locationHint: 'पास के कारीगर काम पहले देखेंगे। उन्हें सिर्फ़ दूरी दिखेगी।',
    locationFailed: 'लोकेशन नहीं मिली। इलाके का नाम काफ़ी है।',
    materials: 'सामान का खर्च अलग से दें। काम देने के बदले कारीगर से कभी फीस न माँगें।',
  },
  mr: {
    greeting: 'नमस्कार! काय दुरुस्त करायचे आहे ते सांगा. लिहा, बोला किंवा फोटो पाठवा.',
    placeholder: 'पंखा चालत नाही, ₹500 पर्यंत, आज',
    takePhoto: 'फोटो काढा',
    gallery: 'गॅलरीतून',
    removePhoto: 'फोटो काढून टाका',
    photoFailed: 'हा फोटो वाचता आला नाही. दुसरा फोटो टाका.',
    send: 'पाठवा',
    speak: 'बोला',
    stopSpeaking: 'थांबवा',
    listening: 'ऐकत आहे...',
    micDenied: 'मायक्रोफोन बंद आहे. ब्राउझर सेटिंगमध्ये परवानगी द्या, किंवा लिहा.',
    micFailed: 'तुमचा आवाज ऐकू आला नाही. पुन्हा प्रयत्न करा किंवा लिहा.',
    thinking: 'एक क्षण...',
    ticketReady: 'हे तुमचे तिकीट आहे. तपासून टाका.',
    handOver: 'उरलेली माहिती इथे भरूया.',
    tryAgain: 'पुन्हा प्रयत्न करा',
    fillForm: 'मी स्वतः फॉर्म भरतो',
    startOver: 'पुन्हा सुरू करा',
    progress: (done: number, total: number) => `${total} पैकी ${done} माहिती`,
    previewTitle: 'तुमचे तिकीट',
    total: 'एकूण पैसे',
    daily: 'रोजची मजुरी',
    lowPay: 'या कामासाठी ही रक्कम कमी असू शकते. लवकर उत्तरासाठी रक्कम वाढवा आणि साहित्याच्या खर्चावर कारागिराशी बोला. तरीही काम टाकू शकता.',
    post: 'काम टाका',
    posting: 'टाकत आहे...',
    edit: 'बदला',
    addLocation: 'माझे सध्याचे लोकेशन जोडा',
    locationAdded: 'लोकेशन जोडले',
    locationHint: 'जवळचे कारागीर काम आधी पाहतील. त्यांना फक्त अंतर दिसेल.',
    locationFailed: 'लोकेशन मिळाले नाही. भागाचे नाव पुरेसे आहे.',
    materials: 'साहित्याचा खर्च वेगळा द्या. काम देण्यासाठी कारागिराकडून कधीही फी मागू नका.',
  },
} satisfies Record<Lang, unknown>;

interface Item {
  id: number;
  role: 'customer' | 'assistant';
  text: string;
  field?: ChatField;
  value?: string;
  /** Photo thumbnail, shown only in the customer's first bubble. */
  image?: string;
  options?: ChatOption[];
}

const toTurns = (items: Item[]): ChatTurn[] =>
  items.map((i) => ({
    role: i.role,
    text: i.text,
    ...(i.field ? { field: i.field } : {}),
    ...(i.value ? { value: i.value } : {}),
  }));

/** Five lotus petals that fill in as the ticket gets complete. */
function PetalProgress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <span className="petals" role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 120 38" width="96" height="30" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => {
          const angle = (i - (total - 1) / 2) * 23;
          return (
            <path
              key={i}
              d="M0 -2 C 8 -12 8 -27 0 -35 C -8 -27 -8 -12 0 -2 Z"
              transform={`translate(60 37) rotate(${angle})`}
              fill={i < done ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    </span>
  );
}

export function JobChat({ onPosted, onManual }: { onPosted: (job: Job) => void; onManual: (initial: FormInitial) => void }) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const chat = useChatTurn();
  const create = useCreateJob();

  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<ChatDraft | null>(null);
  const [progress, setProgress] = useState<ChatProgress | null>(null);
  const [result, setResult] = useState<ChatResult | null>(null);
  const [image, setImage] = useState<{ dataUrl: string; base64: string } | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [input, setInput] = useState('');
  const [failed, setFailed] = useState<unknown>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locFailed, setLocFailed] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const micRef = useRef<Listening | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const pending = chat.isPending;
  const last = items[items.length - 1];
  const done = progress?.done ?? 0;
  const total = progress?.total ?? 5;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [items.length, pending, result?.action, failed]);

  useEffect(() => () => micRef.current?.stop(), []);

  function request(base: Item[], img: { dataUrl: string; base64: string } | null) {
    setFailed(null);
    const cityHint = readLastCity();
    chat.mutate(
      {
        lang,
        turns: toTurns(base),
        ...(draft ? { draft } : {}),
        ...(!draft && img ? { image: { mimeType: 'image/jpeg' as const, base64: img.base64 } } : {}),
        ...(cityHint ? { cityHint } : {}),
      },
      {
        onSuccess: (r) => handleResult(r, base),
        onError: (err) => setFailed(err),
      },
    );
  }

  function handleResult(r: ChatResult, base: Item[]) {
    setImage(null);
    setDraft(r.draft);
    setProgress(r.progress);
    setResult(r);
    const id = nextId.current++;
    if (r.action === 'ask') {
      setItems([...base, { id, role: 'assistant', text: r.question[lang], field: r.field, options: r.options }]);
    } else if (r.action === 'create') {
      setItems([...base, { id, role: 'assistant', text: c.ticketReady }]);
    } else {
      setItems([...base, { id, role: 'assistant', text: c.handOver }]);
      onManual(draftToFormInitial(r.draft, descriptionFrom(toTurns(base)), coords));
    }
  }

  function send(text: string, value?: string) {
    const clean = text.trim();
    const attaching = !draft && image !== null;
    if ((!clean && !attaching) || pending) return;
    micRef.current?.stop();
    const item: Item = {
      id: nextId.current++,
      role: 'customer',
      text: clean,
      ...(value ? { value } : {}),
      ...(attaching && image ? { image: image.dataUrl } : {}),
    };
    const base = [...items, item];
    setItems(base);
    setInput('');
    setResult(null);
    request(base, attaching ? image : null);
  }

  function retry() {
    request(items, !draft ? image : null);
  }

  function startOver() {
    micRef.current?.stop();
    chat.reset();
    create.reset();
    setItems([]);
    setDraft(null);
    setProgress(null);
    setResult(null);
    setImage(null);
    setInput('');
    setFailed(null);
    setCoords(null);
  }

  async function onPhoto(file: File | undefined) {
    setPhotoFailed(false);
    if (!file) return;
    try {
      setImage(await photoToJpeg(file));
    } catch {
      setImage(null);
      setPhotoFailed(true);
    }
  }

  function toggleMic() {
    if (micRef.current) {
      micRef.current.stop();
      return;
    }
    setMicError(null);
    const session = listen(lang, {
      onText: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
      onEnd: () => {
        micRef.current = null;
        setListening(false);
      },
      onError: (reason) => setMicError(reason === 'not-allowed' || reason === 'service-not-allowed' ? c.micDenied : c.micFailed),
    });
    if (session) {
      micRef.current = session;
      setListening(true);
    }
  }

  async function addLocation() {
    setLocFailed(false);
    try {
      setCoords(await getCurrentPosition());
    } catch {
      setLocFailed(true);
    }
  }

  function post() {
    if (!draft) return;
    const description = descriptionFrom(toTurns(items));
    const body = draftToNewJob(draft, { description, location: coords });
    if (!body) {
      onManual(draftToFormInitial(draft, description, coords));
      return;
    }
    create.mutate(body, {
      onSuccess: (job) => {
        rememberCity(job.city);
        onPosted(job);
      },
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  const showChips = !pending && !failed && result?.action === 'ask' && last?.role === 'assistant' && (last.options?.length ?? 0) > 0;
  const hasStarted = items.length > 0;
  const editDraft = () => {
    if (draft) onManual(draftToFormInitial(draft, descriptionFrom(toTurns(items)), coords));
  };

  return (
    <div className="chat">
      <div className="chat-head">
        {progress ? <PetalProgress done={done} total={total} label={c.progress(done, total)} /> : <span />}
        {hasStarted && (
          <Button type="button" variant="ghost" size="sm" onClick={startOver}>
            <RotateCcw />
            {c.startOver}
          </Button>
        )}
      </div>

      <div className="chat-log" role="log" aria-live="polite" aria-relevant="additions">
        <div className="bubble-row">
          <span className="agent-avatar" aria-hidden="true">
            ह
          </span>
          <div className="bubble agent">{c.greeting}</div>
        </div>

        {items.map((item) =>
          item.role === 'assistant' ? (
            <div className="bubble-row" key={item.id}>
              <span className="agent-avatar" aria-hidden="true">
                ह
              </span>
              <div className="bubble agent">
                {item.text}
                <Listen text={item.text} />
              </div>
            </div>
          ) : (
            <div className="bubble-row me" key={item.id}>
              <div className="bubble me">
                {item.image && <img src={item.image} alt="" />}
                {item.text}
              </div>
            </div>
          ),
        )}

        {showChips && last && (
          <div className="chat-chips" role="group" aria-label={last.text}>
            {last.options?.map((o) => (
              <button key={o.label} type="button" className="chip" onClick={() => send(o.label, o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        )}

        {pending && (
          <div className="bubble-row" role="status">
            <span className="agent-avatar" aria-hidden="true">
              ह
            </span>
            <div className="bubble agent typing">
              <LoaderCircle className="animate-spin" size={16} />
              {c.thinking}
            </div>
          </div>
        )}

        {failed !== null && !pending && (
          <div className="chat-error" role="alert">
            <Notice tone="error">{errorText(failed, lang)}</Notice>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button type="button" size="sm" onClick={retry}>
                <RotateCcw />
                {c.tryAgain}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onManual(draft ? draftToFormInitial(draft, descriptionFrom(toTurns(items)), coords) : { description: descriptionFrom(toTurns(items)) })}
              >
                <Pencil />
                {c.fillForm}
              </Button>
            </div>
          </div>
        )}

        {result?.action === 'create' && draft && !pending && (
          <TicketPreview
            draft={draft}
            coords={coords}
            locFailed={locFailed}
            posting={create.isPending}
            error={create.isError ? create.error : null}
            onAddLocation={() => void addLocation()}
            onClearLocation={() => setCoords(null)}
            onPost={post}
            onEdit={editDraft}
          />
        )}
        <div ref={endRef} className="chat-end" />
      </div>

      <form className="composer" onSubmit={submit}>
        {!draft && (
          <div className="composer-tools">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
            <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
            {image ? (
              <span className="attach-preview">
                <img src={image.dataUrl} alt="" />
                <button type="button" aria-label={c.removePhoto} title={c.removePhoto} onClick={() => setImage(null)}>
                  <X size={14} />
                </button>
              </span>
            ) : (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
                  <Camera />
                  {c.takePhoto}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => galleryRef.current?.click()}>
                  <ImagePlus />
                  {c.gallery}
                </Button>
              </>
            )}
            {photoFailed && <span className="hint">{c.photoFailed}</span>}
          </div>
        )}
        {micError && (
          <p className="field-error" role="alert">
            {micError}
          </p>
        )}
        <div className="composer-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? c.listening : c.placeholder}
            aria-label={c.placeholder}
            enterKeyHint="send"
            maxLength={600}
            autoComplete="off"
          />
          {canListen() && (
            <button
              type="button"
              className={`icon-btn ${listening ? 'active' : ''}`}
              aria-label={listening ? c.stopSpeaking : c.speak}
              title={listening ? c.stopSpeaking : c.speak}
              aria-pressed={listening}
              onClick={toggleMic}
            >
              {listening ? <Square size={18} /> : <Mic size={20} />}
            </button>
          )}
          <button type="submit" className="icon-btn primary" aria-label={c.send} title={c.send} disabled={pending || (!input.trim() && !(image && !draft))}>
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}

function TicketPreview({
  draft,
  coords,
  locFailed,
  posting,
  error,
  onAddLocation,
  onClearLocation,
  onPost,
  onEdit,
}: {
  draft: ChatDraft;
  coords: Coords | null;
  locFailed: boolean;
  posting: boolean;
  error: unknown;
  onAddLocation: () => void;
  onClearLocation: () => void;
  onPost: () => void;
  onEdit: () => void;
}) {
  const lang = useLang((s) => s.lang);
  const c = COPY[lang];
  const trade = draft.trade;
  const payCheck = usePayCheck(trade, draft.payAmount, draft.payUnit, draft.payDays || undefined);
  if (!trade || !draft.payUnit || !draft.payWhen || !draft.payMethod) return null;

  const pay = { amount: draft.payAmount, unit: draft.payUnit, ...(draft.payDays ? { days: draft.payDays } : {}) };
  const payment = { when: draft.payWhen, method: draft.payMethod, ...(draft.advance ? { advance: draft.advance } : {}) };
  const title = localizedText(draft.title, lang) || TRADE_LABEL[trade][lang];
  const summary = localizedText(draft.summary, lang);

  return (
    <section className="ticket-preview" aria-label={c.previewTitle}>
      <p className="eyebrow">{c.previewTitle}</p>
      <article className="job-card">
        <div className="job-top">
          <TradeIcon trade={trade} />
          <div className="min-w-0">
            <h3>{title}</h3>
            <p>{TRADE_LABEL[trade][lang]}</p>
          </div>
          <div className="job-pay">
            <strong>{payText(pay, lang)}</strong>
            <small>{draft.payUnit === 'per_day' ? c.daily : c.total}</small>
          </div>
        </div>
        {summary && <p className="job-description">{summary}</p>}
        <div className="job-meta">
          <span>
            {draft.locality}, {draft.city}
          </span>
          <span>{draft.when}</span>
          {draft.duration && <span>{draft.duration}</span>}
        </div>
        {payCheck.data === 'low' && (
          <p className="pay-flag">
            <TriangleAlert size={13} />
            {c.lowPay}
          </p>
        )}
        <div className="job-bottom">
          <span className="payment-info">
            <ShieldCheck size={13} />
            {paymentText(payment, lang)}
          </span>
        </div>
      </article>

      <div className="field">
        {coords ? (
          <span className="text-success flex items-center gap-2">
            <Check size={15} />
            {c.locationAdded}
            <Button type="button" variant="ghost" size="sm" onClick={onClearLocation} aria-label="Remove location">
              <X />
            </Button>
          </span>
        ) : (
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={onAddLocation}>
            <LocateFixed />
            {c.addLocation}
          </Button>
        )}
        <span className="hint">{locFailed ? c.locationFailed : c.locationHint}</span>
      </div>

      <Notice className="mb-3">{c.materials}</Notice>
      {error !== null && (
        <Notice tone="error" className="mb-3">
          {errorText(error, lang)}
        </Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" disabled={posting} onClick={onPost}>
          <Check />
          {posting ? c.posting : c.post}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={posting} onClick={onEdit}>
          <Pencil />
          {c.edit}
        </Button>
      </div>
    </section>
  );
}
