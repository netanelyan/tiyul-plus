'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Country, Destination, Place } from '@/lib/types';
import type { Trip, WizardPrefs } from '@/lib/trip/types';
import { categoryMeta } from '@/lib/categories';
import { useTrip } from '@/lib/trip/TripContext';
import { tripFromTemplate } from '@/lib/trip/generate';
import { travelLeg } from '@/lib/trip/travel';
import PlacesMap from '@/components/PlacesMap';

export default function PlannerClient({
  countries,
  destinations,
  initialSlug,
}: {
  countries: Country[];
  destinations: Destination[];
  initialSlug: string;
}) {
  const trip = useTrip();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [aiAck, setAiAck] = useState<string | null>(null);

  if (!trip.hydrated) {
    return (
      <div className="animate-pulse rounded-2xl bg-shell p-10 text-center font-semibold text-night/40 ring-1 ring-night/10">
        טוען את הטיולים שלך…
      </div>
    );
  }

  if (!trip.currentTrip || showWizard) {
    return (
      <Onboarding
        countries={countries}
        destinations={destinations}
        initialSlug={initialSlug}
        onDone={(ack) => {
          setAiAck(ack ?? null);
          setShowWizard(false);
          setSelectedDayId(null);
        }}
        onCancel={trip.currentTrip ? () => setShowWizard(false) : undefined}
      />
    );
  }

  return (
    <Workspace
      destinations={destinations}
      selectedDayId={selectedDayId}
      setSelectedDayId={setSelectedDayId}
      onNewTrip={() => setShowWizard(true)}
      ack={aiAck}
      onDismissAck={() => setAiAck(null)}
    />
  );
}

/* ================= Onboarding: כפתורים כממשק ראשי + טקסט לדיוק ================= */

const AI_STATUSES = ['קורא את הבקשה…', 'בוחר מקומות אמיתיים…', 'מסדר את הימים על המפה…'];

type Party = 'couple' | 'family' | 'friends' | 'solo';

