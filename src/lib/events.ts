import { clientIdHeader, hasClientId } from '@/lib/clientId';

/**
 * Reporting an action that happens in the browser only (print, share,
 * navigation - and now also the growth events: trip created, shared link
 * opened, return visit).
 *
 * **A counter, not tracking.** Only the action kind is sent - no trip id, no
 * content and no account. The server counts a day and a number, and that is all
 * that is stored. No cookies, no third party, and no identifier leaves the
 * browser beyond what is already sent anyway.
 *
 * Never fails and never delays: if the request drops, the print happens anyway.
 */
/**
 * `pdf` exists in the schema and is not sent today: print and PDF are the same
 * button and the same browser dialog, and the page cannot tell what was chosen
 * in it. Better a field that never arrives than a number that looks real and
 * is not.
 *
 * `newsletter` is a deliberate exception: it is counted **server-side only**
 * (the signup route knows how to tell a new address from a duplicate, and the
 * browser does not), so the /api/events route rejects it from clients -
 * otherwise it could be inflated in a loop.
 */
export type AppEvent =
  | 'print'
  | 'pdf'
  | 'whatsapp'
  | 'share'
  | 'maps'
  | 'trip_created'
  | 'shared_open'
  | 'shared_adopt'
  | 'return_visit';

/**
 * ---------- "Real events only" ----------
 *
 * An explicit requirement from Netanel: a trip he creates while testing, or an
 * admin opening somebody's share, must not inflate the counters. Two
 * mechanisms, both cheap:
 *
 * 1. **An internal-browser flag** - the moment /admin loads successfully
 *    (i.e. this browser belongs to a verified admin), a local flag is set and
 *    all events from this browser are muted from then on - including the
 *    existing export counters. Someone testing the site is not a visitor.
 * 2. **localhost is always muted** - local development against a real env does
 *    not dirty the production counters.
 *
 * The honest limit: the flag is per browser. An admin in an incognito window
 * (or on a device that never opened /admin) is counted like any visitor. That
 * is still far better than nothing, and whoever tests deliberately knows to
 * open /admin first.
 */
const INTERNAL_KEY = 'tiyul-plus:internal';

/** Called from AdminClient after /api/admin/me confirmed this is a real admin */
export function markInternalBrowser(): void {
  try {
    localStorage.setItem(INTERNAL_KEY, '1');
  } catch {
    /* storage blocked - no flag, the admin gets counted; better than crashing */
  }
}

function suppressed(): boolean {
  try {
    if (localStorage.getItem(INTERNAL_KEY) === '1') return true;
  } catch {
    /* storage blocked - continue to the host check */
  }
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

export function trackEvent(kind: AppEvent): void {
  if (typeof window === 'undefined') return;
  try {
    if (suppressed()) return;
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...clientIdHeader() },
      body: JSON.stringify({ kind }),
      keepalive: true, // survives a navigation/print that starts right after
    }).catch(() => {});
  } catch {
    /* a failed counter is not an event */
  }
}

/** Local date (not UTC): "a different day" in the visitor's human sense */
export function localDay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * ---------- Ownership of share links ----------
 *
 * "Opens of a shared link" should not count the owner opening their own link.
 * The share payload carries no owner id (deliberately - it is only the trip),
 * so identification happens on the creating side: when a browser generates a
 * share link, its token is stored locally, and when that same browser opens
 * /t/<token> - it is not counted. An owner opening their link from another
 * device will be counted; there is no way to know, and that is stated.
 */
const MY_SHARES_KEY = 'tiyul-plus:my-shares';
const MY_SHARES_CAP = 40;
/** The long token can be thousands of chars - a prefix suffices for comparison */
const TOKEN_PREFIX = 64;

export function rememberOwnShare(token: string): void {
  if (!token) return;
  try {
    const key = token.slice(0, TOKEN_PREFIX);
    const list = JSON.parse(localStorage.getItem(MY_SHARES_KEY) ?? '[]') as string[];
    if (!Array.isArray(list)) throw new Error('bad list');
    if (list.includes(key)) return;
    list.push(key);
    localStorage.setItem(MY_SHARES_KEY, JSON.stringify(list.slice(-MY_SHARES_CAP)));
  } catch {
    try {
      localStorage.setItem(MY_SHARES_KEY, JSON.stringify([token.slice(0, TOKEN_PREFIX)]));
    } catch {
      /* storage blocked */
    }
  }
}

