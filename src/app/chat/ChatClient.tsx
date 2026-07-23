'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Place } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import { destinations } from '@/data/destinations';
import { useTrip } from '@/lib/trip/TripContext';
import PlacesMap from '@/components/PlacesMap';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  destinationSlug?: string;
  placeIds?: string[];
  actions?: string[]; // מה הסוכן ביצע בפועל - צ׳יפים מתחת להודעה
}

const suggestions = [
  'תבנה לי טיול של 4 ימים בפראג לזוג',
  'איפה אוכלים כשר בבודפשט?',
  'מה צריך לדעת לפני טיסה לאתונה?',
];

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
  const dest = destinations.find((d) => d.slug === slug);
  if (!dest) return null;
  const places = placeIds
    .map((id) => dest.places.find((p) => p.id === id))
    .filter((p): p is Place => Boolean(p));
  if (places.length === 0) return null;
  return (
    <div className="mt-3 h-64 overflow-hidden rounded-2xl ring-1 ring-night/10">
      <PlacesMap center={dest.center} zoom={dest.zoom} places={places} />
    </div>
  );
}

const destOf = (slug: string) => destinations.find((d) => d.slug === slug);

/* פאנל הטיול החי - דסקטופ: עמודה ליד הצ׳אט */
function TripPanel() {
  const trip = useTrip();
  const t = trip.currentTrip;

  if (!trip.hydrated) return null;

  if (!t) {
    return (
      <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
        <div className="font-bold text-night">אין טיול פעיל</div>
        <p className="mt-1.5 text-sm leading-relaxed text-night/60">
          בקשו ממני לבנות אחד - למשל &quot;תבנה לי טיול של 4 ימים בפראג&quot; - והוא יופיע כאן חי.
        </p>
      </div>
    );
  }

  const totalStops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
  return (
    <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
      <div className="text-xs font-bold text-night/40">הטיול הנוכחי</div>
      <div className="mt-1 font-bold text-night">{t.name}</div>
      <div className="mt-0.5 text-xs font-medium text-night/50">
        {t.days.length} ימים · {totalStops} עצירות
      </div>
      <ol className="mt-3 space-y-1.5">
        {t.days.map((d, i) => (
          <li key={d.id} className="flex items-center gap-2 rounded-lg bg-night/[0.03] px-2.5 py-1.5 text-sm">
            <span className="text-base leading-none">{destOf(d.citySlug)?.flag}</span>
            <span className="font-semibold text-night">יום {i + 1}</span>
            <span className="text-night/50">{destOf(d.citySlug)?.name}</span>
            <span className="ms-auto text-xs font-medium text-night/40">
              {d.placeIds.length} עצירות
            </span>
          </li>
        ))}
        {t.days.length === 0 && (
          <li className="rounded-lg bg-night/[0.03] px-2.5 py-1.5 text-sm text-night/50">
            עוד אין ימים - בקשו ממני להוסיף
          </li>
        )}
      </ol>
      {t.preferences && Object.keys(t.preferences).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {t.preferences.kosher && <PrefChip label="כשר" />}
          {t.preferences.shabbatAware && <PrefChip label="שומרי שבת" />}
          {t.preferences.party && (
            <PrefChip label={{ couple: 'זוג', family: 'משפחה', friends: 'חברים', solo: 'סולו' }[t.preferences.party]} />
          )}
          {t.preferences.pace && (
            <PrefChip label={t.preferences.pace === 'packed' ? 'קצב דחוס' : 'קצב רגוע'} />
          )}
          {t.preferences.budget && (
            <PrefChip label={{ low: 'תקציב נמוך', medium: 'תקציב בינוני', high: 'תקציב גבוה' }[t.preferences.budget]} />
          )}
        </div>
      )}
      <Link
        href="/planner"
        className="mt-4 block rounded-xl bg-sunset px-4 py-2.5 text-center text-sm font-bold text-cream transition hover:bg-sunset-deep"
      >
        פתיחה במתכנן
      </Link>
    </div>
  );
}

function PrefChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-semibold text-night/60">
      {label}
    </span>
  );
}

