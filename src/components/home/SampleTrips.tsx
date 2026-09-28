'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/lib/trip/TripContext';
import { fetchCities } from '@/lib/trip/cityData';
import { SAMPLE_TRIPS, buildSampleTrip, type SampleTrip } from '@/lib/trip/sampleTrips';
import { track as gaTrack } from '@/lib/analytics';

/**
 * The hero's three one-tap sample trips.
 *
 * The hero used to be a promise and an empty text box: a visitor arriving from TikTok
 * or a search had to invent a sentence before seeing anything the product does. These
 * turn it into a demonstration - one tap and a real mapped itinerary is on screen,
 * editable, before anybody has typed a word.
 *
 * Definitions and builders live in `lib/trip/sampleTrips.ts`; this file is the UI.
 *
 * ## The catalog is NOT imported here
 *
 * `fetchCities` goes through `/api/cities` - about 7kB per city, cached per session -
 * for the same reason the itinerary pages do it: importing the catalog into a client
 * component is the 492kB regression this project already fixed once, and doing it in
 * the homepage hero would put it on the one page every visitor loads. The fetch happens
 * on the press, so a visitor who never taps pays nothing at all.
 */
export default function SampleTrips() {
  const trip = useTrip();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(sample: SampleTrip) {
    if (busy) return;
    setBusy(sample.key);
    setError(null);
    gaTrack('trip_created', { source: 'homepage_sample', product: sample.key });
    try {
      const cities = await fetchCities(sample.citySlugs);
      const built = buildSampleTrip(sample, cities);
      if (!built) {
        /*
          buildSampleTrip returns null rather than a partial trip - a missing city or an
          empty day would make the hero demo the worst-looking screen on the site. Say so
          and leave the rest of the hero usable.
        */
        setError('לא הצלחנו לפתוח את הדוגמה הזאת. אפשר לכתוב לסוכן מה מחפשים ונבנה מסלול.');
        setBusy(null);
        return;
      }
      trip.createTripFrom(built);
      /*
        `?trip=<id>`, not a bare `/chat` - a clean `/chat` resets currentId by design
        ("start a new trip"), so pushing it would create the sample and then show the
        visitor the empty hero they just left. See OpenInPlanner for the measurement.
      */
      router.push(`/chat?trip=${encodeURIComponent(built.id)}`);
    } catch {
      setError('משהו השתבש. נסו שוב עוד רגע.');
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      <p className="text-center text-xs font-bold text-night/65">
        או פשוט תראו איך זה נראה - לחיצה אחת, מסלול מלא עם מפה:
      </p>
      {/*
        One column on a phone: three side-by-side cards at 390px would each be ~120px
        wide, which cannot hold "Athens + Santorini, 7 days" without truncating the one
        thing the button is promising.
      */}
      <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
        {SAMPLE_TRIPS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => void open(s)}
            disabled={busy !== null}
            className="card-pop flex items-center gap-3 rounded-2xl bg-shell px-4 py-3 text-start ring-1 ring-night/10 transition hover:bg-cream disabled:opacity-60 sm:flex-col sm:items-start sm:gap-1"
          >
            <span aria-hidden className="text-xl leading-none">
              {s.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-night">
                {busy === s.key ? 'פותח…' : s.label}
              </span>
              <span className="block truncate text-xs font-medium text-night/65">{s.sub}</span>
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-bold text-night">
          {error}
        </p>
      )}
    </div>
  );
}
