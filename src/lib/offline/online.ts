'use client';

import { useEffect, useState } from 'react';

/**
 * Whether there is a network connection.
 *
 * `navigator.onLine` is **a signal and not proof**: the browser reports true even when
 * connected to WiFi with no internet at all. For this feature that is fine, because what
 * it drives is showing a state and disabling controls - not a destructive decision. The
 * direction that matters is accurate: `false` almost always means there genuinely is no
 * network, and that is the moment the user is standing in the street and needs to see the
 * itinerary.
 *
 * Always starts at `true`: the server does not know, and initialising from `navigator`
 * would create a hydration mismatch - the same trap already documented here in PromptChips.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    // A backstop: mobile devices do not always fire the events after waking from sleep,
    // and checking on every return to the screen brings the state back to the truth
    // without a refresh.
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return online;
}

/** Uniform wording for every control disabled because there is no network (title + aria-label) */
export const OFFLINE_HINT = 'אין חיבור לאינטרנט - הפעולה הזאת דורשת חיבור';

/**
 * A timestamp (ms) -> a **local** `YYYY-MM-DD`, to feed `formatHebrewDate`. It is built
 * from the local fields and not from `toISOString`, which is UTC: a traveller west of
 * Greenwich would have seen their content dated a day earlier - exactly the trap already
 * documented in `dates.ts`.
 */
export function isoDay(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
