'use client';

import { useMemo, useState } from 'react';
import type { Destination, Place } from '@/lib/types';
import type { WizardPrefs } from '@/lib/trip/types';
import { categoryMeta } from '@/lib/categories';
import { useTrip } from '@/lib/trip/TripContext';
import { generateTrip, tripFromTemplate } from '@/lib/trip/generate';
import { travelLeg } from '@/lib/trip/travel';
import PlacesMap from '@/components/PlacesMap';

export default function PlannerClient({
  destinations,
  initialSlug,
}: {
  destinations: Destination[];
  initialSlug: string;
}) {
  const trip = useTrip();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  if (!trip.hydrated) {
    return (
      <div className="animate-pulse rounded-3xl bg-shell p-10 text-center font-bold text-night/40 ring-1 ring-night/10">
        טוען את הטיולים שלך…
      </div>
    );
  }

  if (!trip.currentTrip || showWizard) {
    return (
      <Onboarding
        destinations={destinations}
        initialSlug={initialSlug}
        onDone={() => {
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
    />
  );
}

/* ================= Onboarding: אשף + תבניות ================= */

function Onboarding({
  destinations,
  initialSlug,
  onDone,
  onCancel,
}: {
  destinations: Destination[];
  initialSlug: string;
  onDone: () => void;
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

  const toggleCity = (slug: string) =>
    setPrefs((p) => ({
      ...p,
      citySlugs: p.citySlugs.includes(slug)
        ? p.citySlugs.filter((s) => s !== slug)
        : [...p.citySlugs, slug],
    }));

  const canGenerate = prefs.citySlugs.length > 0 && prefs.totalDays >= 1;

  return (
    <div>
      <h1 className="display text-4xl text-night">
        בונים <span className="marker">טיול חדש</span> 🧳
      </h1>
      <p className="mt-2 font-medium text-night/60">
        אשף חכם שמרכיב מסלול לפי הסגנון שלכם - או התחלה ממסלול מוכן. הכול ניתן לעריכה אחר כך.
      </p>
      {onCancel && (
        <button onClick={onCancel} className="mt-2 text-sm font-bold text-sunset-deep hover:underline">
          → חזרה לטיול הנוכחי
        </button>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ---- האשף ---- */}
        <div className="rounded-3xl bg-night p-6">
          <h2 className="display text-2xl text-zest">✨ האשף החכם</h2>

          <div className="mt-4">
            <div className="text-sm font-black text-cream/70">לאן? (אפשר כמה ערים)</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {destinations.map((d) => (
                <button
                  key={d.slug}
                  onClick={() => toggleCity(d.slug)}
                  className={`rounded-full px-3 py-1.5 text-sm font-black transition ${
                    prefs.citySlugs.includes(d.slug)
                      ? 'bg-zest text-night'
                      : 'bg-cream/10 text-cream/80 hover:bg-cream/20'
                  }`}
                >
                  {d.flag} {d.name}
                </button>
              ))}
            </div>
            {prefs.citySlugs.length > 1 && (
              <div className="mt-2 text-xs font-bold text-cream/60">
                🧳 טיול רב-עירוני: {prefs.citySlugs.length} מדינות/ערים, הימים יתחלקו ביניהן
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm font-black text-cream/70">כמה ימים?</div>
              <input
                type="number"
                min={1}
                max={21}
                value={prefs.totalDays}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, totalDays: Math.max(1, Number(e.target.value) || 1) }))
                }
                className="mt-2 w-full rounded-xl bg-cream/10 px-4 py-2.5 font-black text-cream outline-none ring-1 ring-cream/20 focus:ring-zest"
              />
            </label>
            <div>
              <div className="text-sm font-black text-cream/70">קצב</div>
              <Seg
                options={[
                  { v: 'relaxed', l: '🌴 רגוע' },
                  { v: 'packed', l: '⚡ דחוס' },
                ]}
                value={prefs.pace}
                onChange={(v) => setPrefs((p) => ({ ...p, pace: v as WizardPrefs['pace'] }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-black text-cream/70">סוג הטיול</div>
            <Seg
              options={[
                { v: 'city', l: '🏙️ עירוני' },
                { v: 'nature', l: '🌿 טבע' },
                { v: 'combined', l: '🎯 משולב' },
              ]}
              value={prefs.tripType}
              onChange={(v) => setPrefs((p) => ({ ...p, tripType: v as WizardPrefs['tripType'] }))}
            />
          </div>

          <div className="mt-4">
            <div className="text-sm font-black text-cream/70">שופינג</div>
            <Seg
              options={[
                { v: 'more', l: '🛍️ יותר' },
                { v: 'normal', l: '🙂 רגיל' },
                { v: 'less', l: '🚫 פחות' },
              ]}
              value={prefs.shopping}
              onChange={(v) => setPrefs((p) => ({ ...p, shopping: v as WizardPrefs['shopping'] }))}
            />
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-black text-cream">
            <input
              type="checkbox"
              checked={prefs.kosherOnly}
              onChange={(e) => setPrefs((p) => ({ ...p, kosherOnly: e.target.checked }))}
              className="h-4 w-4 accent-[#ffc531]"
            />
            ✡️ לשבץ ארוחה כשרה בכל יום (איפה שיש)
          </label>

          <button
            disabled={!canGenerate}
            onClick={() => {
              const cityNames = prefs.citySlugs
                .map((s) => destinations.find((d) => d.slug === s)?.name)
                .filter(Boolean)
                .join(' + ');
              trip.createTripFrom(generateTrip(prefs, destinations, `טיול ל${cityNames}`));
              onDone();
            }}
            className="mt-5 w-full rounded-2xl bg-sunset px-5 py-3.5 text-lg font-black text-cream transition hover:bg-sunset-deep disabled:opacity-40"
          >
            🪄 תבנה לי טיול!
          </button>
        </div>

        {/* ---- תבניות ---- */}
        <div>
          <h2 className="display text-2xl text-night">🗺️ או ממסלול מוכן</h2>
          <p className="mt-1 text-sm font-medium text-night/60">
            המסלולים שהרכבנו לכל יעד - לוחצים ומקבלים טיול מוכן לעריכה.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {destinations.map((d) => (
              <button
                key={d.slug}
                onClick={() => {
                  trip.createTripFrom(tripFromTemplate(d));
                  onDone();
                }}
                className={`card-pop rounded-3xl bg-shell p-4 text-start ring-1 transition ${
                  d.slug === initialSlug ? 'ring-2 ring-sunset' : 'ring-night/10'
                }`}
              >
                <div className="text-2xl">{d.flag}</div>
                <div className="mt-1 font-black text-night">{d.name}</div>
                <div className="text-xs font-bold text-night/50">
                  מסלול מוכן · {d.itinerary.length} ימים
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              trip.createTrip('הטיול שלי');
              onDone();
            }}
            className="mt-4 w-full rounded-2xl bg-shell px-5 py-3 font-black text-night/70 ring-1 ring-night/15 transition hover:ring-night/40"
          >
            📝 או טיול ריק - אבנה לבד
          </button>
        </div>
      </div>
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
          className={`flex-1 rounded-xl px-2 py-2 text-sm font-black transition ${
            value === o.v ? 'bg-zest text-night' : 'bg-cream/10 text-cream/70 hover:bg-cream/20'
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
}: {
  destinations: Destination[];
  selectedDayId: string | null;
  setSelectedDayId: (id: string | null) => void;
  onNewTrip: () => void;
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
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <input
            value={t.name}
            onChange={(e) => trip.renameTrip(t.id, e.target.value)}
            className="display w-64 rounded-xl bg-transparent text-3xl text-night outline-none ring-sunset/50 transition focus:ring-2"
          />
          <span className="sticker rounded-full bg-zest px-3 py-1 text-xs font-black text-night">
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
              className="rounded-xl bg-shell px-3 py-2 font-bold text-night ring-1 ring-night/15"
            >
              {trip.trips.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          <Btn onClick={onNewTrip}>+ טיול חדש</Btn>
          <Btn onClick={() => trip.duplicateTrip(t.id)}>⧉ שכפול</Btn>
          <Btn onClick={copySummary}>{copied ? '✓ הועתק!' : '📋 העתקת סיכום'}</Btn>
          <Btn onClick={() => window.print()}>🖨️ הדפסה / PDF</Btn>
          <Btn
            danger
            onClick={() => {
              if (confirm('למחוק את הטיול הזה?')) {
                trip.deleteTrip(t.id);
                setSelectedDayId(null);
              }
            }}
          >
            🗑️
          </Btn>
        </div>
      </div>

      {/* Day tabs with travel legs */}
      <div className="mt-5 flex flex-wrap items-center gap-2 print:hidden">
        {t.days.map((d, i) => {
          const dst = destOf(d.citySlug);
          const prev = i > 0 ? t.days[i - 1] : null;
          const cityChanged = prev && prev.citySlug !== d.citySlug;
          return (
            <span key={d.id} className="flex items-center gap-2">
              {cityChanged && (
                <span className="rounded-full bg-night/5 px-2.5 py-1 text-xs font-bold text-night/50">
                  {travelLeg(prev!.citySlug, d.citySlug).emoji}
                </span>
              )}
              <button
                onClick={() => setSelectedDayId(d.id)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  day?.id === d.id
                    ? 'bg-sunset text-cream shadow-md'
                    : 'bg-shell text-night/60 ring-1 ring-night/15 hover:ring-night/40'
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
          className="rounded-full bg-night px-3 py-2 text-sm font-black text-zest"
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
        <div className="mt-5 grid gap-5 lg:grid-cols-5 print:hidden">
          {/* Day panel */}
          <div className="space-y-3 lg:col-span-2">
            {/* Travel leg banner */}
            {(() => {
              const i = t.days.findIndex((d) => d.id === day.id);
              const prev = i > 0 ? t.days[i - 1] : null;
              if (prev && prev.citySlug !== day.citySlug) {
                const leg = travelLeg(prev.citySlug, day.citySlug);
                return (
                  <div className="rounded-2xl bg-zest px-4 py-3 text-sm font-black text-night">
                    {leg.emoji} {destOf(prev.citySlug)?.name} ← {dayDest.name} · {leg.label}
                  </div>
                );
              }
              return null;
            })()}

            <div className="rounded-3xl bg-night p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="display text-lg text-cream">
                  {dayDest.flag} יום {t.days.findIndex((d) => d.id === day.id) + 1} · {dayDest.name}
                </h2>
                {t.days.length > 1 && (
                  <button
                    onClick={() => {
                      trip.removeDay(day.id);
                      setSelectedDayId(null);
                    }}
                    className="rounded-full bg-cream/10 px-2.5 py-1 text-xs font-bold text-cream/70 hover:bg-cream/20"
                  >
                    🗑️ מחיקת יום
                  </button>
                )}
              </div>
              <textarea
                value={day.notes ?? ''}
                onChange={(e) => trip.setDayNotes(day.id, e.target.value)}
                placeholder="💡 הערות ליום הזה…"
                rows={2}
                className="mt-3 w-full resize-none rounded-2xl bg-cream/10 px-4 py-2.5 text-sm text-cream outline-none ring-1 ring-cream/10 placeholder:text-cream/40 focus:ring-zest"
              />
              {dayPlaces.length > 1 && (
                <a
                  href={googleDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block rounded-2xl bg-sunset px-4 py-3 text-center text-sm font-black text-cream transition hover:bg-sunset-deep"
                >
                  🧭 פתיחת ניווט היום ב-Google Maps
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
                    className="flex gap-3 rounded-3xl bg-shell p-4 ring-1 ring-night/10"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {i + 1}
                      </div>
                      <button
                        onClick={() => trip.movePlace(day.id, i, -1)}
                        disabled={i === 0}
                        className="text-night/40 hover:text-night disabled:opacity-20"
                        aria-label="הזז למעלה"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => trip.movePlace(day.id, i, 1)}
                        disabled={i === dayPlaces.length - 1}
                        className="text-night/40 hover:text-night disabled:opacity-20"
                        aria-label="הזז למטה"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-black text-night">
                          {place.name}
                          <span className="ms-2 text-xs font-bold text-night/40">
                            {meta.emoji} {meta.label}
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
                          className="mt-1.5 rounded-lg bg-night/5 px-2 py-1 text-xs font-bold text-night/50"
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
                className="w-full rounded-2xl bg-shell px-4 py-3 font-black text-night/70 ring-1 ring-night/15"
              >
                <option value="">+ הוספת עצירה מהקטלוג של {dayDest.name}…</option>
                {availableToAdd.map((p) => (
                  <option key={p.id} value={p.id}>
                    {categoryMeta[p.category].emoji} {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Map */}
          <div className="h-[420px] overflow-hidden rounded-3xl shadow-sm ring-1 ring-night/10 lg:sticky lg:top-20 lg:col-span-3 lg:h-[640px]">
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
        <div className="mt-6 rounded-3xl bg-shell p-8 text-center font-bold text-night/50 ring-1 ring-night/10 print:hidden">
          הטיול ריק - הוסיפו יום למעלה, או הוסיפו מקומות מעמודי היעדים 🗺️
        </div>
      )}

      {/* ---- Print-only summary ---- */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-black">🧳 {t.name} - טיול+</h1>
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
              <h2 className="mt-2 text-lg font-black">
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
      className={`rounded-xl px-3.5 py-2 font-black transition ${
        danger
          ? 'bg-shell text-sunset-deep ring-1 ring-night/15 hover:bg-sunset hover:text-cream'
          : 'bg-shell text-night/70 ring-1 ring-night/15 hover:ring-night/40'
      }`}
    >
      {children}
    </button>
  );
}
