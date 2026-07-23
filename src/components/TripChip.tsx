'use client';

import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';

export default function TripChip() {
  const { currentTrip, hydrated } = useTrip();
  if (!hydrated || !currentTrip) return null;
  const stops = currentTrip.days.reduce((n, d) => n + d.placeIds.length, 0);
  return (
    <Link
      href="/planner"
      className="hidden max-w-56 truncate rounded-full bg-sunset px-3.5 py-1.5 text-xs font-bold text-cream transition hover:bg-sunset-deep sm:inline-block"
      title={currentTrip.name}
    >
      {currentTrip.name} · {stops} עצירות
    </Link>
  );
}
