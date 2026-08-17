'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';
import { countdown, formatHebrewRange, todayISO } from '@/lib/trip/dates';
import { daysHe } from '@/lib/duration';

/**
 * The "my trip" bar - emphasised, above the row of entries.
 *
 * **The most recently touched trip, and not "the open trip".** Once the open trip stopped
 * persisting between entries (see `AgentWorkspace`), "open" is not a state that exists on the
 * homepage. What does exist is "what I did most recently", and the link carries `?trip=` - i.e.
 * an explicit open on click, which is exactly what this card is meant to be.
 */
export default function MyTripCard() {
  const { trips, hydrated } = useTrip();
  const t = [...trips].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? null;
  // The date is read only after mount: the server and the browser can be on different days,
  // and a countdown rendered on the server is a guaranteed hydration mismatch.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayISO()), []);
  if (!hydrated || !t) return null;
  const stops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
  const cd = today ? countdown(today, t.startDate, t.endDate) : null;
  const when = formatHebrewRange(t.startDate, t.endDate);
  return (
    <Link
      href={`/chat?trip=${encodeURIComponent(t.id)}`}
      className="mx-auto mb-4 flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-sunset/10 px-5 py-3 ring-1 ring-sunset/25 transition hover:bg-sunset/15"
    >
      <span className="text-xl" aria-hidden>
        🧳
      </span>
      <span className="min-w-0 flex-1 truncate font-bold text-night">
        {t.name}
        <span className="ms-2 font-medium text-night/55">
          {daysHe(t.days.length)} · {stops} עצירות{when ? ` · ${when}` : ''}
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
