'use client';

import { useEffect, useRef, useState } from 'react';
import type { Destination, Place } from '@/lib/types';
import type { TripChat } from '@/lib/trip/useTripChat';
import { fileToChatImage, IMAGE_ACCEPT } from '@/lib/trip/imageAttach';
import { cachedCity, fetchCities } from '@/lib/trip/cityData';
import PlacesMap from '@/components/PlacesMap';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import BookingSearchCardView from '@/components/BookingSearchCard';
import { OFFLINE_HINT, useOnline } from '@/lib/offline/online';

/**
 * The agent conversation panel - presentational only. The state lives in
 * useTripChat inside TripWorkspace, so exactly the same conversation is
 * rendered both in the desktop column and in the mobile drawer: a message
 * sent from here updates the same Trip drawn on the map and the itinerary.
 */

/**
 * The small map under a message draws a city the agent mentioned, so it
 * needs that city's data - but **without importing the catalog**, which is
 * exactly why `/chat` dropped 492kB compressed. It takes from the
 * `cityData` cache (the trip's cities are already there), and if the city
 * has not been loaded yet - it loads itself.
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

/** Renders basic **bold** without libraries */
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

// Conversation starters for an existing trip - all are edit actions on the displayed plan
const STARTERS = ['תוסיף לי יום', 'תחליף מקום ביום הזה', 'מה כשר באזור?', 'תעשה לי יום רגוע יותר'];
const DEFAULT_EMPTY_HINT = 'אפשר לערוך את הטיול בשיחה - בלי לעבור מסך.';
const DEFAULT_CLEAR_CONFIRM = 'לנקות את השיחה? הטיול עצמו יישאר בדיוק כמו שהוא.';

