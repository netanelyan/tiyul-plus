'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  askClockReady,
  gaId,
  setConsent,
  storedConsent,
  subscribeAsk,
  subscribeConsent,
} from '@/lib/analytics';

/**
 * The consent banner.
 *
 * ## It does not appear on arrival
 *
 * Netanel, on the first version: *"asking about cookies immediately makes the
 * website look not nice."* It waits for 45 seconds of visible time now - see
 * `ASK_AFTER_VISIBLE_MS` in `lib/analytics.ts` for why that number and why the
 * ask survived at all rather than being dropped. The short version is that
 * consent is denied by default and GA still counts the visit, so a visitor who
 * never stays long enough to be asked costs almost nothing to measure.
 *
 * ## It is a banner, not a wall
 *
 * No overlay, no blocked scroll, no focus trap. The site is fully usable
 * behind it and every control stays reachable. That is a deliberate choice
 * about what this is: analytics, on a site that sells nothing to the visitor
 * at that moment. A modal that holds the page hostage to measure it has the
 * priorities backwards, and it is the single most common way a consent banner
 * makes a site worse.
 *
 * Declining is one click, in a button of the same size as accepting. A
 * "reject" hidden behind "manage preferences" is a dark pattern, and this site
 * publishes an accessibility statement.
 *
 * ## Where it sits, and what it must not cover
 *
 * Bottom corner from `sm`, and lifted clear of the accessibility button on a
 * phone - see the measured note on the className. That button **must never be
 * covered**: it is the control somebody may need in order to read the banner.
 *
 * `z-[70]` so the trip screen's own chat bar (`z-[60]`) cannot hide it - a
 * banner you cannot see is a consent you never gave.
 *
 * ## It renders nothing until it knows
 *
 * `null` on the server and on the first client render, because `localStorage`
 * is not readable during SSR. Rendering optimistically and then hiding it
 * would flash a banner at somebody who answered months ago, and would be a
 * layout shift on every single page load.
 */
export default function CookieConsent() {
  /*
    `useSyncExternalStore` rather than an effect that calls setState.
    localStorage cannot be read while rendering on the server, and the obvious
    shape - read it in an effect, then setState - is a cascading render that
    this repo's lint config rejects by name. The server snapshot is `'unknown'`
    so the first client render matches the HTML exactly and nothing flashes.
  */
  const consent = useSyncExternalStore(
    subscribeConsent,
    () => storedConsent(),
    () => 'unknown' as const,
  );
  /*
    The engagement clock, read the same way. Subscribing is what starts it, so
    the timer only exists on a page that could actually show the banner, and
    `startAskClock` returns immediately for anyone who already answered.
    Server and first-paint snapshot is `false`, which is also the honest
    starting value - nobody has been here 45 seconds yet.
  */
  const askable = useSyncExternalStore(
    subscribeAsk,
    () => askClockReady(),
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);

  const choose = useCallback((choice: 'granted' | 'denied') => {
    setConsent(choice);
    setDismissed(true);
  }, []);

  // No measurement id means there is nothing to consent to, and no banner.
  if (!gaId()) return null;
  // 'unknown' is the server/first-paint value - render nothing until the real
  // answer is known, or a visitor who chose months ago gets a flash of banner.
  if (consent === 'unknown' || consent !== null || dismissed) return null;
  // The delay. Nothing on arrival, nothing for a visitor who is passing through.
  if (!askable) return null;

  return (
    <div
      role="region"
      aria-label="בקשה למדידת שימוש באתר"
      /*
        The mobile offset is measured, not guessed. At 390px this banner is
        full width, and the accessibility button sits bottom-start at 44x44
        with a 16px margin - so a bar pinned to `bottom-0` lands exactly on top
        of it. That was caught in a browser, not by reading the markup.

        Covering the accessibility button is the one thing this must never do:
        it is the control somebody may need in order to read the banner in the
        first place. So on a phone the banner sits 4.75rem up, which clears the
        button and its margin, and returns to the corner from `sm` where there
        is room for both side by side.

        It may still overlap the trip screen's own chat bar for one tap. That
        is accepted - the banner disappears on the first click, and the chat
        bar is not an accessibility control.
      */
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] z-[70] w-full px-3 sm:bottom-4 sm:end-4 sm:w-auto sm:max-w-md sm:px-0 print:hidden"
    >
      {/*
        It arrives mid-session now rather than with the page, so it slides up
        instead of appearing. `rise-in` is the site's existing entrance and is
        already switched off under `prefers-reduced-motion`. It sits on the
        inner card rather than the fixed wrapper on purpose: `rise-in` keeps its
        final transform forever, and a transform makes an element a containing
        block for any `position: fixed` descendant - the trap this codebase has
        hit twice. Nothing inside here is fixed, and keeping it off the wrapper
        means it never can be.
      */}
      <div className="rise-in rounded-2xl bg-shell p-4 shadow-pop ring-1 ring-night/10">
        <p className="text-sm font-bold text-night">עוזרים לנו להשתפר? 🙂</p>
        <p className="mt-1 text-sm leading-relaxed text-night/80">
          אנחנו מסתכלים אילו חלקים באתר באמת עוזרים למטיילים, ומשפרים לפי זה - בלי שם
          ובלי מייל.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choose('granted')}
            className="min-h-[44px] flex-1 rounded-xl bg-sunset px-5 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep sm:flex-none"
          >
            בשמחה
          </button>
          {/*
            Same size, same prominence. A decline that is harder to find than
            an accept is not a choice.
          */}
          <button
            type="button"
            onClick={() => choose('denied')}
            className="min-h-[44px] flex-1 rounded-xl bg-night/5 px-5 py-2.5 text-sm font-bold text-night ring-1 ring-night/10 transition hover:bg-night/10 sm:flex-none"
          >
            לא עכשיו
          </button>
        </div>
        {/*
          The vendor name and the reassurance live in the fine print rather
          than the opening line. Netanel: the first version "looks too roboty,
          too scary" - and it was, because it led with "Google Analytics" and
          with what we do NOT do (no advertising, no selling data), which
          raises the very ideas it is denying. Three negations in a row does
          the same thing, so the body keeps one. Informed consent still needs
          the vendor named and the detail one click away; it does not need
          them first.
        */}
        <p className="mt-2 text-xs text-night/65">
          אפשר גם לא - האתר יעבוד בדיוק אותו דבר. נמדד עם Google Analytics ·{' '}
          <Link
            href="/cookies"
            className="font-semibold underline decoration-night/20 underline-offset-4 transition hover:text-night"
          >
            מה זה אומר
          </Link>
        </p>
      </div>
    </div>
  );
}
