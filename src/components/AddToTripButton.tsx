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
    **מאיזה טיול מדובר נאמר במפורש.** מאז שהטיול הפתוח לא שורד בין כניסות,
    כניסה לדף יעד היא בדרך כלל בלי טיול פתוח - ואז `addPlace` יוצר טיול
    חדש. זה בסדר, אבל זה חייב להיאמר: כפתור שכתוב עליו "נוסף לטיול שלי"
    בלי לומר לאיזה הוא בדיוק ההנחה השקטה שנתנאל ביקש להיפטר ממנה.
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
