'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/lib/trip/TripContext';
import { tripLabel, type CityNames } from '@/lib/trip/label';
import SiteSearch from '@/components/SiteSearch';
import AccountButton from '@/components/AccountButton';
import { daysHe } from '@/lib/duration';

// One entry point to a trip: /chat is both the conversation and the plan
// (the unified view) - there is no longer a separate chat tab vs. planner tab.
const NAV_LINKS = [
  { href: '/countries', label: 'יעדים' },
  { href: '/ask', label: 'שאל את הסוכן' },
  { href: '/chat', label: 'תכנון טיול' },
  { href: '/kosher', label: 'כשרות' },
];

/**
 * Clicking the trip-planning tab while already on /chat is a navigation to
 * the same route - Next does not re-render the page, so AgentWorkspace never
 * re-reads the params and the previous trip stays on screen even though the
 * URL was cleaned. This event tells it explicitly "the user asked for a new
 * conversation" - it listens for it and resets to the landing screen.
 */
export const NEW_CHAT_EVENT = 'tiyul:new-chat';
function notifySameRouteChat(href: string) {
  if (href === '/chat' && window.location.pathname === '/chat') {
    window.dispatchEvent(new Event(NEW_CHAT_EVENT));
  }
}

/**
 * The site nav: from md and up, links in a row + **one control** for the
 * trips; below md, a hamburger that opens a dropdown menu (including the
 * full trips list and the links). Closes on a link/tab click and on a tap
 * outside the menu. No menu library - state + tokens only.
 *
 * **Why one control and not tabs.** Previously up to two trips were shown
 * as direct pills in the row plus a "more (N)" button. Three problems, all
 * visible in a single screenshot: the active trip's pill is solid coral and
 * sits right next to the kosher tab, so it reads as a nav item; two trips
 * are constant noise in a row that is supposed to be the site links; and
 * `max-w-24 truncate` chopped names (a two-city Hebrew name got cut off
 * mid-word). Now: one entry that says how many trips there are, and a full
 * list with no truncation. The exact same actions, less noise.
 */
export default function SiteNav({ cityNames }: { cityNames: CityNames }) {
  const [open, setOpen] = useState(false);
  const [tripsMenuOpen, setTripsMenuOpen] = useState(false);
  const { trips, currentId, hydrated, setCurrentId } = useTrip();
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

  /** Opens an existing trip as the active tab: if already on /chat it happens immediately, otherwise navigate with ?trip= */
  const openTrip = (id: string) => {
    setCurrentId(id);
    router.push(`/chat?trip=${id}`);
    setOpen(false);
    setTripsMenuOpen(false);
  };

  const myTrips = hydrated ? trips : [];

  return (
    <div ref={rootRef} className="relative">
      {/* md+: links in a row + the open trips' tabs */}
      <nav className="hidden items-center gap-2 md:flex">
        <SiteSearch />
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => notifySameRouteChat(l.href)}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium text-night/70 transition hover:bg-night/5 hover:text-night"
          >
            {l.label}
          </Link>
        ))}
        {myTrips.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setTripsMenuOpen((v) => !v)}
              aria-expanded={tripsMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-night/70 transition hover:bg-night/5 hover:text-night"
            >
              הטיולים שלי
              <span className="rounded-full bg-night/10 px-1.5 text-xs font-bold text-night/60">
                {myTrips.length}
              </span>
              <span aria-hidden className="text-xs text-night/40">
                ▾
              </span>
            </button>
            {tripsMenuOpen && (
              <div
                role="menu"
                className="absolute end-0 top-full z-50 mt-2 w-60 rounded-2xl bg-shell p-2 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
              >
                {myTrips.map((t) => (
                  <button
                    key={t.id}
                    role="menuitem"
                    onClick={() => openTrip(t.id)}
                    className={`block w-full rounded-xl px-3.5 py-2 text-start transition ${
                      t.id === currentId
                        ? 'bg-sunset/10 text-sunset-deep'
                        : 'text-night/80 hover:bg-night/5'
                    }`}
                  >
                    {/* The full name, no truncation - a long one wraps to two lines */}
                    <span className="block text-sm font-semibold leading-snug">{tripLabel(t, cityNames)}</span>
                    <span className="block text-xs font-medium text-night/40">
                      {t.id === currentId ? 'פתוח עכשיו' : daysHe(t.days.length)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <AccountButton />
      </nav>

      {/* Below md: the account button and the hamburger sit in the same row, adjacent */}
      <div className="flex items-center gap-1.5 md:hidden">
      <AccountButton />
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="תפריט"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-night/70 transition hover:bg-night/5"
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
      </div>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-60 rounded-2xl bg-shell p-2 shadow-[var(--shadow-pop)] ring-1 ring-night/10 md:hidden">
          <SiteSearch variant="menu-row" onNavigate={() => setOpen(false)} />
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => {
                setOpen(false);
                notifySameRouteChat(l.href);
              }}
              className="block rounded-xl px-4 py-2.5 font-medium text-night/80 transition hover:bg-night/5"
            >
              {l.label}
            </Link>
          ))}
          {hydrated && trips.length > 0 && (
            <>
              <div className="mt-2 border-t border-night/10 px-4 pb-1 pt-2 text-xs font-bold text-night/40">
                הטיולים שלי
              </div>
              {trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTrip(t.id)}
                  className={`block w-full rounded-xl px-4 py-2.5 text-start transition ${
                    t.id === currentId
                      ? 'bg-sunset/10 text-sunset-deep'
                      : 'text-night/80 hover:bg-night/5'
                  }`}
                >
                  {/* No truncate: a long name wraps to two lines instead of being cut */}
                  <span className="block font-semibold leading-snug">{tripLabel(t, cityNames)}</span>
                  <span className="block text-xs font-medium text-night/40">
                    {t.id === currentId ? 'פתוח עכשיו' : daysHe(t.days.length)}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
