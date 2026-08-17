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
  /*
    **Which trip is meant is stated explicitly.** Ever since the open trip
    stopped surviving between visits, arriving at a destination page usually
    means no open trip - and then `addPlace` creates a new one. That is fine,
    but it has to be said: a button labeled "added to my trip" without saying
    to WHICH trip is exactly the silent assumption Netanel asked to get rid of.
  */
  const { addPlace, currentTrip, hydrated } = useTrip();
  const [added, setAdded] = useState<{ dayIndex: number; name: string } | null>(null);

  const inTrip =
    currentTrip?.days.some((d) => d.placeIds.includes(placeId)) ?? false;

  if (!hydrated) return null;

  if (inTrip || added !== null) {
    return (
      <span className="rounded-full bg-night/10 px-3 py-1.5 text-xs font-semibold text-night/70">
        {added
          ? `✓ נוסף ל״${added.name}״ · יום ${added.dayIndex + 1}`
          : `✓ כבר ב״${currentTrip?.name ?? 'טיול שלי'}״`}
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        const { dayIndex } = addPlace(citySlug, placeId);
        setAdded({ dayIndex, name: currentTrip?.name ?? 'הטיול שלי' });
        setTimeout(() => setAdded(null), 3500);
      }}
      className="rounded-full bg-sunset px-3 py-1.5 text-xs font-bold text-cream transition hover:bg-sunset-deep"
    >
      {currentTrip ? `+ הוספה ל״${currentTrip.name}״` : '+ הוספה לטיול חדש'}
    </button>
  );
}