export function isOwnShare(token: string): boolean {
  if (!token) return false;
  try {
    const list = JSON.parse(localStorage.getItem(MY_SHARES_KEY) ?? '[]') as string[];
    return Array.isArray(list) && list.includes(token.slice(0, TOKEN_PREFIX));
  } catch {
    return false;
  }
}

/**
 * ---------- Conversion: share → the viewer's own trip ----------
 *
 * The number Netanel explicitly asked for: how many opens of a shared link led
 * to the viewer creating a trip of their own. The mechanism: viewing a share
 * (non-owner, and in a browser that does **not** yet hold any trip - i.e. a new
 * person, which is what virality measures) drops a local marker; the next trip
 * created in this browser, within 7 days, is counted once as shared_adopt.
 * The "save it as mine" action passes through here on its own - it creates a
 * trip, and that is all the marker needs.
 */
const SHARE_REF_KEY = 'tiyul-plus:share-ref';
const SHARE_REF_MAX_DAYS = 7;

/** Called from the share page, only when the viewer is not the owner and has no trips yet */
export function markSharedVisit(): void {
  try {
    if (!localStorage.getItem(SHARE_REF_KEY)) {
      localStorage.setItem(SHARE_REF_KEY, localDay());
    }
  } catch {
    /* storage blocked - no attribution */
  }
}

/**
 * **The single entry point for counting "trip created"** - TripContext calls it
 * from every local creation path (agent, planner, quiz, import, saving a share,
 * duplication) and **not** from server pulls (applyRemoteTrips) - restoring is
 * not creating. The share attribution is checked here so there is one place and
 * not four.
 */
export function trackTripCreated(): void {
  trackEvent('trip_created');
  try {
    const day = localStorage.getItem(SHARE_REF_KEY);
    if (!day) return;
    localStorage.removeItem(SHARE_REF_KEY); // consumed once, successful or not
    const ageDays = (Date.now() - Date.parse(day)) / 86_400_000;
    if (Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= SHARE_REF_MAX_DAYS) {
      trackEvent('shared_adopt');
    }
  } catch {
    /* storage blocked */
  }
}

/**
 * ---------- Return visit ----------
 *
 * "A browser that was already here on a previous day", counted **once per day**
 * per browser. Identification is entirely local: the first visit's date is
 * stored in the browser, and only the counter (with no identifier) is sent. It
 * matters to say honestly what this number is: a sum over a range is
 * "returning-browser-days", not "unique browsers in the range" - the events
 * table is aggregate on purpose (no identities), so uniqueness over an
 * arbitrary range cannot be computed, and this is the closest measure that
 * stays faithful to privacy.
 *
 * Browsers that were here before the feature: if they already carry the
 * quotas' browser identifier (clientId) but have no visit record - they are
 * veteran browsers, and their current visit is counted as returning. This is
 * the reuse of the existing identifier Netanel asked for, without adding
 * anything new and without sending it anywhere.
 */
const VISIT_KEY = 'tiyul-plus:visit';

export function pingVisit(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = localDay();
    const raw = localStorage.getItem(VISIT_KEY);
    let rec: { first?: string; counted?: string } | null = null;
    try {
      rec = raw ? (JSON.parse(raw) as { first?: string; counted?: string }) : null;
    } catch {
      rec = null;
    }
    if (!rec?.first) {
      // No visit record. A browser already carrying a clientId was here
      // before - a veteran visit counted as returning; a clean browser starts
      // the count from today. hasClientId and not clientId() - the latter
      // creates an identifier when absent, and would have turned every new
      // browser into a "veteran".
      const veteran = hasClientId();
      localStorage.setItem(
        VISIT_KEY,
        JSON.stringify({ first: today, counted: veteran ? today : '' }),
      );
      if (veteran) trackEvent('return_visit');
      return;
    }
    if (rec.first !== today && rec.counted !== today) {
      localStorage.setItem(VISIT_KEY, JSON.stringify({ first: rec.first, counted: today }));
      trackEvent('return_visit');
    }
  } catch {
    /* storage blocked - no count, no crash */
  }
}
