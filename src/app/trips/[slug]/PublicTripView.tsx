'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PlacesMap from '@/components/PlacesMap';
import Flag from '@/components/Flag';
import { ZoomablePhoto } from '@/components/PhotoLightbox';
import { categoryMeta } from '@/lib/categories';
import { daysHe } from '@/lib/duration';
import { track } from '@/lib/analytics';
import { useTrip } from '@/lib/trip/TripContext';
import { dayDescription } from '@/lib/trip/dayDescription';
import { travelLeg } from '@/lib/trip/travel';
import { newId } from '@/lib/trip/types';
import { formatRange, tripCost, type CostCity } from '@/lib/trip/cost';
import type { PublicDay } from '@/lib/trip/publicTrip';
import type { Destination, Place } from '@/lib/types';
import EmbedSnippet from '@/components/EmbedSnippet';

/**
 * The reader's view of a published trip.
 *
 * Presentational: everything it renders arrives as props, already resolved from
 * the catalog on the server. It has no idea who published this and no way to
 * find out - there is no owner field in what it receives.
 *
 * **The cities arrive as props rather than by importing the catalog**, the same
 * rule `SharedTripView` follows: a two-city trip must not ship 4MB of
 * destinations to the browser.
 */
export default function PublicTripView({
  slug,
  days,
  cities,
  month,
  title,
  description,
  stopCount,
}: {
  slug: string;
  days: PublicDay[];
  cities: Destination[];
  month: string | null;
  title: string;
  description: string;
  stopCount: number;
}) {
  const trip = useTrip();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const destOf = (s: string) => cities.find((c) => c.slug === s);
  const placeOf = (citySlug: string, id: string): Place | undefined =>
    destOf(citySlug)?.places.find((p) => p.id === id);

  const allPlaces: Place[] = useMemo(
    () =>
      days.flatMap((d) =>
        d.placeIds.map((id) => placeOf(d.citySlug, id)).filter((p): p is Place => Boolean(p)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, cities],
  );

  const center = allPlaces[0] ? { lat: allPlaces[0].lat, lng: allPlaces[0].lng } : { lat: 41.9, lng: 12.5 };

  /*
    The daily spend, from the deterministic cost model - the same arithmetic the
    trip screen runs, on stored published figures. 'mid' is used because this page
    has no traveller to ask: the owner's own budget preference is **not** part of
    the published snapshot, deliberately, so there is nothing personal to read it
    from. The style is stated on screen rather than implied.
  */
  const costCities = useMemo(() => {
    const map: Record<string, CostCity> = {};
    for (const c of cities) map[c.slug] = { name: c.name, dailyCost: c.dailyCost, dailyBudget: c.dailyBudget };
    return map;
  }, [cities]);

  const cost = useMemo(
    () =>
      tripCost(
        { days: days.map((d, i) => ({ id: String(i), citySlug: d.citySlug, placeIds: d.placeIds })) },
        'mid',
        costCities,
      ),
    [days, costCities],
  );

  /** Copy this itinerary into the visitor's own planner, as a new editable trip. */
  function duplicate() {
    track('share_duplicate', { surface: 'public_trip' });
    trip.createTripFrom({
      id: newId(),
      // A generated name, not the publisher's - they never gave us one to copy,
      // and the visitor is about to rename it anyway.
      name: title.replace(/ - .*$/, ''),
      citySlugs: cities.map((c) => c.slug),
      createdAt: Date.now(),
      days: days.map((d) => ({ id: newId(), citySlug: d.citySlug, placeIds: [...d.placeIds] })),
    });
    setCopied(true);
    setTimeout(() => router.push('/chat'), 600);
  }

  return (
    <div className="rise-in">
      <header className="rounded-3xl bg-shell p-6 ring-1 ring-night/10 sm:p-8">
        <p className="text-xs font-bold text-sunset-deep">מסלול של מטייל · פורסם באתר</p>
        <h1 className="display mt-1 text-3xl text-night sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-night/70">
          {daysHe(days.length)} · {stopCount} עצירות
          {month ? ` · נסיעה בחודש ${month}` : ''} ·{' '}
          {cities.map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ' + '}
              <Flag flag={c.flag} label={c.name} size="sm" className="mx-1" />
              <Link href={`/destinations/${c.slug}`} className="underline hover:text-night">
                {c.name}
              </Link>
            </span>
          ))}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-night/70">{description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={duplicate}
            disabled={copied}
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-70"
          >
            {copied ? '✓ נשמר אצלכם, רגע…' : 'שכפלו את הטיול הזה ושנו אותו'}
          </button>
          <span className="text-xs font-medium text-night/65">
            נפתח אצלכם כטיול חדש שאפשר לערוך. המסלול המקורי לא משתנה.
          </span>
        </div>

        {/*
          Said plainly, near the top, because a reader who does not know what this
          page is will assume it is an editorial recommendation from us.
        */}
        <p className="mt-4 rounded-xl bg-night/5 px-3 py-2 text-xs leading-relaxed text-night/70">
          מסלול שבנה מטייל בטיול+ ובחר לפרסם. העצירות הן מקומות מהקטלוג שלנו, בלי שמות,
          תגובות או תאריכים מדויקים. כדאי לוודא שעות פתיחה ומחירים מול המקומות עצמם.
        </p>
      </header>

      <div className="mt-5 h-[320px] overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-[400px]">
        <PlacesMap center={center} zoom={12} places={allPlaces} />
      </div>

      {/* ---------- The daily spend ---------- */}
      {cost.lines.length > 0 && (
        <section className="mt-5 rounded-2xl bg-shell p-5 ring-1 ring-night/10">
          <h2 className="text-sm font-bold text-night">כמה עולה יום כזה</h2>
          <p className="mt-1 text-xs leading-relaxed text-night/65">
            הוצאה יומית לאדם בסגנון בינוני - תחבורה, אוכל וכניסות. בלי טיסות ובלי לינה.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-night/75">
            {cost.lines.map((l) => (
              <li key={l.citySlug} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-night">{l.cityName}</span>
                {/*
                  The source's own currency, not shekels. Converting would need an
                  exchange rate, and this codebase does not hold one - a made-up
                  rate on an indexable page is exactly the kind of invented number
                  hard rule 2 forbids. Israeli destinations publish in ILS and
                  therefore already read as shekels here.
                */}
                <span dir="ltr" className="font-mono text-xs text-night/70">
                  {formatRange(l.perDayLow, l.perDayHigh, l.currency)}
                </span>
              </li>
            ))}
          </ul>
          {!cost.complete && (
            <p className="mt-2 text-xs text-night/65">
              לחלק מהערים במסלול אין אצלנו נתוני הוצאה, אז זה לא הסכום המלא.
            </p>
          )}
        </section>
      )}

      {/* ---------- Day by day ---------- */}
      <div className="mt-5 space-y-4">
        {days.map((d, i) => {
          const dst = destOf(d.citySlug);
          const prev = i > 0 ? days[i - 1] : null;
          const leg =
            prev && prev.citySlug !== d.citySlug
              ? travelLeg(prev.citySlug, d.citySlug, {
                  from: destOf(prev.citySlug),
                  to: destOf(d.citySlug),
                })
              : null;
          return (
            <div key={i}>
              {leg && prev && (
                <p className="mb-4 rounded-full border-[1.5px] border-dashed border-sunset/55 px-4 py-2 text-center text-sm font-bold text-night">
                  {leg.emoji} מעבר: {destOf(prev.citySlug)?.name} ← {dst?.name} · {leg.label}
                </p>
              )}
              <section className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunset font-black text-cream">
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="font-bold text-night">
                      יום {i + 1} · {dst?.name}
                    </h2>
                    {/*
                      Generated from the day's real stops, never a theme somebody
                      wrote - the publisher's notes are not in the snapshot at all.
                    */}
                    <p className="text-xs text-night/70">
                      {dayDescription({ id: String(i), citySlug: d.citySlug, placeIds: d.placeIds }, dst)}
                    </p>
                  </div>
                </div>
                <ol className="mt-3 space-y-3">
                  {d.placeIds.map((pid, j) => {
                    const p = placeOf(d.citySlug, pid);
                    if (!p) return null;
                    return (
                      <li key={pid} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-night/5 text-xs font-bold text-night/70">
                          {j + 1}
                        </span>
                        <ZoomablePhoto place={p} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
                        <div className="min-w-0">
                          <p className="font-semibold text-night">
                            {p.name}
                            {p.mustSee && (
                              <span className="ms-1.5 text-sm text-zest" title="חובה לראות">
                                ★
                              </span>
                            )}
                            <span className="ms-2 whitespace-nowrap text-xs font-medium text-night/65">
                              {categoryMeta[p.category].label}
                            </span>
                          </p>
                          <p className="line-clamp-3 text-sm leading-relaxed text-night/70">
                            {p.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                  {d.placeIds.length === 0 && (
                    <li className="text-sm text-night/65">יום חופשי - בלי עצירות מתוכננות</li>
                  )}
                </ol>
              </section>
            </div>
          );
        })}
      </div>

      {/* ---------- For bloggers ---------- */}
      <EmbedSnippet slug={slug} title={title} className="mt-6" />

      {/* ---------- The invitation ---------- */}
      <div className="mt-6 rounded-2xl bg-night px-6 py-6 text-center">
        <p className="font-bold text-cream">רוצים מסלול כזה, לפי מה שמעניין אתכם?</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-cream/70">
          ספרו לאן ומתי, והסוכן בונה מסלול אמיתי עם מפה. בלי להירשם ובלי לשלם.
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/planner"
            onClick={() => track('share_cta_click', { surface: 'public_trip', element: 'inline' })}
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
          >
            תכננו טיול משלכם, בחינם
          </Link>
          <Link
            href={`/destinations/${cities[0]?.slug ?? ''}`}
            className="rounded-xl bg-cream/10 px-6 py-3 font-bold text-cream ring-1 ring-cream/25 transition hover:bg-cream/15"
          >
            עוד על {cities[0]?.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
