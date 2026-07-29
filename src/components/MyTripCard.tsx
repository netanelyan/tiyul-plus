'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';
import { countdown, formatHebrewRange, todayISO } from '@/lib/trip/dates';

/** פס "הטיול שלי" - מודגש, מוצג רק כשיש טיול פעיל, מעל שורת הכניסות. */
export default function MyTripCard() {
  const { currentTrip: t, hydrated } = useTrip();
  // התאריך נקרא אחרי ה-mount בלבד: השרת והדפדפן יכולים להיות בימים
  // שונים, וספירה לאחור שמרונדרת בשרת היא אי-התאמת hydration מובטחת.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayISO()), []);
  if (!hydrated || !t) return null;
  const stops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
  const cd = today ? countdown(today, t.startDate, t.endDate) : null;
  const when = formatHebrewRange(t.startDate, t.endDate);
  return (
    <Link
      href="/chat"
      className="mx-auto mb-4 flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-sunset/10 px-5 py-3 ring-1 ring-sunset/25 transition hover:bg-sunset/15"
    >
      <span className="text-xl" aria-hidden>
        🧳
      </span>
      <span className="min-w-0 flex-1 truncate font-bold text-night">
        {t.name}
        <span className="ms-2 font-medium text-night/55">
          {t.days.length} ימים · {stops} עצירות{when ? ` · ${when}` : ''}
        </span>
      </span>
      {cd && cd.kind !== 'past' && (
        <span className="shrink-0 rounded-full bg-sunset px-2.5 py-1 text-xs font-bold text-cream">
          {cd.label}
        </span>
      )}
      <span className="shrink-0 text-sm font-bold text-sunset-deep">פתיחת הטיול ←</span>
    </Link>
  );
}
