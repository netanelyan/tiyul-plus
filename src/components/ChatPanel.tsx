'use client';

import { useEffect, useRef, useState } from 'react';
import type { Destination, Place } from '@/lib/types';
import type { TripChat } from '@/lib/trip/useTripChat';
import { fileToChatImage, IMAGE_ACCEPT } from '@/lib/trip/imageAttach';
import { cachedCity, fetchCities } from '@/lib/trip/cityData';
import PlacesMap from '@/components/PlacesMap';
import ThinkingIndicator from '@/components/ThinkingIndicator';

/**
 * פאנל השיחה עם הסוכן - תצוגה בלבד. ה-state יושב ב-useTripChat אצל
 * TripWorkspace, כך שאותה שיחה בדיוק מוצגת גם בעמודת הדסקטופ וגם במגירת
 * המובייל: הודעה שנשלחת מכאן מעדכנת את אותו Trip שמצויר במפה ובמסלול.
 */

/**
 * המפה הקטנה שמתחת להודעה מציירת עיר שהסוכן הזכיר, ולכן היא צריכה את
 * דאטת אותה עיר - אבל **בלי לייבא את הקטלוג**, שזו בדיוק הסיבה
 * ש-`/chat` הוריד 492kB דחוסים. היא לוקחת מהמטמון של `cityData`
 * (הערים של הטיול כבר שם), ואם העיר עוד לא נטענה - היא נטענת לבד.
 */
