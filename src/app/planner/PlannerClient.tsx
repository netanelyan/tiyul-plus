'use client';

import { useEffect, useState } from 'react';
import type { Country, Destination } from '@/lib/types';
import type { Trip, WizardPrefs } from '@/lib/trip/types';
import { useTrip } from '@/lib/trip/TripContext';
import { tripFromTemplate } from '@/lib/trip/generate';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import TripWorkspace from '@/components/TripWorkspace';

/**
 * המתכנן: מסך בניית טיול חדש (כפתורים כממשק ראשי) - וברגע שיש טיול,
 * אותה תצוגה מאוחדת בדיוק של /chat (TripWorkspace): מסלול + מפה + שיחה
 * עם הסוכן במסך אחד, על אותו Trip object.
 */
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
  const [showWizard, setShowWizard] = useState(false);
  const [aiAck, setAiAck] = useState<string | null>(null);

  if (!trip.hydrated) {
    return (
      <div className="rounded-2xl bg-shell p-10 text-center font-semibold text-night/40 ring-1 ring-night/10">
        <ThinkingIndicator label="טוען את הטיולים שלך" className="justify-center" />
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
        }}
        onCancel={trip.currentTrip ? () => setShowWizard(false) : undefined}
      />
    );
  }

  return (
    <>
      {/* מה ה-AI הבין מהבקשה - שורה אחת, ניתנת לסגירה */}
      {aiAck && (
        <div className="rise-in mb-4 flex items-start justify-between gap-3 rounded-xl bg-sunset/10 px-4 py-3 ring-1 ring-sunset/25 print:hidden">
          <p className="text-sm font-semibold leading-relaxed text-night">{aiAck}</p>
          <button
            onClick={() => setAiAck(null)}
            aria-label="סגירה"
            className="shrink-0 text-night/40 transition hover:text-night"
          >
            ✕
          </button>
        </div>
      )}
      <TripWorkspace destinations={destinations} onNewTrip={() => setShowWizard(true)} />
    </>
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
