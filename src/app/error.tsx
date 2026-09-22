'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { referenceCode, reportClientError, shouldReport } from '@/lib/reportClientError';

/**
 * What the visitor sees when something breaks.
 *
 * Until this file existed the answer was Next's own screen: a black-on-white
 * English line reading "Application error: a client-side exception has
 * occurred". On a Hebrew RTL travel site that reads as a site that is gone,
 * and the most likely reaction to it is to assume the trip went with it.
 *
 * ## The reassurance is the content, not decoration
 *
 * A trip lives in `localStorage` (and in the account, when there is one) -
 * **a render that throws cannot touch either.** So the page says so, in as
 * many words. Somebody who has spent forty minutes planning needs to know
 * that before they need anything else, and it is the one fact that decides
 * whether they press "try again" or close the tab for good.
 *
 * ## Try again first, home second
 *
 * `reset()` re-renders the segment without a full reload, which genuinely
 * recovers a transient failure (a fetch that failed, a race on mount) while
 * keeping the page's state. It is the primary action for that reason. The
 * homepage is the escape hatch below it, and deliberately not a reload of the
 * same broken URL.
 *
 * ## The reference code
 *
 * `digest` is Next's own hash of the error, and it is in the server log next
 * to the stack trace - so a visitor reading it out to support turns "the site
 * broke" into one searchable string. It is shown small and selectable, and it
 * is the same code that rides on the alert.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reported = useRef(false);
  const [code] = useState(() => referenceCode(error.digest));

  useEffect(() => {
    // Once per failure. In development React mounts effects twice, and a
    // guard here is cheaper than a duplicate-looking alert in the channel.
    if (reported.current) return;
    reported.current = true;
    console.error('[error-boundary]', error);
    // A server error already alerted from instrumentation.ts, with the real
    // exception rather than React's production placeholder. See shouldReport.
    if (!shouldReport(error)) return;
    reportClientError({
      kind: 'client',
      message: error.message || 'unknown render error',
      path: typeof window === 'undefined' ? undefined : window.location.pathname,
    });
  }, [error]);

  return (
    <div className="relative flex flex-col items-center px-4 py-16 text-center sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[320px] w-full max-w-3xl rounded-full bg-[radial-gradient(55%_55%_at_50%_35%,rgba(201,48,28,0.08),rgba(255,197,49,0.05)_55%,transparent_78%)]"
      />

      <div className="rise-in flex h-16 w-16 items-center justify-center rounded-2xl bg-shell ring-1 ring-night/10">
        <Logo className="h-8 w-8" />
      </div>

      <span className="badge rise-in mt-5 rounded-full bg-sunset/10 px-3.5 py-1 text-xs font-bold text-sunset-deep">
        ⚠️ תקלה זמנית
      </span>
      <h1 className="display rise-in mt-4 text-2xl text-night sm:text-3xl">משהו השתבש אצלנו</h1>
      <p className="rise-in mt-4 max-w-md leading-relaxed text-night/70">
        זו תקלה בצד שלנו, לא משהו שעשיתם. <strong className="font-bold text-night">הטיול שלכם
        שמור</strong> - הוא נשמר במכשיר שלכם (ובחשבון, אם התחברתם), ותקלה בטעינת הדף לא נוגעת
        בו. אפשר לנסות שוב, ואם זה חוזר - לחזור לדף הבית ולהיכנס לטיול משם.
      </p>

      <div className="rise-in mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
        >
          לנסות שוב
        </button>
        <Link
          href="/"
          className="min-h-[44px] rounded-xl bg-shell px-6 py-3 font-bold text-night ring-1 ring-night/10 transition hover:bg-night/5"
        >
          חזרה לדף הבית
        </Link>
      </div>

      <p className="mt-8 text-xs text-night/65">
        אם פונים אלינו, הקוד הזה עוזר לנו למצוא בדיוק מה קרה:{' '}
        <code dir="ltr" className="select-all rounded bg-night/5 px-1.5 py-0.5 font-mono">
          {code}
        </code>
      </p>
      <Link
        href="/contact"
        className="mt-3 text-sm font-semibold text-night/65 underline decoration-night/20 underline-offset-4 transition hover:text-night"
      >
        לדווח לנו על התקלה ←
      </Link>
    </div>
  );
}