function useCity(slug: string): Destination | undefined {
  const [, bump] = useState(0);
  const cached = cachedCity(slug);
  useEffect(() => {
    if (cachedCity(slug)) return;
    let alive = true;
    void fetchCities([slug]).then(() => alive && bump((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [slug]);
  return cached;
}

/** מרנדר **מודגש** בסיסי בלי ספריות */
function renderText(text: string) {
  return text.split('\n').map((line, i) => (
    <p key={i} className="min-h-[0.5em]">
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        ),
      )}
    </p>
  ));
}

function MessageMap({ slug, placeIds }: { slug: string; placeIds: string[] }) {
  const dest = useCity(slug);
  if (!dest) return null;
  const places = placeIds
    .map((id) => dest.places.find((p) => p.id === id))
    .filter((p): p is Place => Boolean(p));
  if (places.length === 0) return null;
  return (
    <div className="mt-3 h-48 overflow-hidden rounded-2xl ring-1 ring-night/10">
      <PlacesMap center={dest.center} zoom={dest.zoom} places={places} />
    </div>
  );
}

// הצעות פתיחה לשיחה על טיול קיים - כולן פעולות עריכה על התוכנית שמוצגת
const STARTERS = ['תוסיף לי יום', 'תחליף מקום ביום הזה', 'מה כשר באזור?', 'תעשה לי יום רגוע יותר'];

export default function ChatPanel({
  chat,
  className = '',
  autoFocus = false,
  onClose,
  coach = false,
  onDismissCoach,
}: {
  chat: TripChat;
  className?: string;
  autoFocus?: boolean;
  onClose?: () => void;
  /**
   * רמז חד-פעמי מעל שורת הכתיבה. ה-state יושב ב-TripWorkspace ולא כאן,
   * כי הרכיב הזה מרונדר פעמיים (עמודה בדסקטופ + מגירה במובייל) - מקור
   * אמת אחד מבטיח שסגירה בצד אחד סוגרת גם בשני.
   */
  coach?: boolean;
  onDismissCoach?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { messages, loading, status, input, setInput, send, clearConversation } = chat;
  // תמונה שמחכה לשליחה (data URL מוקטן) + שגיאת בחירה קצרה
  const [pending, setPending] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setImgError(null);
    setReading(true);
    const data = await fileToChatImage(file);
    setReading(false);
    if (!data) {
      setImgError('לא הצלחנו לקרוא את התמונה. נסו צילום מסך או JPG/PNG קטן יותר.');
      return;
    }
    setPending(data);
  };

  const submit = () => {
    if (reading) return;
    const image = pending ?? undefined;
    setPending(null);
    setImgError(null);
    send(input, undefined, image);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  return (
    // מחלקת ה-display מגיעה מהקורא (hidden lg:flex בעמודה, flex במגירה)
    <section
      className={`min-h-0 flex-col overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10 ${className}`}
      aria-label="שיחה עם הסוכן"
    >
      {/*
        הכותרת הייתה 12px אפור ליד "הסוכן" - הרכיב שעושה את כל העבודה
        במוצר היה גם הצר וגם השקט מכל השלושה. עכשיו כותרת אמיתית.
      */}
      <header className="flex shrink-0 items-center gap-2 border-b border-night/10 px-4 py-3">
        <span className="badge text-base font-bold text-night">
          <span aria-hidden>🧭</span> הסוכן שלכם
        </span>
        <span className="truncate text-xs font-medium text-night/45">כותבים - והתוכנית משתנה</span>
        <div className="ms-auto flex shrink-0 items-center gap-1">
        {/*
          ניקוי השיחה, בלי לגעת בטיול. נוסף אחרי שמטייל קיבל את ההודעה
          "השיחה ארוכה מדי" עם עצה לרענן את הדף - ורענון לא ניקה כלום, כי
          ההיסטוריה נטענת מ-localStorage בכל טעינה. עד כאן לא היה שום
          כפתור שמנקה שיחה: "טיול חדש" פותח טיול אחר ומאבד את התוכנית,
          וזה מחיר לא סביר רק כדי להשתחרר משיחה תקועה.
        */}
        {messages.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('לנקות את השיחה? הטיול עצמו יישאר בדיוק כמו שהוא.')) {
                clearConversation();
              }
            }}
            aria-label="ניקוי השיחה"
            title="ניקוי השיחה - הטיול נשאר"
            className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-night/5 px-2.5 text-xs font-semibold text-night/55 transition hover:bg-night/10 hover:text-night"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden>
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ניקוי
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="סגירת השיחה"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-night/5 text-night/50 transition hover:bg-night/10 hover:text-night"
          >
            ✕
          </button>
        )}
        </div>
      </header>

      {/*
        `justify-center` רק כשאין הודעות: הפאנל התרחב כדי לקדם את הסוכן,
        ובלי זה ההרחבה ייצרה שטח לבן ריק גדול מעל הקומפוזר - הבעיה
        שהתחלנו ממנה, בכיוון ההפוך. ברגע שיש שיחה חוזרים לזרימה מלמעלה.
      */}
      <div
        className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 ${
          messages.length === 0 && !loading ? 'justify-center' : ''
        }`}
      >
        {messages.length === 0 && !loading && (
          <div className="rounded-2xl bg-cream p-4">
            <p className="text-sm font-semibold leading-relaxed text-night/70">
              אפשר לערוך את הטיול בשיחה - בלי לעבור מסך.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full bg-shell px-3 py-1.5 text-xs font-semibold text-night/70 ring-1 ring-sunset/30 transition hover:bg-sunset/10 hover:text-night"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-start' : ''}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-tr-md bg-night font-medium text-cream'
                  : 'w-full max-w-full bg-cream text-night'
              }`}
            >
              {msg.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.image}
                  alt="תמונה שצורפה לשיחה"
                  className={`max-h-56 w-auto rounded-xl object-contain ${msg.content ? 'mb-2' : ''}`}
                />
              )}
              {renderText(msg.content)}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {msg.actions.map((a, k) => (
                    <span
                      key={k}
                      className="rounded-full bg-sunset/10 px-2.5 py-1 text-xs font-semibold text-sunset-deep ring-1 ring-sunset/20"
                    >
                      ✓ {a}
                    </span>
                  ))}
                </div>
              )}
              {msg.destinationSlug && msg.placeIds && msg.placeIds.length > 0 && (
                <MessageMap slug={msg.destinationSlug} placeIds={msg.placeIds} />
              )}
              {/* תשובות מהירות - רק בהודעה האחרונה, לשאלות לא-רגישות */}
              {msg.role === 'assistant' &&
                i === messages.length - 1 &&
                !loading &&
                msg.quickReplies &&
                msg.quickReplies.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.quickReplies.map((r) => (
                      <button
                        key={r}
                        onClick={() => send(r)}
                        className="rounded-full bg-shell px-3.5 py-1.5 text-sm font-semibold text-night/75 ring-1 ring-sunset/40 transition hover:bg-sunset/10 hover:text-night"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="w-fit rounded-2xl bg-cream px-4 py-3 text-sm font-medium text-night/40">
            <ThinkingIndicator label={status ?? 'חושב'} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="shrink-0 border-t border-night/10 bg-shell p-3"
      >
        {/*
          כל מה שנשאר מרעיון "מדריך": שורה אחת שאומרת איפה עושים את הדבר
          המרכזי. מסך הדרכה נדחה כי הוא לא מפחית אף פקד - ראו
          SIMPLIFY-PROPOSAL.md. נעלם בלחיצה ולא חוזר.
        */}
        {coach && (
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-sunset/10 px-3 py-2 ring-1 ring-sunset/25">
            <span aria-hidden className="text-sm">
              👋
            </span>
            <p className="flex-1 text-xs font-semibold leading-relaxed text-night/75">
              כל שינוי בטיול נעשה כאן - פשוט תכתבו מה לשנות, למשל &quot;תוסיף יום בפראג&quot;.
            </p>
            <button
              type="button"
              onClick={onDismissCoach}
              aria-label="הבנתי, לסגור את ההסבר"
              className="shrink-0 rounded-full px-1.5 text-night/40 transition hover:text-night"
            >
              ✕
            </button>
          </div>
        )}
        {/* תצוגה מקדימה של התמונה שמחכה לשליחה - עם אפשרות להסיר */}
        {pending && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-cream p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pending} alt="תצוגה מקדימה" className="h-14 w-14 rounded-lg object-cover" />
            <span className="flex-1 truncate text-xs font-semibold text-night/60">
              התמונה תישלח עם ההודעה
            </span>
            <button
              type="button"
              onClick={() => setPending(null)}
              aria-label="הסרת התמונה"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-night/5 text-night/50 transition hover:bg-night/10 hover:text-night"
            >
              ✕
            </button>
          </div>
        )}
        {imgError && <p className="mb-2 text-xs font-semibold text-sunset-deep">{imgError}</p>}

        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              void pickImage(e.target.files?.[0]);
              e.target.value = ''; // כדי שבחירה חוזרת באותו קובץ תעבוד
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading || reading}
            aria-label="צירוף תמונה (אישור הזמנה, כרטיס)"
            title="צירוף תמונה - אישור הזמנה, כרטיס טיסה, צילום מסך"
            className="shrink-0 rounded-xl bg-cream px-3 py-3 text-base text-night/60 ring-1 ring-night/10 transition hover:bg-sunset/10 hover:text-night disabled:opacity-40"
          >
            {reading ? '…' : '📎'}
          </button>
          <input
            value={input}
            autoFocus={autoFocus}
            onChange={(e) => setInput(e.target.value)}
            placeholder="תוסיף יום, תחליף מקום, מה כשר באזור…"
            aria-label="בקשה לסוכן"
            className="min-w-0 flex-1 rounded-xl bg-cream px-4 py-3 text-base sm:text-sm text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/40 focus:ring-2 focus:ring-sunset"
          />
          <button
            type="submit"
            disabled={loading || reading || (!input.trim() && !pending)}
            className="shrink-0 rounded-xl bg-sunset px-4 py-3 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
          >
            שליחה
          </button>
        </div>
      </form>
    </section>
  );
}
