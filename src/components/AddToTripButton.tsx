'use client';

import { useState } from 'react';
import { useTrip } from '@/lib/trip/TripContext';

export default function AddToTripButton({
  citySlug,
  placeId,
}: {
  citySlug: string;
  placeId: string;
}) {
  const { addPlace, currentTrip, hydrated } = useTrip();
  const [added, setAdded] = useState<number | null>(null);

  const inTrip =
    currentTrip?.days.some((d) => d.placeIds.includes(placeId)) ?? false;

  if (!hydrated) return null;

  if (inTrip || added !== null) {
    return (
      <span className="rounded-full bg-night px-3 py-1.5 text-xs font-black text-zest">
        ✓ בטיול שלי{added !== null ? ` · יום ${added + 1}` : ''}
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        const { dayIndex } = addPlace(citySlug, placeId);
        setAdded(dayIndex);
        setTimeout(() => setAdded(null), 2500);
      }}
      className="rounded-full bg-sunset px-3 py-1.5 text-xs font-black text-cream transition hover:bg-sunset-deep"
    >
      + הוספה לטיול
    </button>
  );
}
