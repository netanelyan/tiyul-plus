/**
 * Google Analytics 4, behind Consent Mode v2.
 *
 * Netanel asked for as much information as possible. GA4 is that answer, and
 * it is also the first thing on this site that stores a cookie on an ordinary
 * visitor's device - so it arrives with the machinery that makes that
 * defensible rather than as a script tag.
 *
 * ## The two states, and why the site reports in both
 *
 * **Before a choice is made, consent is `denied`.** GA still loads, and still
 * sends what Google calls a cookieless ping: no cookie is written, no
 * identifier persists, and the visit is counted in aggregate only. That is why
 * the numbers are not zero for somebody who never answers the banner.
 *
 * **On "accept", consent becomes `granted`** and GA starts behaving like GA -
 * `_ga` cookies, returning visitors, sessions, attribution, the lot.
 *
 * This is Google's own recommended shape rather than something invented here,
 * and it is the only one that gives a real number while a banner is on screen.
 *
 * ## What is deliberately switched off even when consent is granted
 *
 * - `ad_storage`, `ad_user_data` and `ad_personalization` stay **denied
 *   permanently**. We do not advertise and we do not sell audiences, so there
 *   is no reason for this data to reach Google's advertising side, and saying
 *   so is worth more than the option.
 * - `anonymize_ip` is on. GA4 truncates anyway; setting it makes the intent
 *   explicit and survives a future default change.
 *
 * ## The choice lives in localStorage, not a cookie
 *
 * Deliberately. Storing "this person declined cookies" in a cookie is the
 * joke that writes itself, and it also means a visitor who declines leaves
 * this site with **nothing** written by us except a local preference they can
 * clear from `/cookies`.
 *
 * ## Netanel's own browsing does not count
 *
 * `suppressed()` from `internalBrowser.ts` is reused rather than reinvented: a browser
 * that has opened `/admin`, and anything on localhost, reports nothing at all.
 * A founder testing his own site is not a visitor, and without this the first
 * month of data is mostly him.
 */
import { suppressed } from '@/lib/internalBrowser';

export const CONSENT_KEY = 'tiyul-plus:analytics-consent';

export type ConsentChoice = 'granted' | 'denied';

/**
 * The live property, committed rather than left to configuration.
 *
 * A GA4 measurement id is **public by design** - it is in the page source of
 * every site on the internet that uses GA, and it grants nothing: it is a
 * destination to send to, not a credential. So this is not a secret sitting in
 * a repo, it is an address.
 *
 * It is committed because the alternative failed in exactly the way that is
 * easy to miss: `NEXT_PUBLIC_` values are compiled in at build time, so the
 * variable has to be set in Vercel **and** the site redeployed. Until both
 * happen the tag simply is not on the page, GA reports "no data received",
 * and there is nothing on the site to look at that explains why.
 *
 * `NEXT_PUBLIC_GA_ID` still wins when it is set, so a different property (or
 * none) can be used without touching code.
 */
const PRODUCTION_GA_ID = 'G-MR48GYKQ3R';

export const gaId = (): string | undefined => process.env.NEXT_PUBLIC_GA_ID || PRODUCTION_GA_ID;

/**
 * Hosts that are allowed to report into the committed property.
 *
 * Without this, every preview deployment and every `npm run dev` would file
 * its traffic alongside the real thing - and preview traffic is a developer
 * clicking through a half-finished feature, which is precisely the noise that
 * makes an analytics property untrustworthy.
 *
 * An explicitly-set `NEXT_PUBLIC_GA_ID` bypasses the check: somebody who
 * configured a property on purpose meant it.
 */
const REPORTING_HOSTS = new Set(['tiyulplus.com', 'www.tiyulplus.com']);

function reportingHostAllowed(): boolean {
  if (process.env.NEXT_PUBLIC_GA_ID) return true;
  if (typeof window === 'undefined') return false;
  return REPORTING_HOSTS.has(window.location.hostname);
}

type GtagArgs = [string, ...unknown[]];
interface GtagWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: GtagArgs) => void;
}

function w(): GtagWindow | null {
  return typeof window === 'undefined' ? null : (window as GtagWindow);
}

