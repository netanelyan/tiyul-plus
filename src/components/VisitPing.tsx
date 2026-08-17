'use client';

import { useEffect } from 'react';
import { pingVisit } from '@/lib/events';

/**
 * The return-visit counter - an invisible component sitting in the layout,
 * like `AccountSync`. All the logic (when a visit counts as "returning",
 * once-a-day dedup, veteran browsers from before the feature) lives in
 * `lib/events.ts#pingVisit` so there is one place to read the rules.
 *
 * StrictMode runs effects twice in development - `pingVisit` is idempotent
 * within the same day (the first run records counted=today, the second one
 * sees it and stays silent), so there is no double counting there either.
 */
export default function VisitPing() {
  useEffect(() => {
    pingVisit();
  }, []);
  return null;
}
