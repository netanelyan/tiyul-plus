'use client';

import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';

/** פס "הטיול שלי" - מודגש, מוצג רק כשיש טיול פעיל, מעל שורת הכניסות. */
export default function MyTripCard() {
  const { currentTrip: t, hydrated } = useTrip();
  if (!hydrated || !t) return null;
  const stops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
  return (
    <Link
      href="/planner"
      className="mx-auto mb-4 flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-sunset/10 px-5 py-3 ring-1 ring-sunset/25 transition hover:bg-sunset/15"
    >
      <span className="text-xl" aria-hidden>
        🧳
      </span>
      <span className="min-w-0 flex-1 truncate font-bold text-night">
        {t.name}
        <span className="ms-2 font-medium text-night/55">
          {t.days.length} ימים · {stops} עצירות
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold text-sunset-deep">פתיחה במתכנן ←</span>
    </Link>
  );
}
