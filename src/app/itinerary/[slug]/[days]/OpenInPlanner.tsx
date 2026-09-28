'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/lib/trip/TripContext';
import { fetchCities } from '@/lib/trip/cityData';
import { tripFromTemplate } from '@/lib/trip/generate';
import { daysHe } from '@/lib/duration';
import { inHe } from '@/lib/hebrew';
import { track as gaTrack } from '@/lib/analytics';

/**
 * One tap from reading an itinerary to owning it.
 *
 * This is the whole reason the itinerary pages are landing pages rather than
 * articles: the visitor arrived from a search for "maslul 5 yamim be-Roma" (a 5-day Rome itinerary), read the
 * real route, and the next thing they can do is have it - editable, on the map, with
 * their own dates - without typing anything.
 *
 * ## Why the city is fetched on click, not imported
 *
 * `tripFromTemplate` needs the full `Destination` (places, itinerary), and importing
 * the catalog into a client component is the 492kB regression this project already
 * fixed once: `SiteNav` pulled it in via one helper and every page in the site paid
 * for it. `fetchCities` goes through `/api/cities`, which is the same route the
 * planner's own template buttons use - about 7kB for one city, cached per session.
 *
 * ## Why it creates the trip here rather than passing a query parameter
 *
 * A `?build=rome-5` parameter would have to be parsed by the trip screen, which means
 * the screen needs to know about this page type, and a malformed parameter becomes a
 * silent no-op on arrival. Building it here means the button either works or says
 * why, and the trip screen stays a screen that shows a trip.
 */
export default function OpenInPlanner({
  slug,
  days,
  label,
}: {
  slug: string;
  days: number;
  /** The visible text. The page passes the page title, so the button names what it opens. */
  label: string;
}) {
  const trip = useTrip();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (busy) return;
    setBusy(true);
    setError(null);
    gaTrack('trip_created', { source: 'itinerary_page', product: `${slug}-${days}` });
    try {
      const [full] = await fetchCities([slug]);
      if (!full) {
        setError('לא הצלחנו לטעון את היעד. נסו לרענן את הדף.');
        setBusy(false);
        return;
      }
      /*
        The name is the page's own title, so the trip a visitor lands on is called
        what the page they came from was called. `tripFromTemplate` would otherwise
        name it "a trip to Rome" and the LENGTH - the thing they actually searched
        for - would vanish at the moment of conversion.
      */
      const built = tripFromTemplate(full, {
        days,
        name: `מסלול ${daysHe(days)} ${inHe(full.name)}`,
      });
      trip.createTripFrom(built);
      /*
        `?trip=<id>` and NOT a bare `/chat`.

        A clean `/chat` deliberately RESETS currentId - that is how "start a new trip"
        works - so pushing it would create the trip and then land the visitor on the
        empty landing hero, with their new trip reachable only from the nav. Measured in
        a browser: 1 trip in storage, currentId null, and the hero on screen. The trip id
        in the URL is the documented way to open a specific trip.
      */
      router.push(`/chat?trip=${encodeURIComponent(built.id)}`);
    } catch {
      setError('משהו השתבש. נסו שוב עוד רגע.');
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        className="w-full rounded-2xl bg-sunset px-6 py-4 text-base font-black text-cream transition hover:bg-sunset-deep disabled:opacity-60"
      >
        {busy ? 'פותח את המסלול…' : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-bold text-night">
          {error}
        </p>
      )}
    </div>
  );
}
