'use client';

import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';
import { daysHe } from '@/lib/duration';

/**
 * "יש לכם טיולים פתוחים" - **בחירה גלויה, אף פעם לא ברירת מחדל.**
 *
 * נתנאל: *"טיול קיים נפתח רק כשמישהו בוחר בו במפורש. אם אנחנו מציעים
 * להמשיך, זו בחירה גלויה לצד התחלה חדשה - לעולם לא ברירת מחדל ולא בשקט."*
 *
 * לכן זה רכיב תצוגה בלבד: הוא לא קורא ל-`setCurrentId` ולא פותח כלום.
 * כל שורה היא קישור ל-`/chat?trip=<id>`, כלומר הפתיחה קורית רק בעקבות
 * לחיצה, והיא מופיעה בכתובת - מה שגם מאפשר לרענון להישאר באותו טיול.
 */
export default function ResumeTrips({ className = '' }: { className?: string }) {
  const { trips, hydrated } = useTrip();
  if (!hydrated || trips.length === 0) return null;

  // האחרון שנגעו בו קודם - זה מה שמישהו מחפש כשהוא בא להמשיך
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
