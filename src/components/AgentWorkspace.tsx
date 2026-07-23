'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Place } from '@/lib/types';
import type { Trip, TripPreferences } from '@/lib/trip/types';
import { destinations } from '@/data/destinations';
import { useTrip } from '@/lib/trip/TripContext';
import PlacesMap from '@/components/PlacesMap';
import HeroPrompt from '@/components/HeroPrompt';

/**
 * חוויית הסוכן - הכוכב של האתר (Phase 3: homepage leads with the conversation).
 *
 * שני מצבים עם מעבר חלק:
 * 1. landing - שדה קלט אחד גדול במרכז המסך + צ׳יפים של הצעות. מינימליסטי
 *    בכוונה: שום דאטה משני (ימים, תגיות, כשרות) לא מוצג בשלב הזה.
 * 2. workspace - ברגע שנשלחה הודעה: מסך מפוצל. צד ימין (RTL start) השיחה,
 *    צד שמאל "הקנבס" - הטיול החי: מפה אינטראקטיבית, בלוקים של ימים, תמונת
 *    יעד והעדפות. הקנבס ניזון מאירועי {trip} של לולאת הסוכן ב-/api/chat.
 */

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  destinationSlug?: string;
  placeIds?: string[];
  actions?: string[];
  quickReplies?: string[]; // תשובות מהירות לשאלה לא-רגישה (צ׳יפים לחיצים)
}

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
    <div className="mt-3 h-64 overflow-hidden rounded-2xl ring-1 ring-night/10">
      <PlacesMap center={dest.center} zoom={dest.zoom} places={places} />
    </div>
  );
}

/* ---------- הקנבס: הטיול החי (דסקטופ) ---------- */

