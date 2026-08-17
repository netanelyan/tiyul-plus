'use client';

import { useEffect, useMemo } from 'react';
import { isoDay, useOnline } from '@/lib/offline/online';
import { loadCities } from '@/lib/trip/cityStore';
import { formatHebrewDate } from '@/lib/trip/dates';

/**
 * Two small things that must live in the layout: registering the service
 * worker, and the line telling the user where they stand.
 *
 * **The bar is a row in the page flow, not a floating element.** That is
 * both quieter (no overlap over content, no flicker) and sidesteps the
 * trap already documented here twice: `position: fixed` inside the header
 * is measured against the header because of the backdrop-blur, not against
 * the screen.
 *
 * The wording was chosen so it does not read as a site fault: no "error",
 * no red, and a positive statement - what DOES work right now.
 */
export default function OfflineNotice() {
  const online = useOnline();
  /**
   * When the oldest content on the device was saved. This **must** be on
   * screen: content saved a week ago also includes kosher info and prices,
   * and showing it without a date is exactly the worst failure this feature
   * can produce. Read only when offline, after the first render, so we
   * never touch localStorage on the server and never create a hydration
   * mismatch.
   */
  const savedAt = useMemo(() => {
    if (online || typeof window === 'undefined') return null;
    const times = Object.values(loadCities()).map((e) => e.cachedAt);
    return times.length ? Math.min(...times) : null;
  }, [online]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // In development we do not register: Turbopack's HMR and the SW fight
    // over the same requests, producing "bugs" that do not exist in production.
    if (process.env.NODE_ENV !== 'production') return;
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(async () => {
          // This load itself did not pass through the SW, so its chunks were
          // not cached. We hand it the list so that **one** visit is enough
          // for the app to open without network - otherwise two visits are
          // needed, and someone who came once and then went down into the
          // subway is left with nothing.
          const reg = await navigator.serviceWorker.ready;
          const urls = performance
            .getEntriesByType('resource')
            .map((e) => e.name)
            .filter((u) => u.startsWith(location.origin));
          // Talk to the **active** worker and not to `controller`: on the
          // first load the claim is still running, so `controller` is null
          // and the message would have silently dropped on the floor -
          // measured: one asset cached instead of 17.
          reg.active?.postMessage({ type: 'warm-assets', urls });
        })
        .catch(() => {
          // A browser that blocks SW (private browsing in some browsers) -
          // the site works exactly as before, just without offline mode.
        });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="w-full border-b border-night/10 bg-night/[0.04] px-4 py-2 text-center text-xs text-night/70"
    >
      <span className="font-semibold">אין חיבור לאינטרנט.</span>{' '}
      מוצג המסלול שנשמר במכשיר
      {savedAt !== null && ` ב־${formatHebrewDate(isoDay(savedAt), { year: true })}`} - אפשר
      לקרוא אותו, לא לערוך.
    </div>
  );
}