/* מובייל: שורת סיכום דביקה שנפתחת לפירוט ימים */
function TripBarMobile() {
  const trip = useTrip();
  const [open, setOpen] = useState(false);
  const t = trip.currentTrip;
  if (!trip.hydrated || !t) return null;
  const totalStops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
  return (
    <div className="sticky top-2 z-10 mb-3 rounded-xl bg-shell shadow-sm ring-1 ring-night/10 lg:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm"
      >
        <span className="font-bold text-night">{t.name}</span>
        <span className="text-xs font-medium text-night/50">
          {t.days.length} ימים · {totalStops} עצירות
        </span>
        <span className={`ms-auto text-xs text-night/40 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="border-t border-night/10 px-4 pb-3 pt-2">
          <ol className="space-y-1">
            {t.days.map((d, i) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-night">יום {i + 1}</span>
                <span className="text-night/50">
                  {destOf(d.citySlug)?.flag} {destOf(d.citySlug)?.name}
                </span>
                <span className="ms-auto text-xs text-night/40">{d.placeIds.length} עצירות</span>
              </li>
            ))}
          </ol>
          <Link href="/planner" className="mt-2 block text-sm font-bold text-sunset-deep hover:underline">
            פתיחה במתכנן ←
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ChatClient() {
  const trip = useTrip();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'היי! אני הסוכן של טיול+. אפשר לבקש ממני לבנות טיול, לערוך אותו ("תוסיף יום", "תוריד את המוזיאון") או לשאול על היעדים - והטיול מתעדכן חי בפאנל שלצד השיחה.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    // "חושב…" מוצג רק עד המקטע הראשון; משם ההודעה נבנית טוקן-אחרי-טוקן
    let appended = false;
    const patchLast = (patch: (msg: Msg) => Msg) =>
      setMessages((m) => [...m.slice(0, -1), patch(m[m.length - 1])]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          trip: trip.currentTrip, // הסוכן עובד על הטיול האמיתי
        }),
      });
      if (!res.ok || !res.body) throw new Error('bad response');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          let event: {
            type: string;
            text?: string;
            destinationSlug?: string;
            placeIds?: string[];
            trip?: Trip;
            actions?: string[];
          };
          try {
            event = JSON.parse(line.slice(5));
          } catch {
            continue;
          }
          if (event.type === 'text' && event.text) {
            const chunk = event.text;
            if (!appended) {
              appended = true;
              setLoading(false);
              setMessages((m) => [...m, { role: 'assistant', content: chunk }]);
            } else {
              patchLast((msg) => ({ ...msg, content: msg.content + chunk }));
            }
          } else if (event.type === 'meta' && appended) {
            patchLast((msg) => ({
              ...msg,
              destinationSlug: event.destinationSlug,
              placeIds: event.placeIds,
            }));
          } else if (event.type === 'trip' && event.trip) {
            // הסוכן שינה את הטיול - מעדכנים את ה-store האמיתי חי
            trip.upsertTrip(event.trip);
            if (appended && event.actions && event.actions.length > 0) {
              const actions = event.actions;
              patchLast((msg) => ({ ...msg, actions }));
            }
          }
        }
      }
      if (!appended) throw new Error('empty stream');
    } catch {
      if (!appended) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'אופס, משהו השתבש. נסו שוב.' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ---- הצ׳אט ---- */}
        <div className="flex h-[calc(100vh-180px)] min-w-0 flex-1 flex-col">
          <h1 className="display text-2xl text-night">צ׳אט הטיולים</h1>
          <p className="mt-1.5 text-sm text-night/60">
            סוכן שבונה ועורך את הטיול שלכם תוך כדי שיחה - מעוגן בדאטה אמיתי, עם מפה מתחת לתשובות.
          </p>

          <TripBarMobile />

          <div className="mt-3 flex-1 space-y-4 overflow-y-auto rounded-2xl bg-shell p-5 ring-1 ring-night/10">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'flex justify-start' : ''}>
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
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
                </div>
              </div>
            ))}
            {loading && (
              <div className="w-fit animate-pulse rounded-2xl bg-cream px-5 py-3.5 text-sm font-medium text-night/40">
                חושב…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full bg-shell px-4 py-2 text-xs font-medium text-night/70 ring-1 ring-night/10 transition hover:bg-night/5 hover:ring-night/25"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="למשל: תבנה לי מסלול ל-3 ימים ברומא עם אוכל כשר"
              className="flex-1 rounded-xl bg-shell px-5 py-3.5 text-sm text-night outline-none ring-1 ring-night/10 transition focus:ring-2 focus:ring-sunset"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-sunset px-6 py-3.5 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
            >
              שליחה
            </button>
          </form>
        </div>

        {/* ---- פאנל הטיול החי (דסקטופ) ---- */}
        <aside className="hidden w-72 shrink-0 pt-16 lg:block">
          <TripPanel />
        </aside>
      </div>
    </div>
  );
}