function Onboarding({
  countries,
  destinations,
  initialSlug,
  onDone,
  onCancel,
}: {
  countries: Country[];
  destinations: Destination[];
  initialSlug: string;
  onDone: (ack?: string | null) => void;
  onCancel?: () => void;
}) {
  const trip = useTrip();
  const [prefs, setPrefs] = useState<WizardPrefs>({
    citySlugs: initialSlug ? [initialSlug] : [],
    totalDays: 4,
    pace: 'relaxed',
    tripType: 'combined',
    shopping: 'normal',
    kosherOnly: false,
  });
  const [party, setParty] = useState<Party | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);

  // סטטוס מתחלף בזמן היצירה - שהכפתור לא ירגיש קפוא
  useEffect(() => {
    if (!loading) return;
    setStatusIdx(0);
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % AI_STATUSES.length), 1500);
    return () => clearInterval(t);
  }, [loading]);

  const toggleCity = (slug: string) =>
    setPrefs((p) => ({
      ...p,
      citySlugs: p.citySlugs.includes(slug)
        ? p.citySlugs.filter((s) => s !== slug)
        : [...p.citySlugs, slug],
    }));

  const canGenerate = prefs.citySlugs.length > 0 && !loading;

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefs, party, notes: notes.trim() }),
      });
      const data = (await res.json()) as { trip?: Trip; understood?: string; error?: string };
      if (!data.trip) {
        setError(data.error ?? 'משהו השתבש בדרך - נסו שוב עוד רגע');
        return;
      }
      trip.createTripFrom(data.trip);
      onDone(data.understood ?? null);
    } catch {
      setError('לא הצלחנו להתחבר לשרת - בדקו את החיבור ונסו שוב');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {onCancel && (
        <button onClick={onCancel} className="mb-4 text-sm font-semibold text-sunset-deep transition hover:underline">
          → חזרה לטיול הנוכחי
        </button>
      )}

      <section className="rise-in rounded-3xl bg-shell p-6 ring-1 ring-night/10 sm:p-8">
        <h1 className="display text-3xl text-night">בונים טיול חדש</h1>
        <p className="mt-1.5 max-w-2xl leading-relaxed text-night/60">
          בוחרים לאן ומה חשוב - ואם רוצים, מוסיפים כמה מילים לדיוק. הכול ניתן לעריכה אחר כך.
        </p>

        {/* ---- 1. לאן? ---- */}
        <div className="mt-6">
          <div className="text-sm font-bold text-night">
            לאן? <span className="font-medium text-night/50">(אפשר כמה ערים)</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {countries
              .map((c) => ({ country: c, cities: destinations.filter((d) => d.countrySlug === c.slug) }))
              .filter(({ cities }) => cities.length > 0)
              .flatMap(({ country, cities }) =>
                cities.map((d) => {
                  const selected = prefs.citySlugs.includes(d.slug);
                  return (
                    <button
                      key={d.slug}
                      onClick={() => toggleCity(d.slug)}
                      aria-pressed={selected}
                      className={`rounded-2xl p-3.5 text-start transition ${
                        selected
                          ? 'bg-sunset/10 ring-2 ring-sunset'
                          : 'bg-night/[0.03] ring-1 ring-night/10 hover:ring-night/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-2xl leading-none">{d.flag}</span>
                        {selected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sunset text-xs font-bold text-cream">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="mt-2 font-bold text-night">{d.name}</div>
                      <div className="text-xs font-medium text-night/50">{country.name}</div>
                    </button>
                  );
                }),
              )}
          </div>
          {prefs.citySlugs.length > 1 && (
            <div className="mt-2 text-xs font-medium text-night/50">
              טיול רב-עירוני: {prefs.citySlugs.length} ערים, הימים יתחלקו ביניהן
            </div>
          )}
        </div>

        {/* ---- 2. הגדרות הליבה - הכול כפתורים ---- */}
        <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="text-sm font-semibold text-night/60">כמה ימים?</div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setPrefs((p) => ({ ...p, totalDays: Math.max(1, p.totalDays - 1) }))}
                disabled={prefs.totalDays <= 1}
                aria-label="פחות ימים"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-night/5 text-lg font-bold text-night/70 transition hover:bg-night/10 disabled:opacity-30"
              >
                −
              </button>
              <div className="w-12 text-center text-lg font-bold text-night" aria-live="polite">
                {prefs.totalDays}
              </div>
              <button
                onClick={() => setPrefs((p) => ({ ...p, totalDays: Math.min(21, p.totalDays + 1) }))}
                disabled={prefs.totalDays >= 21}
                aria-label="עוד ימים"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-night/5 text-lg font-bold text-night/70 transition hover:bg-night/10 disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-night/60">מי נוסע?</div>
            <Seg
              options={[
                { v: 'couple', l: 'זוג' },
                { v: 'family', l: 'משפחה' },
                { v: 'friends', l: 'חברים' },
                { v: 'solo', l: 'סולו' },
              ]}
              value={party ?? ''}
              onChange={(v) => setParty((cur) => (cur === v ? null : (v as Party)))}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-night/60">קצב</div>
            <Seg
              options={[
                { v: 'relaxed', l: 'רגוע' },
                { v: 'packed', l: 'דחוס' },
              ]}
              value={prefs.pace}
              onChange={(v) => setPrefs((p) => ({ ...p, pace: v as WizardPrefs['pace'] }))}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-night/60">סגנון</div>
            <Seg
              options={[
                { v: 'city', l: 'עירוני' },
                { v: 'nature', l: 'טבע' },
                { v: 'combined', l: 'משולב' },
              ]}
              value={prefs.tripType}
              onChange={(v) => setPrefs((p) => ({ ...p, tripType: v as WizardPrefs['tripType'] }))}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-night/60">שופינג</div>
            <Seg
              options={[
                { v: 'more', l: 'יותר' },
                { v: 'normal', l: 'רגיל' },
                { v: 'less', l: 'פחות' },
              ]}
              value={prefs.shopping}
              onChange={(v) => setPrefs((p) => ({ ...p, shopping: v as WizardPrefs['shopping'] }))}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-night/60">כשר</div>
            <button
              onClick={() => setPrefs((p) => ({ ...p, kosherOnly: !p.kosherOnly }))}
              aria-pressed={prefs.kosherOnly}
              className={`mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold transition ${
                prefs.kosherOnly
                  ? 'bg-sunset text-cream'
                  : 'bg-night/5 text-night/60 hover:bg-night/10'
              }`}
            >
              {prefs.kosherOnly ? '✓ ' : ''}ארוחה כשרה בכל יום
            </button>
          </div>
        </div>

        {/* ---- 3. טקסט חופשי - אופציונלי ---- */}
        <div className="mt-7">
          <label htmlFor="refine-notes" className="text-sm font-semibold text-night/70">
            רוצים לדייק? ספרו לנו עוד <span className="font-medium text-night/40">(לא חובה)</span>
          </label>
          <textarea
            id="refine-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate();
            }}
            rows={2}
            disabled={loading}
            placeholder="למשל: בלי מוזיאונים, הילדים בני 4 ו-7, אוהבים גלידה"
            className="mt-2 w-full resize-none rounded-xl bg-night/5 px-4 py-3 text-sm leading-relaxed text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/35 focus:bg-shell focus:ring-2 focus:ring-sunset disabled:opacity-60"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-sunset/10 px-4 py-2.5 text-sm font-semibold text-sunset-deep">
            {error}
          </p>
        )}

        {/* ---- 4. ה-CTA היחיד ---- */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full rounded-xl bg-sunset px-6 py-3.5 text-lg font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40 sm:w-auto sm:min-w-72"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2.5">
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cream/40 border-t-cream" />
                <span className="text-base font-semibold">{AI_STATUSES[statusIdx]}</span>
              </span>
            ) : (
              'תבנו לי את הטיול'
            )}
          </button>
          {prefs.citySlugs.length === 0 && (
            <span className="text-xs font-semibold text-night/40">בחרו לפחות עיר אחת</span>
          )}
        </div>
      </section>

      {/* ---- 3. שלישוני: תבניות מוכנות ---- */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-night/50">או מתחילים ממסלול מוכן</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {destinations.map((d) => (
            <button
              key={d.slug}
              onClick={() => {
                trip.createTripFrom(tripFromTemplate(d));
                onDone();
              }}
              className={`card-pop w-36 shrink-0 rounded-2xl bg-shell p-4 text-start ring-1 transition ${
                d.slug === initialSlug ? 'ring-2 ring-sunset' : 'ring-night/10'
              }`}
            >
              <div className="text-xl">{d.flag}</div>
              <div className="mt-1 truncate font-bold text-night">{d.name}</div>
              <div className="text-xs font-medium text-night/50">{d.itinerary.length} ימים</div>
            </button>
          ))}
          <button
            onClick={() => {
              trip.createTrip('הטיול שלי');
              onDone();
            }}
            className="card-pop flex w-36 shrink-0 flex-col justify-center rounded-2xl bg-shell p-4 text-start ring-1 ring-night/10"
          >
            <div className="text-xl text-night/40">+</div>
            <div className="mt-1 font-bold text-night/70">טיול ריק</div>
            <div className="text-xs font-medium text-night/50">אבנה לבד</div>
          </button>
        </div>
      </section>
    </div>
  );
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-2 flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition ${
            value === o.v ? 'bg-sunset text-cream' : 'bg-night/5 text-night/60 hover:bg-night/10'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

/* ================= Workspace: סביבת העבודה של הטיול ================= */

function Workspace({
  destinations,
  selectedDayId,
  setSelectedDayId,
  onNewTrip,
  ack,
  onDismissAck,
}: {
  destinations: Destination[];
  selectedDayId: string | null;
  setSelectedDayId: (id: string | null) => void;
  onNewTrip: () => void;
  ack: string | null;
  onDismissAck: () => void;
}) {
  const trip = useTrip();
  const t = trip.currentTrip!;
  const [copied, setCopied] = useState(false);
  const [addCity, setAddCity] = useState('');

  const destOf = (slug: string) => destinations.find((d) => d.slug === slug);
  const placeOf = (slug: string, id: string): Place | undefined =>
    destOf(slug)?.places.find((p) => p.id === id);

  const day =
    t.days.find((d) => d.id === selectedDayId) ?? t.days[0] ?? null;
  const dayDest = day ? destOf(day.citySlug) : null;

  const dayPlaces: Place[] = useMemo(() => {
    if (!day) return [];
    return day.placeIds
      .map((id) => placeOf(day.citySlug, id))
      .filter((p): p is Place => Boolean(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, t]);

  const availableToAdd: Place[] = useMemo(() => {
    if (!day || !dayDest) return [];
    const usedInTrip = new Set(t.days.flatMap((d) => d.placeIds));
    return dayDest.places.filter((p) => !usedInTrip.has(p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, dayDest, t]);

  const totalStops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
  const googleDirectionsUrl =
    'https://www.google.com/maps/dir/' +
    dayPlaces.map((p) => `${p.lat},${p.lng}`).join('/');

  function copySummary() {
    const lines: string[] = [`🧳 ${t.name} | טיול+`, ''];
    t.days.forEach((d, i) => {
      const dst = destOf(d.citySlug);
      if (i > 0 && t.days[i - 1].citySlug !== d.citySlug) {
        const leg = travelLeg(t.days[i - 1].citySlug, d.citySlug);
        lines.push(`${leg.emoji} מעבר: ${destOf(t.days[i - 1].citySlug)?.name} ← ${dst?.name} (${leg.label})`, '');
      }
      lines.push(`📅 יום ${i + 1} - ${dst?.flag} ${dst?.name}:`);
      d.placeIds.forEach((pid, j) => {
        const p = placeOf(d.citySlug, pid);
        if (p) lines.push(`  ${j + 1}. ${p.name} (${p.nameLocal})`);
      });
      if (d.notes) lines.push(`  💡 ${d.notes}`);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* מה ה-AI הבין מהבקשה - שורה אחת, ניתנת לסגירה */}
      {ack && (
        <div className="rise-in mb-4 flex items-start justify-between gap-3 rounded-xl bg-sunset/10 px-4 py-3 ring-1 ring-sunset/25 print:hidden">
          <p className="text-sm font-semibold leading-relaxed text-night">{ack}</p>
          <button
            onClick={onDismissAck}
            aria-label="סגירה"
            className="shrink-0 text-night/40 transition hover:text-night"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <input
            value={t.name}
            onChange={(e) => trip.renameTrip(t.id, e.target.value)}
            className="display w-64 rounded-xl bg-transparent text-2xl text-night outline-none ring-sunset/50 transition focus:ring-2"
          />
          <span className="badge rounded-full bg-night/5 px-3 py-1 text-xs font-semibold text-night/60">
            {totalStops} עצירות · {t.days.length} ימים
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {trip.trips.length > 1 && (
            <select
              value={t.id}
              onChange={(e) => {
                trip.setCurrentId(e.target.value);
                setSelectedDayId(null);
              }}
              className="rounded-xl bg-shell px-3 py-2 font-semibold text-night ring-1 ring-night/10"
            >
              {trip.trips.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          <Btn onClick={onNewTrip}>+ טיול חדש</Btn>
          <Btn onClick={() => trip.duplicateTrip(t.id)}>שכפול</Btn>
          <Btn onClick={copySummary}>{copied ? '✓ הועתק' : 'העתקת סיכום'}</Btn>
          <Btn onClick={() => window.print()}>הדפסה / PDF</Btn>
          <Btn
            danger
            onClick={() => {
              if (confirm('למחוק את הטיול הזה?')) {
                trip.deleteTrip(t.id);
                setSelectedDayId(null);
              }
            }}
          >
            מחיקה
          </Btn>
        </div>
      </div>

      {/* Day tabs with travel legs */}
      <div className="mt-6 flex flex-wrap items-center gap-2 print:hidden">
        {t.days.map((d, i) => {
          const dst = destOf(d.citySlug);
          const prev = i > 0 ? t.days[i - 1] : null;
          const cityChanged = prev && prev.citySlug !== d.citySlug;
          return (
            <span key={d.id} className="flex items-center gap-2">
              {cityChanged && (
                <span className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-medium text-night/50">
                  {travelLeg(prev!.citySlug, d.citySlug).emoji}
                </span>
              )}
              <button
                onClick={() => setSelectedDayId(d.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  day?.id === d.id
                    ? 'bg-sunset text-cream'
                    : 'bg-shell text-night/60 ring-1 ring-night/10 hover:ring-night/25'
                }`}
              >
                {dst?.flag} יום {i + 1}
              </button>
            </span>
          );
        })}
        {/* Add day */}
        <select
          value={addCity}
          onChange={(e) => {
            if (e.target.value) {
              trip.addDay(e.target.value);
              setAddCity('');
            }
          }}
          className="rounded-full bg-shell px-3 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/10"
        >
          <option value="">+ יום…</option>
          {t.citySlugs.map((c) => (
            <option key={c} value={c}>
              עוד יום ב{destOf(c)?.name}
            </option>
          ))}
          {destinations
            .filter((d) => !t.citySlugs.includes(d.slug))
            .map((d) => (
              <option key={d.slug} value={d.slug}>
                עיר חדשה: {d.flag} {d.name}
              </option>
            ))}
        </select>
      </div>

      {day && dayDest ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-5 print:hidden">
          {/* Day panel */}
          <div className="space-y-3 lg:col-span-2">
            {/* Travel leg banner */}
            {(() => {
              const i = t.days.findIndex((d) => d.id === day.id);
              const prev = i > 0 ? t.days[i - 1] : null;
              if (prev && prev.citySlug !== day.citySlug) {
                const leg = travelLeg(prev.citySlug, day.citySlug);
                return (
                  <div className="rounded-xl bg-night/5 px-4 py-3 text-sm font-semibold text-night/80">
                    {leg.emoji} {destOf(prev.citySlug)?.name} ← {dayDest.name} · {leg.label}
                  </div>
                );
              }
              return null;
            })()}

            <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-night">
                  {dayDest.flag} יום {t.days.findIndex((d) => d.id === day.id) + 1} · {dayDest.name}
                </h2>
                {t.days.length > 1 && (
                  <button
                    onClick={() => {
                      trip.removeDay(day.id);
                      setSelectedDayId(null);
                    }}
                    className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-semibold text-night/60 transition hover:bg-night/10"
                  >
                    מחיקת יום
                  </button>
                )}
              </div>
              <textarea
                value={day.notes ?? ''}
                onChange={(e) => trip.setDayNotes(day.id, e.target.value)}
                placeholder="הערות ליום הזה…"
                rows={2}
                className="mt-3 w-full resize-none rounded-xl bg-night/5 px-4 py-2.5 text-sm text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/40 focus:ring-2 focus:ring-sunset"
              />
              {dayPlaces.length > 1 && (
                <a
                  href={googleDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block rounded-xl bg-sunset px-4 py-3 text-center text-sm font-bold text-cream transition hover:bg-sunset-deep"
                >
                  פתיחת ניווט היום ב-Google Maps
                </a>
              )}
            </div>

            {/* Stops */}
            <ol className="space-y-2">
              {dayPlaces.map((place, i) => {
                const meta = categoryMeta[place.category];
                return (
                  <li
                    key={place.id}
                    className="flex gap-3 rounded-2xl bg-shell p-4 ring-1 ring-night/10"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {i + 1}
                      </div>
                      <button
                        onClick={() => trip.movePlace(day.id, i, -1)}
                        disabled={i === 0}
                        className="text-night/40 transition hover:text-night disabled:opacity-20"
                        aria-label="הזז למעלה"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => trip.movePlace(day.id, i, 1)}
                        disabled={i === dayPlaces.length - 1}
                        className="text-night/40 transition hover:text-night disabled:opacity-20"
                        aria-label="הזז למטה"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-night">
                          {place.name}
                          <span className="badge ms-2 text-xs font-medium text-night/40">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                            {meta.label}
                          </span>
                        </div>
                        <button
                          onClick={() => trip.removePlace(day.id, place.id)}
                          className="text-night/30 transition hover:text-sunset-deep"
                          aria-label="הסרה"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-night/60">
                        {place.description}
                      </p>
                      {t.days.filter((d) => d.citySlug === day.citySlug).length > 1 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) trip.movePlaceToDay(day.id, place.id, e.target.value);
                          }}
                          className="mt-1.5 rounded-lg bg-night/5 px-2 py-1 text-xs font-medium text-night/50"
                        >
                          <option value="">העבר ליום…</option>
                          {t.days
                            .filter((d) => d.id !== day.id && d.citySlug === day.citySlug)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                יום {t.days.findIndex((x) => x.id === d.id) + 1}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Add stop */}
            {availableToAdd.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  const p = availableToAdd.find((x) => x.id === e.target.value);
                  if (p) trip.addPlace(day.citySlug, p.id);
                }}
                className="w-full rounded-xl bg-shell px-4 py-3 font-semibold text-night/70 ring-1 ring-night/10"
              >
                <option value="">+ הוספת עצירה מהקטלוג של {dayDest.name}…</option>
                {availableToAdd.map((p) => (
                  <option key={p.id} value={p.id}>
                    {categoryMeta[p.category].label} · {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Map */}
          <div className="h-[420px] overflow-hidden rounded-2xl ring-1 ring-night/10 lg:sticky lg:top-20 lg:col-span-3 lg:h-[640px]">
            <PlacesMap
              center={dayDest.center}
              zoom={dayDest.zoom}
              places={dayPlaces}
              numbered
              showRoute
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-shell p-8 text-center font-medium text-night/50 ring-1 ring-night/10 print:hidden">
          הטיול עוד ריק - מוסיפים יום למעלה ומתחילים לחלום
        </div>
      )}

      {/* ---- Print-only summary ---- */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">🧳 {t.name} - טיול+</h1>
        {t.days.map((d, i) => {
          const dst = destOf(d.citySlug);
          const prev = i > 0 ? t.days[i - 1] : null;
          return (
            <div key={d.id} className="mt-4">
              {prev && prev.citySlug !== d.citySlug && (
                <p className="font-bold">
                  {travelLeg(prev.citySlug, d.citySlug).emoji} מעבר:{' '}
                  {destOf(prev.citySlug)?.name} ← {dst?.name} ·{' '}
                  {travelLeg(prev.citySlug, d.citySlug).label}
                </p>
              )}
              <h2 className="mt-2 text-lg font-bold">
                📅 יום {i + 1} - {dst?.name}
              </h2>
              {d.notes && <p className="text-sm">💡 {d.notes}</p>}
              <ol className="mt-1 list-decimal ps-6 text-sm">
                {d.placeIds.map((pid) => {
                  const p = placeOf(d.citySlug, pid);
                  return p ? (
                    <li key={pid}>
                      <strong>{p.name}</strong> ({p.nameLocal})
                      {p.kosherNote ? ` · ✡️ ${p.kosherNote}` : ''}
                    </li>
                  ) : null;
                })}
              </ol>
            </div>
          );
        })}
        <p className="mt-6 text-xs">
          הופק ע"י טיול+ · לוודא כשרות, שעות ומחירים מול המקומות עצמם
        </p>
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3.5 py-2 font-semibold transition ${
        danger
          ? 'bg-shell text-sunset-deep ring-1 ring-night/10 hover:bg-sunset hover:text-cream'
          : 'bg-shell text-night/70 ring-1 ring-night/10 hover:ring-night/25'
      }`}
    >
      {children}
    </button>
  );
}
