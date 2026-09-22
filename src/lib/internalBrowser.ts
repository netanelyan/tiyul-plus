/**
 * "Is this one of our own browsers?" - asked by both counters on the site.
 *
 * It lived inside `events.ts` until analytics needed the same answer. Leaving
 * it there would have made `events.ts` and `analytics.ts` import each other,
 * and a cycle between two modules that both run at module scope in the browser
 * is the kind of thing that works until a bundler reorders it.
 *
 * The rule itself is Netanel's, and it is the difference between a first month
 * of real data and a first month of himself: a browser that has successfully
 * opened `/admin` is marked internal forever, and localhost never counts.
 *
 * The honest limit, unchanged: the flag is per browser. An admin in a private
 * window, or on a device that has never opened `/admin`, is counted like any
 * visitor.
 */
export const INTERNAL_KEY = 'tiyul-plus:internal';

/** Called from AdminClient once /api/admin/me has confirmed a real admin. */
export function markInternalBrowser(): void {
  try {
    localStorage.setItem(INTERNAL_KEY, '1');
  } catch {
    /* storage blocked - nothing to mark, and nothing breaks */
  }
}

/** True when nothing from this browser should be counted anywhere. */
export function suppressed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (localStorage.getItem(INTERNAL_KEY) === '1') return true;
  } catch {
    /* storage blocked - continue to the host check */
  }
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}
