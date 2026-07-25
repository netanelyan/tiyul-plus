'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/lib/trip/TripContext';
import { tripLabel } from '@/lib/trip/label';
import TripChip from '@/components/TripChip';

// כניסה אחת לטיול: /chat הוא גם השיחה וגם התוכנית (תצוגה מאוחדת) -
// אין יותר טאב צ׳אט נפרד מול טאב מתכנן.
const NAV_LINKS = [
  { href: '/countries', label: 'יעדים' },
  { href: '/chat', label: 'תכנון טיול' },
  { href: '/kosher', label: 'כשרות' },
];

// מ-md+: כמה טאבי טיול מוצגים ישירות בשורה לפני שהשאר מתקפלים ל"עוד"
const INLINE_TRIP_TABS = 2;

/**
 * ניווט האתר: מ-md ומעלה קישורים בשורה + TripChip + טאבי הטיולים
 * הפתוחים (עד INLINE_TRIP_TABS ישירות, השאר מתקפל ל"עוד" נפתח); מתחת
 * ל-md המבורגר שפותח תפריט נפתח (כולל רשימת כל הטיולים ואת הקישורים).
 * נסגר בלחיצה על קישור/טאב ובהקשה מחוץ לתפריט. בלי ספריית תפריטים -
 * state + טוקנים בלבד.
 */
export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [tripsMenuOpen, setTripsMenuOpen] = useState(false);
  const { trips, currentTrip, currentId, hydrated, setCurrentId } = useTrip();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open && !tripsMenuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setTripsMenuOpen(false);
      }
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [open, tripsMenuOpen]);

  const stops = currentTrip?.days.reduce((n, d) => n + d.placeIds.length, 0) ?? 0;

  /** פותח טיול קיים כטאב פעיל: אם כבר ב-/chat זה קורה מיידית, אחרת מנווטים עם ?trip= */
  const openTrip = (id: string) => {
    setCurrentId(id);
    router.push(`/chat?trip=${id}`);
    setOpen(false);
    setTripsMenuOpen(false);
  };

  const inlineTrips = hydrated ? trips.slice(0, INLINE_TRIP_TABS) : [];
  const overflowTrips = hydrated ? trips.slice(INLINE_TRIP_TABS) : [];

  return (
    <div ref={rootRef} className="relative">
      {/* md+: קישורים בשורה + טאבי הטיולים הפתוחים */}
      <nav className="hidden items-center gap-2 md:flex">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium text-night/70 transition hover:bg-night/5 hover:text-night"
          >
            {l.label}
          </Link>
        ))}
        {inlineTrips.map((t) => (
          <button
            key={t.id}
            onClick={() => openTrip(t.id)}
            title={t.name}
            className={`max-w-24 truncate rounded-full px-3 py-1.5 text-xs font-bold transition ${
              t.id === currentId
                ? 'bg-sunset text-cream'
                : 'bg-night/5 text-night/60 hover:bg-night/10 hover:text-night'
            }`}
          >
            {tripLabel(t)}
          </button>
        ))}
        {overflowTrips.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setTripsMenuOpen((v) => !v)}
              aria-expanded={tripsMenuOpen}
              className="rounded-full bg-night/5 px-3 py-1.5 text-xs font-bold text-night/60 transition hover:bg-night/10 hover:text-night"
            >
              עוד ({overflowTrips.length})
            </button>
            {tripsMenuOpen && (
              <div className="absolute end-0 top-full z-50 mt-2 w-48 rounded-2xl bg-shell p-2 shadow-[var(--shadow-pop)] ring-1 ring-night/10">
                {overflowTrips.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTrip(t.id)}
                    className={`block w-full truncate rounded-xl px-3.5 py-2 text-start text-sm font-semibold transition ${
                      t.id === currentId
                        ? 'bg-sunset/10 text-sunset-deep'
                        : 'text-night/80 hover:bg-night/5'
                    }`}
                  >
                    {tripLabel(t)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <TripChip />
      </nav>

      {/* מתחת ל-md: המבורגר */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="תפריט"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-night/70 transition hover:bg-night/5 md:hidden"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-60 rounded-2xl bg-shell p-2 shadow-[var(--shadow-pop)] ring-1 ring-night/10 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-2.5 font-medium text-night/80 transition hover:bg-night/5"
            >
              {l.label}
            </Link>
          ))}
          {hydrated && currentTrip && (
            <button
              onClick={() => openTrip(currentTrip.id)}
              className="mt-1 block w-full truncate rounded-xl bg-sunset/10 px-4 py-2.5 text-start font-bold text-sunset-deep transition hover:bg-sunset/15"
            >
              {currentTrip.name} · {stops} עצירות
            </button>
          )}
          {hydrated && trips.length > 0 && (
            <>
              <div className="mt-2 border-t border-night/10 px-4 pb-1 pt-2 text-xs font-bold text-night/40">
                הטיולים שלי
              </div>
              {trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTrip(t.id)}
                  className={`block w-full truncate rounded-xl px-4 py-2.5 text-start font-medium transition ${
                    t.id === currentId
                      ? 'bg-sunset/10 text-sunset-deep'
                      : 'text-night/80 hover:bg-night/5'
                  }`}
                >
                  {tripLabel(t)}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
