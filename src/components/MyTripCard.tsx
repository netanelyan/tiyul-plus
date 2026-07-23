'use client';

import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';

/** כרטיס "הטיול שלי" בפורטל של דף הבית - מוצג רק כשיש טיול פעיל. */
export default function MyTripCard() {
  const { currentTrip: t, hydrated } = useTrip();
  if (!hydrated || !t) return null;
  const stops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
  return (
    <Link
      href="/planner"
      className="card-pop rounded-2xl bg-shell p-5 ring-1 ring-night/10"
    >
      <div className="badge h-10 w-10 justify-center rounded-xl bg-sunset/10 text-xl">🧳</div>
      <h3 className="mt-3 font-bold text-night">הטיול שלי</h3>
      <p className="mt-1 truncate text-sm leading-relaxed text-night/60">
        {t.name} · {t.days.length} ימים · {stops} עצירות
      </p>
    </Link>
  );
}
