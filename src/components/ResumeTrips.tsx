'use client';

import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';
import { daysHe } from '@/lib/duration';

/**
 * "You have open trips" - **a visible choice, never a default.**
 *
 * Netanel: *"An existing trip opens only when somebody explicitly chooses it. If we offer to
 * continue, that is a visible choice alongside starting fresh - never a default and never silently."*
 *
 * So this is a presentational component only: it does not call `setCurrentId` and does not open
 * anything. Each row is a link to `/chat?trip=<id>`, i.e. opening happens only as a result of a
 * click, and it shows up in the URL - which also lets a refresh stay on the same trip.
 */
export default function ResumeTrips({ className = '' }: { className?: string }) {
  const { trips, hydrated } = useTrip();
  if (!hydrated || trips.length === 0) return null;

  // Most recently touched first - that is what somebody is looking for when they come to continue
  const ordered = [...trips].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 4);

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      <p className="text-center text-xs font-bold text-night/40">או ממשיכים טיול קיים</p>
      <ul className="mt-2 flex flex-wrap justify-center gap-2">
        {ordered.map((t) => {
          const stops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
          return (
            <li key={t.id}>
              <Link
                href={`/chat?trip=${encodeURIComponent(t.id)}`}
                className="flex min-h-11 items-center gap-2 rounded-full bg-shell px-4 py-2 text-sm font-bold text-night/75 ring-1 ring-night/10 transition hover:bg-night/[0.04] hover:text-night"
              >
                <span aria-hidden>🧳</span>
                <span className="max-w-52 truncate">{t.name}</span>
                <span className="font-medium text-night/40">
                  {daysHe(t.days.length)} · {stops} עצירות
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
