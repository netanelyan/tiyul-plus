'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Destination, Place } from '@/lib/types';
import { categoryMeta } from '@/lib/categories';
import { useTrip } from '@/lib/trip/TripContext';
import { travelLeg } from '@/lib/trip/travel';
import { dayDescription } from '@/lib/trip/dayDescription';
import { formatHebrewRange } from '@/lib/trip/dates';
import type { SharedTrip } from '@/lib/trip/share';
import { tripFromShared } from '@/lib/trip/share';
import PlacesMap from '@/components/PlacesMap';
import Flag from '@/components/Flag';
import { daysHe } from '@/lib/duration';

/**
 * תצוגת קריאה-בלבד של טיול משותף + ייבוא עותק ל"טיולים שלי".
 *
 * **הערים מגיעות כ-props מהשרת** ולא מייבוא של הקטלוג: העמוד הזה כבר
 * מפענח את הקוד בשרת ויודע בדיוק באילו ערים מדובר, כך שאין שום סיבה
 * שהדפדפן יוריד 2MB של קטלוג בשביל טיול של עיר או שתיים.
 */
export default function SharedTripView({
  shared,
  cityData,
}: {
  shared: SharedTrip;
  cityData: Destination[];
}) {
  const trip = useTrip();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const destOf = (slug: string) => cityData.find((d) => d.slug === slug);
  const placeOf = (slug: string, id: string): Place | undefined =>
    destOf(slug)?.places.find((p) => p.id === id);

  const totalStops = shared.days.reduce((n, d) => n + d.placeIds.length, 0);
  const cities = useMemo(
    () => [...new Set(shared.days.map((d) => d.citySlug))].map(destOf).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shared],
  );

  const allPlaces: Place[] = useMemo(
    () =>
      shared.days.flatMap((d) =>
        d.placeIds.map((id) => placeOf(d.citySlug, id)).filter((p): p is Place => Boolean(p)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shared],
  );
  const mapCenter = allPlaces[0]
    ? { lat: allPlaces[0].lat, lng: allPlaces[0].lng }
    : { lat: 48.2, lng: 16.37 };

  function saveToMyTrips() {
    trip.createTripFrom(tripFromShared(shared));
    setSaved(true);
    setTimeout(() => router.push('/chat'), 600);
  }

  return (
    <div className="rise-in">
      {/* כותרת */}
      <div className="rounded-3xl bg-shell p-6 ring-1 ring-night/10 sm:p-8">
        <p className="text-xs font-bold text-sunset-deep">טיול ששותף איתכם · צפייה חופשית</p>
        <h1 className="display mt-1 text-3xl text-night">{shared.name}</h1>
        <p className="mt-2 text-sm font-semibold text-night/60">
          {daysHe(shared.days.length)} · {totalStops} עצירות
          {formatHebrewRange(shared.startDate, shared.endDate)
            ? ` · ${formatHebrewRange(shared.startDate, shared.endDate)}`
            : ''}{' '}
          ·{' '}
          {cities.map((c, i) => (
            <span key={c!.slug}>
              {i > 0 && ' + '}
              <Flag flag={c!.flag} label={c!.name} size="sm" className="mx-1" />
              {c!.name}
            </span>
          ))}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={saveToMyTrips}
            disabled={saved}
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-70"
          >
            {saved ? '✓ נשמר - עוברים לטיול...' : 'שמירה אצלי ועריכה חופשית'}
          </button>
          <span className="text-xs font-medium text-night/45">
            נשמר עותק ל&quot;הטיולים שלי&quot; - המקור של השולח לא משתנה
          </span>
        </div>
      </div>

      {/* מפה */}
      <div className="mt-5 h-[320px] overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-[400px]">
        <PlacesMap center={mapCenter} zoom={12} places={allPlaces} />
      </div>

      {/* הימים */}
      <div className="mt-5 space-y-4">
        {shared.days.map((d, i) => {
          const dst = destOf(d.citySlug);
          const prev = i > 0 ? shared.days[i - 1] : null;
          const dayObj = { id: String(i), citySlug: d.citySlug, placeIds: d.placeIds, notes: d.notes };
          // המעבר מחושב מהקואורדינטות האמיתיות. אין כאן דגל רכב:
          // מטען השיתוף לא כולל preferences במכוון, אז hasCar נשאר false.
          const leg =
            prev && prev.citySlug !== d.citySlug
              ? travelLeg(prev.citySlug, d.citySlug, {
                  from: destOf(prev.citySlug),
                  to: destOf(d.citySlug),
                })
              : null;
          return (
            <div key={i}>
              {prev && leg && (
                <p className="mb-4 rounded-full border-[1.5px] border-dashed border-sunset/55 px-4 py-2 text-center text-sm font-bold text-night">
                  {leg.emoji} מעבר: {destOf(prev.citySlug)?.name} ←{' '}
                  {dst?.name} · {leg.label}
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
                    <p className="text-xs text-night/55">{dayDescription(dayObj, dst)}</p>
                  </div>
                </div>
                {d.notes && (
                  <p className="mt-3 rounded-lg bg-zest/15 px-3 py-2 text-sm text-night">💡 {d.notes}</p>
                )}
                <ol className="mt-3 space-y-2">
                  {d.placeIds.map((pid, j) => {
                    const p = placeOf(d.citySlug, pid);
                    if (!p) return null;
                    return (
                      <li key={pid} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-night/5 text-xs font-bold text-night/70">
                          {j + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-night">
                            {p.name}
                            {p.mustSee && (
                              <span className="ms-1.5 text-sm text-zest" title="חובה לראות">
                                ★
                              </span>
                            )}
                            <span className="ms-2 text-xs font-medium text-night/45">
                              {categoryMeta[p.category].label}
                            </span>
                          </p>
                          <p className="line-clamp-2 text-sm leading-relaxed text-night/60">
                            {p.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>
          );
        })}
      </div>

      {/* CTA תחתון */}
      <div className="mt-6 rounded-2xl bg-night px-6 py-5 text-center">
        <p className="font-bold text-cream">רוצים לערוך את המסלול או לבנות אחד משלכם?</p>
        <button
          onClick={saveToMyTrips}
          disabled={saved}
          className="mt-3 rounded-xl bg-sunset px-6 py-2.5 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-70"
        >
          {saved ? '✓ נשמר' : 'שמירה אצלי בחינם'}
        </button>
      </div>
    </div>
  );
}
