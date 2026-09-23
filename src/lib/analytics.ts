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
 * It is also what makes the delayed ask affordable - see
 * `ASK_AFTER_VISIBLE_MS`: a visitor who leaves in ten seconds is never asked
 * anything and is still counted.
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
 * Turns a plain list into a real `arguments` object.
 *
 * Not a stylistic detail - it is the whole reason `push` works. `arguments`
 * exists in any non-arrow function, including one declared with a rest
 * parameter, and it is the only way to build the value gtag.js accepts.
 */
function asArguments(
  // Declared to type the call site, and deliberately unread: the values come
  // back out through `arguments`, which is the only object gtag.js accepts.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ...args: unknown[]
): IArguments {
  // eslint-disable-next-line prefer-rest-params
  return arguments;
}

/**
 * Pushes onto `dataLayer` directly rather than calling `window.gtag`.
 *
 * The two are equivalent once gtag.js has loaded, and before it loads only
 * this one works - which matters, because the consent default has to be
 * queued *before* the script arrives or the first ping goes out under the
 * wrong state.
 *
 * ## It must push an `arguments` object, never an Array
 *
 * This looked like a formatting preference and it was the difference between
 * a working property and an empty one. A real Array pushed onto `dataLayer` is
 * **silently ignored** by gtag.js - no error, no warning, the entry simply
 * sits in the array unread. Only the `arguments` object that Google's own
 * snippet pushes is processed.
 *
 * Measured on production rather than reasoned about, by pushing both forms
 * into the live property and counting `g/collect` requests: the Array form
 * produced **0 hits and no `_ga` cookie**, the `arguments` form produced a hit
 * and the cookie, in the same page, seconds apart.
 *
 * The version that shipped first pushed Arrays, so **every page view and every
 * tracked event on this site went nowhere**, including the cookieless pings
 * the whole consent design depends on. The failure mode is the worst
 * available: a correctly-installed tag, a green "tag detected", a clean
 * console, and a property reporting no traffic - which reads as "nobody is
 * visiting" rather than as a defect.
 */
function push(...args: GtagArgs): void {
  const win = w();
  if (!win) return;
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push(asArguments(...args));
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

/* ------------------------------------------------------------------ *
 * When to ask
 * ------------------------------------------------------------------ */

/**
 * How much time a visitor has to actually spend here before the banner appears.
 *
 * Netanel: *"asking about cookies immediately makes the website look not nice -
 * you have to set a delay, or even not ask at all if that's the cost."*
 *
 * He is right about the cost and wrong about the trade, and the reason is a
 * property of the setup rather than an opinion: **consent is denied by default
 * and GA still sends a cookieless ping**, so page views, events, traffic
 * sources, devices and countries are already counted for somebody who never
 * answers. The ask buys exactly one thing on top of that - a `_ga` cookie, and
 * therefore returning visitors and anything that spans more than one session.
 *
 * For a trip planner that is not a nice-to-have: "do people come back to the
 * trip they built" is close to the most important question the product has. So
 * the banner stays, and what changes is *when* - which is what was actually
 * making the site look bad.
 *
 * ## 45 seconds of visible time, and what that rules out
 *
 * - **It is never part of a first impression.** The homepage hero, the agent's
 *   landing screen and every destination page are seen clean.
 * - **A visitor who bounces is never asked at all.** That is most first
 *   arrivals, and every one of them is a first impression we no longer spend
 *   on a consent box.
 * - **Somebody who is actually planning a trip still gets asked**, once,
 *   quietly, at the bottom corner, when they have already decided to stay.
 *
 * Time is accumulated **only while the tab is visible**, so a tab left open in
 * the background overnight is not "engagement", and it carries across pages in
 * `sessionStorage` - a visitor who reads four destination pages for fifteen
 * seconds each is engaged, and a rule that only looked at one page would never
 * notice.
 *
 * Nothing polls: the clock is one `setTimeout` armed for the remaining time and
 * cleared when the tab is hidden. A measurement feature that runs an interval
 * forever to decide when to ask about measurement would be its own punchline.
 */
export const ASK_AFTER_VISIBLE_MS = 45_000;

const ENGAGED_KEY = 'tiyul-plus:site-engaged-ms';

/**
 * How long is left before the banner is due, given the time already banked.
 * Pure, and the only arithmetic the clock does - so a test can pin the rule
 * without a browser, a timer or a renderer.
 */
export function msUntilAsk(visibleMs: number): number {
  if (!Number.isFinite(visibleMs) || visibleMs < 0) return ASK_AFTER_VISIBLE_MS;
  return Math.max(0, ASK_AFTER_VISIBLE_MS - visibleMs);
}

const askListeners = new Set<() => void>();

let visibleMs = 0;
let visibleSince: number | null = null;
let askTimer: ReturnType<typeof setTimeout> | null = null;
let askReady = false;
let clockRunning = false;

function persistEngaged(): void {
  try {
    sessionStorage.setItem(ENGAGED_KEY, String(Math.round(visibleMs)));
  } catch {
    /* storage blocked - the clock still works, it just restarts on a reload */
  }
}

/** Banks the stretch of visible time that is currently open, if any. */
function bankVisible(): void {
  if (visibleSince !== null) {
    visibleMs += Date.now() - visibleSince;
    visibleSince = null;
  }
  persistEngaged();
}

function armAskTimer(): void {
  if (askReady || askTimer !== null) return;
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  visibleSince = Date.now();
  askTimer = setTimeout(() => {
    askTimer = null;
    bankVisible();
    askReady = true;
    askListeners.forEach((fn) => fn());
  }, msUntilAsk(visibleMs));
}

function disarmAskTimer(): void {
  if (askTimer !== null) {
    clearTimeout(askTimer);
    askTimer = null;
  }
  bankVisible();
}

/**
 * Starts the engagement clock. Idempotent, and a no-op for anyone who has
 * already answered - there is nothing to time if there is nothing to ask.
 */
export function startAskClock(): void {
  if (clockRunning || typeof window === 'undefined') return;
  if (storedConsent() !== null) return;
  clockRunning = true;

  const stored = Number(
    (() => {
      try {
        return sessionStorage.getItem(ENGAGED_KEY);
      } catch {
        return null;
      }
    })() ?? 0,
  );
  visibleMs = Number.isFinite(stored) && stored > 0 ? stored : 0;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') armAskTimer();
    else disarmAskTimer();
  });
  // `pagehide` rather than `unload`: it is the one that fires on iOS and when a
  // page enters the back/forward cache, which is where `unload` silently does
  // nothing and the session's accumulated time would be lost.
  window.addEventListener('pagehide', disarmAskTimer);

  armAskTimer();
}

export function subscribeAsk(fn: () => void): () => void {
  askListeners.add(fn);
  startAskClock();
  return () => askListeners.delete(fn);
}

/** Has the visitor stayed long enough to be worth asking? */
export function askClockReady(): boolean {
  return askReady;
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
