'use client';

import { useEffect, useRef } from 'react';
import type { Place } from '@/lib/types';
import { destinations } from '@/data/destinations';
import type { TripChat } from '@/lib/trip/useTripChat';
import PlacesMap from '@/components/PlacesMap';
import ThinkingIndicator from '@/components/ThinkingIndicator';

/**
 * פאנל השיחה עם הסוכן - תצוגה בלבד. ה-state יושב ב-useTripChat אצל
 * TripWorkspace, כך שאותה שיחה בדיוק מוצגת גם בעמודת הדסקטופ וגם במגירת
 * המובייל: הודעה שנשלחת מכאן מעדכנת את אותו Trip שמצויר במפה ובמסלול.
 */

const destOf = (slug: string) => destinations.find((d) => d.slug === slug);

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
  const dest = destOf(slug);
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
}: {
  chat: TripChat;
  className?: string;
  autoFocus?: boolean;
  onClose?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, loading, input, setInput, send } = chat;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  return (
    // מחלקת ה-display מגיעה מהקורא (hidden lg:flex בעמודה, flex במגירה)
    <section
      className={`min-h-0 flex-col overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10 ${className}`}
      aria-label="שיחה עם הסוכן"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-night/10 px-4 py-2.5">
        <span className="badge text-sm font-bold text-night">
          <span aria-hidden>🧭</span> הסוכן
        </span>
        <span className="truncate text-xs font-medium text-night/45">
          כותבים בקשה - התוכנית מתעדכנת
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="סגירת השיחה"
            className="ms-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-night/5 text-night/50 transition hover:bg-night/10 hover:text-night"
          >
            ✕
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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
            <ThinkingIndicator label="חושב" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex shrink-0 gap-2 border-t border-night/10 bg-shell p-3"
      >
        <input
          value={input}
          autoFocus={autoFocus}
          onChange={(e) => setInput(e.target.value)}
          placeholder="תוסיף יום, תחליף מקום, מה כשר באזור…"
          aria-label="בקשה לסוכן"
          className="min-w-0 flex-1 rounded-xl bg-cream px-4 py-3 text-sm text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/40 focus:ring-2 focus:ring-sunset"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl bg-sunset px-4 py-3 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
        >
          שליחה
        </button>
      </form>
    </section>
  );
}