function TripCanvas() {
  const trip = useTrip();
  const t = trip.currentTrip;
  const [dayIdx, setDayIdx] = useState(0);

  // כשהסוכן משנה את הטיול, נשארים על יום קיים
  const safeIdx = t && t.days.length > 0 ? Math.min(dayIdx, t.days.length - 1) : 0;

  if (!trip.hydrated) return null;

  if (!t) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-night/15 p-6 text-center">
        <div className="text-2xl">🗺️</div>
        <div className="mt-2 font-bold text-night/70">הקנבס עוד ריק</div>
        <p className="mt-1.5 text-sm leading-relaxed text-night/50">
          כשנבנה יחד טיול הוא יופיע כאן חי - מפה, ימים ותמונות - ויתעדכן עם כל בקשה שלכם.
        </p>
      </div>
    );
  }

  const setPrefs = (patch: Partial<TripPreferences>) =>
    trip.upsertTrip({ ...t, preferences: { ...t.preferences, ...patch } });

  const day = t.days[safeIdx];
  const dayDest = day ? destOf(day.citySlug) : undefined;
  const dayPlaces: Place[] =
    day && dayDest
      ? day.placeIds
          .map((id) => dayDest.places.find((p) => p.id === id))
          .filter((p): p is Place => Boolean(p))
      : [];
  const totalStops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
  const heroDest = dayDest ?? destOf(t.citySlugs[0] ?? '');

  return (
    <div className="overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10">
      {/* תמונת יעד */}
      <div
        className="photo-bg relative h-28"
        style={
          heroDest?.photo
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(15,14,26,0.05) 0%, rgba(15,14,26,0.65) 100%), url(${heroDest.photo})`,
              }
            : undefined
        }
      >
        <div className="absolute bottom-3 start-4 end-4">
          <div className="display truncate text-lg text-cream drop-shadow">{t.name}</div>
          <div className="text-xs font-medium text-cream/85">
            {t.days.length} ימים · {totalStops} עצירות
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* בחירת יום */}
        {t.days.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {t.days.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setDayIdx(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  i === safeIdx
                    ? 'bg-sunset text-cream'
                    : 'bg-night/5 text-night/60 hover:bg-night/10'
                }`}
              >
                יום {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* מפה אינטראקטיבית של היום הנבחר - הדומיננטית בקנבס.
            fitBounds קורה ב-MapInner עם כל החלפת יום; יום ריק מקבל מצב ריק
            ברור במקום מפה עירומה. */}
        {dayDest && dayPlaces.length > 0 && (
          <div className="mt-3 h-[420px] overflow-hidden rounded-xl ring-1 ring-night/10">
            <PlacesMap
              center={dayDest.center}
              zoom={dayDest.zoom}
              places={dayPlaces}
              numbered
              showRoute
            />
          </div>
        )}
        {day && dayPlaces.length === 0 && (
          <div className="mt-3 flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-night/15 px-6 text-center text-sm font-medium leading-relaxed text-night/50">
            היום הזה עדיין ריק - בקשו ממני להוסיף מקומות
          </div>
        )}

        {/* בלוקים של ימים */}
        <ol className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {t.days.map((d, i) => {
            const dest = destOf(d.citySlug);
            return (
              <li
                key={d.id}
                className={`rounded-xl p-3 text-sm ring-1 transition ${
                  i === safeIdx ? 'bg-sunset/5 ring-sunset/30' : 'bg-night/[0.02] ring-night/5'
                }`}
              >
                <button onClick={() => setDayIdx(i)} className="flex w-full items-center gap-2 text-start">
                  <span className="font-bold text-night">יום {i + 1}</span>
                  <span className="text-night/50">
                    {dest?.flag} {dest?.name}
                  </span>
                  <span className="ms-auto text-xs font-medium text-night/40">
                    {d.placeIds.length} עצירות
                  </span>
                </button>
                {d.placeIds.length > 0 && (
                  <div className="mt-1.5 text-xs leading-relaxed text-night/60">
                    {d.placeIds
                      .map((id) => dest?.places.find((p) => p.id === id)?.name)
                      .filter(Boolean)
                      .join(' ← ')}
                  </div>
                )}
                {d.notes && <div className="mt-1 text-xs text-night/45">💡 {d.notes}</div>}
              </li>
            );
          })}
          {t.days.length === 0 && (
            <li className="rounded-xl bg-night/[0.02] p-3 text-sm text-night/50">
              עוד אין ימים - בקשו מהסוכן להוסיף
            </li>
          )}
        </ol>

        {/* העדפות - טוגלים אינטראקטיביים. העדפות רגישות (כשרות) הן כפתורים,
            לעולם לא שאלות בשיחה: לחיצה מעדכנת את Trip.preferences ישירות,
            והסוכן קורא אותן מחדש בכל תור - בלי הודעה גלויה. */}
        <div className="mt-3">
          <div className="text-xs font-bold text-night/40">
            העדפות · לחיצה משנה, הסוכן מתעדכן בשקט
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <ToggleChip
              active={t.preferences?.kosher === true}
              label="כשר"
              onClick={() =>
                setPrefs({ kosher: t.preferences?.kosher === true ? undefined : true })
              }
            />
            <ToggleChip
              active={Boolean(t.preferences?.pace)}
              label={
                t.preferences?.pace === 'packed'
                  ? 'קצב: דחוס'
                  : t.preferences?.pace === 'relaxed'
                    ? 'קצב: רגוע'
                    : 'קצב'
              }
              onClick={() =>
                setPrefs({
                  pace:
                    t.preferences?.pace === undefined
                      ? 'relaxed'
                      : t.preferences.pace === 'relaxed'
                        ? 'packed'
                        : undefined,
                })
              }
            />
            <ToggleChip
              active={Boolean(t.preferences?.party)}
              label={
                t.preferences?.party
                  ? { couple: 'זוג', family: 'משפחה', friends: 'חברים', solo: 'סולו' }[t.preferences.party]
                  : 'מי נוסע'
              }
              onClick={() =>
                setPrefs({
                  party:
                    t.preferences?.party === undefined
                      ? 'couple'
                      : t.preferences.party === 'couple'
                        ? 'family'
                        : t.preferences.party === 'family'
                          ? 'friends'
                          : t.preferences.party === 'friends'
                            ? 'solo'
                            : undefined,
                })
              }
            />
            <ToggleChip
              active={Boolean(t.preferences?.shopping)}
              label={
                t.preferences?.shopping
                  ? { more: 'שופינג: יותר', normal: 'שופינג: רגיל', less: 'שופינג: פחות' }[t.preferences.shopping]
                  : 'שופינג'
              }
              onClick={() =>
                setPrefs({
                  shopping:
                    t.preferences?.shopping === undefined
                      ? 'more'
                      : t.preferences.shopping === 'more'
                        ? 'normal'
                        : t.preferences.shopping === 'normal'
                          ? 'less'
                          : undefined,
                })
              }
            />
            {t.preferences?.shabbatAware && <PrefChip label="שומרי שבת" />}
            {t.preferences?.budget && (
              <PrefChip
                label={{ low: 'תקציב נמוך', medium: 'תקציב בינוני', high: 'תקציב גבוה' }[t.preferences.budget]}
              />
            )}
          </div>
        </div>

        <Link
          href="/planner"
          className="mt-4 block rounded-xl bg-sunset px-4 py-2.5 text-center text-sm font-bold text-cream transition hover:bg-sunset-deep"
        >
          פתיחה במתכנן
        </Link>
      </div>
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

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
        active ? 'bg-sunset text-cream' : 'bg-night/5 text-night/50 hover:bg-night/10'
      }`}
    >
      {label}
    </button>
  );
}

/* מובייל: שורת סיכום דביקה שנפתחת לפירוט */
function CanvasBarMobile() {
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
        <span className="truncate font-bold text-night">{t.name}</span>
        <span className="shrink-0 text-xs font-medium text-night/50">
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

/* ---------- החוויה המלאה ---------- */

export default function AgentWorkspace() {
  const trip = useTrip();
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // טוגל הכשרות מה-UI: עובר לשרת בשקט עד שהוא נטמע ב-Trip.preferences
  const [kosherHint, setKosherHint] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qHandled = useRef(false);

  // הגעה מדף הבית: /chat?q=...&kosher=1 - שולחים את הטקסט פעם אחת (עם
  // העדפת הכשרות אם הודלקה) ומנקים את הכתובת.
  // window.location במקום useSearchParams כדי לא לחייב Suspense ב-prerender.
  useEffect(() => {
    if (qHandled.current) return;
    qHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const kosher = params.get('kosher') === '1';
    if (kosher) setKosherHint(true);
    if (q && q.trim()) {
      router.replace('/chat');
      send(q, kosher);
    } else if (kosher) {
      router.replace('/chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (started) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading, started]);

  async function send(text: string, kosherArg?: boolean) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const kosher = kosherArg ?? kosherHint;
    if (kosherArg) setKosherHint(true);
    setStarted(true); // המעבר: מהנחיתה הממורכזת למסך המפוצל
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    let appended = false;
    const patchLast = (patch: (msg: Msg) => Msg) =>
      setMessages((m) => [...m.slice(0, -1), patch(m[m.length - 1])]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          trip: trip.currentTrip,
          kosher: kosher || undefined, // רמז ה-UI - השרת מטמיע אותו בטיול
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
            replies?: string[];
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
            trip.upsertTrip(event.trip);
            // ההעדפה נטמעה בטיול - הרמז כבר לא נחוץ (וטוגל בקנבס גובר מעכשיו)
            if (event.trip.preferences?.kosher) setKosherHint(false);
            if (appended && event.actions && event.actions.length > 0) {
              const actions = event.actions;
              patchLast((msg) => ({ ...msg, actions }));
            }
          } else if (event.type === 'quickReplies' && appended && event.replies?.length) {
            const quickReplies = event.replies;
            patchLast((msg) => ({ ...msg, quickReplies }));
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

  /* ---- מצב נחיתה: קלט אחד גדול במרכז ---- */
  if (!started) {
    return (
      <div className="flex min-h-[calc(100vh-230px)] flex-col items-center justify-center py-10">
        <h1 className="display rise-in text-center text-4xl text-night sm:text-6xl">
          לאן טסים הפעם?
        </h1>
        <p className="rise-in mt-4 max-w-xl text-center leading-relaxed text-night/60">
          מספרים לי מה מדמיינים - ואני בונה טיול אמיתי, יום-אחרי-יום, על מפה. בעברית.
        </p>

        {/* קלט + צ׳יפים משותפים - צ׳יפ ממלא לעריכה, שליחה מתחילה את השיחה */}
        <HeroPrompt onSubmit={(text, kosher) => send(text, kosher)} />

        <Link
          href="/countries"
          className="rise-in-late mt-8 text-sm font-semibold text-night/40 transition hover:text-sunset-deep"
        >
          או גולשים בקטלוג היעדים ←
        </Link>
      </div>
    );
  }

  /* ---- מצב עבודה: מסך מפוצל - שיחה + קנבס ---- */
  return (
    <div className="rise-in mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* השיחה (RTL: צד ימין) */}
        <div className="flex h-[calc(100vh-180px)] min-w-0 flex-1 flex-col">
          <CanvasBarMobile />

          <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-shell p-5 ring-1 ring-night/10">
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
                            className="rounded-full bg-shell px-4 py-2 text-sm font-semibold text-night/75 ring-1 ring-sunset/40 transition hover:bg-sunset/10 hover:text-night"
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
              <div className="w-fit animate-pulse rounded-2xl bg-cream px-5 py-3.5 text-sm font-medium text-night/40">
                חושב…
              </div>
            )}
            <div ref={bottomRef} />
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
              placeholder="עוד בקשה? למשל: תוסיף יום, תחליף מקום, מה כשר באזור…"
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

        {/* הקנבס (RTL: צד שמאל) */}
        <aside className="hidden w-96 shrink-0 lg:block">
          <TripCanvas />
        </aside>
      </div>
    </div>
  );
}