export default function ChatPanel({
  chat,
  className = '',
  autoFocus = false,
  onClose,
  coach = false,
  onDismissCoach,
  starters = STARTERS,
  emptyHint = DEFAULT_EMPTY_HINT,
  clearConfirmMessage = DEFAULT_CLEAR_CONFIRM,
  headerLabel = 'הסוכן שלכם',
  headerHint = 'כותבים - והתוכנית משתנה',
  placeholder = 'תוסיף יום, תחליף מקום, מה כשר באזור…',
}: {
  chat: TripChat;
  className?: string;
  autoFocus?: boolean;
  onClose?: () => void;
  /**
   * A one-time hint above the composer. The state lives in TripWorkspace
   * and not here, because this component renders twice (desktop column +
   * mobile drawer) - a single source of truth guarantees that dismissing on
   * one side dismisses on the other too.
   */
  coach?: boolean;
  onDismissCoach?: () => void;
  /**
   * Five replaceable texts - so the same component also serves the free
   * conversation page (`/ask`, no trip) without copying it. All optional;
   * the default is exactly the existing wording of the trip conversation.
   */
  starters?: string[];
  emptyHint?: string;
  clearConfirmMessage?: string;
  headerLabel?: string;
  headerHint?: string;
  placeholder?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { messages, loading, streaming, status, input, setInput, send, clearConversation } = chat;
  // An image waiting to be sent (a downscaled data URL) + a short pick error
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

  /**
   * The agent is the only thing on the site that cannot be served from the
   * cache: a model reply is created on the server fresh every time. No
   * queue, no spinner and no raw error - the composer looks disabled and
   * says in Hebrew that a connection is needed.
   */
  const online = useOnline();
  const offline = !online;

  const submit = () => {
    if (reading || offline) return;
    const image = pending ?? undefined;
    setPending(null);
    setImgError(null);
    send(input, undefined, image);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  return (
    // The display class comes from the caller (hidden lg:flex in the column, flex in the drawer)
    <section
      className={`min-h-0 flex-col overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10 ${className}`}
      aria-label="שיחה עם הסוכן"
    >
      {/*
        The header used to be 12px gray next to the agent label - the
        component that does all the work in the product was both the
        narrowest and the quietest of the three. Now a real heading.
      */}
      <header className="flex shrink-0 items-center gap-2 border-b border-night/10 px-4 py-3">
        <span className="badge text-base font-bold text-night">
          <span aria-hidden>🧭</span> {headerLabel}
        </span>
        <span className="truncate text-xs font-medium text-night/45">{headerHint}</span>
        <div className="ms-auto flex shrink-0 items-center gap-1">
        {/*
          Clearing the conversation, without touching the trip. Added after
          a traveler got the "conversation too long" message with advice to
          refresh the page - and a refresh cleared nothing, because the
          history loads from localStorage on every load. Until this point
          there was no button that clears a conversation: "new trip" opens a
          different trip and loses the plan, which is an unreasonable price
          just to break free of a stuck conversation.
        */}
        {messages.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm(clearConfirmMessage)) {
                clearConversation();
              }
            }}
            aria-label="ניקוי השיחה"
            disabled={offline}
            title={offline ? OFFLINE_HINT : 'ניקוי השיחה - הטיול נשאר'}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-night/5 px-2.5 text-xs font-semibold text-night/55 transition enabled:hover:bg-night/10 enabled:hover:text-night disabled:cursor-not-allowed disabled:opacity-45"
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
        `justify-center` only when there are no messages: the panel was
        widened to promote the agent, and without this the widening created
        a big empty white area above the composer - the problem we started
        from, in the opposite direction. Once there is a conversation we go
        back to top-down flow.
      */}
      <div
        className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 ${
          messages.length === 0 && !loading ? 'justify-center' : ''
        }`}
      >
        {messages.length === 0 && !loading && (
          <div className="rounded-2xl bg-cream p-4">
            <p className="text-sm font-semibold leading-relaxed text-night/70">{emptyHint}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={offline}
                  title={offline ? OFFLINE_HINT : undefined}
                  className="rounded-full bg-shell px-3 py-1.5 text-xs font-semibold text-night/70 ring-1 ring-sunset/30 transition enabled:hover:bg-sunset/10 enabled:hover:text-night disabled:cursor-not-allowed disabled:opacity-45"
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
                  loading="lazy"
                  decoding="async"
                  className={`max-h-56 w-auto rounded-xl object-contain ${msg.content ? 'mb-2' : ''}`}
                />
              )}
              {renderText(msg.content)}
              {/* Still receiving text from the server - without this a stalled message accidentally looks finished */}
              {streaming && msg.role === 'assistant' && i === messages.length - 1 && (
                <ThinkingIndicator className="text-night/40" />
              )}
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
              {/*
                A prepared provider search. This is the real answer to a
                lodging/tickets request - the agent says it cannot check
                prices, and the card shows the real ones. All of its content
                is built on the server from the trip, not from the model.
              */}
              {msg.searches?.map((card, k) => (
                <BookingSearchCardView key={`${card.kind}-${card.cityLabel}-${k}`} card={card} />
              ))}
              {/* Quick replies - only on the last message, for non-sensitive questions */}
              {msg.role === 'assistant' &&
                i === messages.length - 1 &&
                !loading &&
                !streaming &&
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
          All that remains of the "tutorial" idea: one line saying where the
          central thing is done. A walkthrough screen was rejected because it
          removes no control - see SIMPLIFY-PROPOSAL.md. Disappears on click
          and never returns.
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
        {/* Preview of the image waiting to be sent - with an option to remove */}
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

        {/* One quiet statement, instead of an input that looks fine and does nothing */}
        {offline && (
          <p
            role="status"
            className="mb-2 rounded-xl bg-night/[0.04] px-3 py-2 text-xs font-semibold leading-relaxed text-night/60"
          >
            הסוכן צריך חיבור לאינטרנט. אפשר לקרוא את השיחה השמורה - לא לשלוח הודעה חדשה.
          </p>
        )}

        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              void pickImage(e.target.files?.[0]);
              e.target.value = ''; // so that re-picking the same file works
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading || reading || offline}
            aria-label="צירוף תמונה (אישור הזמנה, כרטיס)"
            title={offline ? OFFLINE_HINT : 'צירוף תמונה - אישור הזמנה, כרטיס טיסה, צילום מסך'}
            className="shrink-0 rounded-xl bg-cream px-3 py-3 text-base text-night/60 ring-1 ring-night/10 transition enabled:hover:bg-sunset/10 enabled:hover:text-night disabled:cursor-not-allowed disabled:opacity-40"
          >
            {reading ? '…' : '📎'}
          </button>
          <input
            value={input}
            autoFocus={autoFocus}
            onChange={(e) => setInput(e.target.value)}
            disabled={offline}
            placeholder={offline ? 'אין חיבור - השליחה מושבתת' : placeholder}
            aria-label="בקשה לסוכן"
            className="min-w-0 flex-1 rounded-xl bg-cream px-4 py-3 text-base sm:text-sm text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/40 focus:ring-2 focus:ring-sunset disabled:cursor-not-allowed disabled:opacity-55"
          />
          <button
            type="submit"
            disabled={loading || reading || offline || (!input.trim() && !pending)}
            title={offline ? OFFLINE_HINT : undefined}
            className="shrink-0 rounded-xl bg-sunset px-4 py-3 text-sm font-bold text-cream transition enabled:hover:bg-sunset-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            שליחה
          </button>
        </div>
      </form>
    </section>
  );
}
