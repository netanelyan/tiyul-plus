'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTrip } from '@/lib/trip/TripContext';
import TripChip from '@/components/TripChip';

const NAV_LINKS = [
  { href: '/countries', label: 'יעדים' },
  { href: '/planner', label: 'מתכנן מסלולים' },
  { href: '/chat', label: 'צ׳אט טיולים' },
];

/**
 * ניווט האתר: מ-md ומעלה קישורים בשורה + TripChip; מתחת ל-md המבורגר
 * שפותח תפריט נפתח (כולל הטיול הנוכחי אם קיים). נסגר בלחיצה על קישור
 * ובהקשה מחוץ לתפריט. בלי ספריית תפריטים - state + טוקנים בלבד.
 */
export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const { currentTrip, hydrated } = useTrip();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [open]);

  const stops = currentTrip?.days.reduce((n, d) => n + d.placeIds.length, 0) ?? 0;

  return (
    <div ref={rootRef} className="relative">
      {/* md+: קישורים בשורה */}
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
            <Link
              href="/planner"
              onClick={() => setOpen(false)}
              className="mt-1 block truncate rounded-xl bg-sunset/10 px-4 py-2.5 font-bold text-sunset-deep transition hover:bg-sunset/15"
            >
              {currentTrip.name} · {stops} עצירות
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