/**
 * Pushes onto `dataLayer` directly rather than calling `window.gtag`.
 *
 * The two are equivalent once gtag.js has loaded, and before it loads only
 * this one works - which matters, because the consent default has to be
 * queued *before* the script arrives or the first ping goes out under the
 * wrong state. `arguments`-style push is what Google's own snippet does.
 */
function push(...args: GtagArgs): void {
  const win = w();
  if (!win) return;
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push(args);
}

/**
 * A one-line subscription so the banner and `/cookies` can read the stored
 * choice with `useSyncExternalStore` instead of setting state inside an
 * effect. Reading `localStorage` needs the client, so the naive shape is an
 * effect that calls `setState` - which is a cascading render and which this
 * repo's lint config rejects by name.
 */
const listeners = new Set<() => void>();

export function subscribeConsent(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

/** What the visitor last chose, or null if they have not been asked yet. */
export function storedConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    // Storage blocked (private mode, a locked-down browser). Treat it as
    // "not asked" rather than as consent - the safe direction.
    return null;
  }
}

/**
 * Queues the consent defaults. Must run before gtag.js loads, which is why the
 * loader calls it and not the other way round.
 */
export function initConsent(): void {
  const choice = storedConsent();
  push('consent', 'default', {
    analytics_storage: choice === 'granted' ? 'granted' : 'denied',
    // Never granted, in either state - we do not advertise.
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });
}

/** Records and applies a choice. Called by the banner and by /cookies. */
export function setConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* a browser that cannot remember it will simply ask again */
  }
  notify();
  push('consent', 'update', { analytics_storage: choice });
  if (choice === 'granted') {
    // The pageview that was already counted cookielessly is now re-sent with
    // storage available, so the session is attributed rather than orphaned.
    pageview(typeof window === 'undefined' ? '/' : window.location.pathname + window.location.search);
  }
}

/**
 * Forgets the choice entirely, so the banner asks again. `/cookies` offers
 * this: a consent you cannot withdraw is not a consent.
 */
export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* nothing to clear */
  }
  notify();
  push('consent', 'update', { analytics_storage: 'denied' });
}

export function analyticsActive(): boolean {
  if (!gaId()) return false;
  if (typeof window === 'undefined') return false;
  if (!reportingHostAllowed()) return false;
  return !suppressed();
}

/** A manual page_view. The loader disables the automatic one - see Analytics.tsx. */
export function pageview(path: string): void {
  const id = gaId();
  if (!id || !analyticsActive()) return;
  push('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
    send_to: id,
  });
}

/**
 * The events worth having, named once.
 *
 * A closed union rather than free strings: GA4's reports are only as good as
 * the consistency of the names, and "trip_created" vs "tripCreated" vs
 * "create_trip" in three components produces three useless charts. It is also
 * the list to read when asking "what can I actually find out".
 */
export type AnalyticsEvent =
  // the funnel
  | 'trip_created'
  | 'trip_day_added'
  | 'trip_place_added'
  | 'chat_message_sent'
  | 'planner_generate'
  | 'quiz_completed'
  // sharing - the viral loop
  | 'share_link_created'
  | 'share_whatsapp'
  | 'shared_trip_opened'
  | 'shared_trip_adopted'
  | 'group_invite_created'
  | 'group_joined'
  // money
  | 'checkout_started'
  | 'purchase_completed'
  | 'premium_page_viewed'
  | 'affiliate_click'
  // account
  | 'login_started'
  | 'login_completed'
  // exports
  | 'print'
  | 'maps_opened'
  // discovery
  | 'search_used'
  | 'destination_viewed'
  | 'agent_enquiry_sent'
  | 'return_visit'
  // performance, from real devices on real networks
  | 'web_vitals';

/**
 * Sends an event. Silent when there is no id, when consent machinery has not
 * loaded, or when this browser is internal.
 *
 * **No free-text parameter carries user content.** Everything passed here is a
 * slug, a count or an enum, because a GA4 report is a place other people can
 * be given access to, and a trip name is the traveller's own writing.
 */
export function track(event: AnalyticsEvent, params: Record<string, string | number | boolean> = {}): void {
  if (!analyticsActive()) return;
  push('event', event, { ...params, send_to: gaId() });
}
